import { db } from '~~/server/database'
import { audits } from '~~/server/database/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { Role } from '#shared/types/roles'
import { recordEvent, getLatestEvent } from '~~/server/services/events'
import { AuditStatus } from '#shared/types/enums'

/**
 * PUT /api/audits/[id]/refuse-corrective-plan
 *
 * Refuse définitivement le plan d'action correctif.
 * L'audit se termine avec le statut REFUSED_PLAN.
 *
 * Body: { reason: string } - Motif du refus (obligatoire)
 *
 * Accessible par: FEEF, OE (celui assigné à l'audit)
 */
export default defineEventHandler(async (event) => {
  // Authentification
  const { user } = await requireUserSession(event)

  // Récupérer l'ID de l'audit depuis l'URL
  const auditId = Number(event.context.params?.id)

  if (isNaN(auditId)) {
    throw createError({
      statusCode: 400,
      message: 'ID d\'audit invalide',
    })
  }

  // Récupérer le body
  const body = await readBody(event)

  if (!body.reason || typeof body.reason !== 'string' || body.reason.trim() === '') {
    throw createError({
      statusCode: 400,
      message: 'Le motif de refus est obligatoire',
    })
  }

  // Récupérer l'audit avec ses relations
  const audit = await db.query.audits.findFirst({
    where: and(
      eq(audits.id, auditId),
      isNull(audits.deletedAt)
    ),
    with: {
      entity: true,
      oe: true,
    },
  })

  if (!audit) {
    throw createError({
      statusCode: 404,
      message: 'Audit non trouvé',
    })
  }

  if (audit.entity.deletedAt) {
    throw createError({
      statusCode: 404,
      message: 'Entité non trouvée',
    })
  }

  // Vérifier le statut actuel
  if (audit.status !== AuditStatus.PENDING_CORRECTIVE_PLAN_VALIDATION) {
    throw createError({
      statusCode: 400,
      message: `Le refus du plan correctif n'est possible que dans le statut 'En attente de validation du plan'. Statut actuel: ${audit.status}`,
    })
  }

  // Autorisation: Seuls FEEF et OE (celui assigné à l'audit) peuvent refuser
  if (user.role === Role.FEEF) {
    // FEEF a accès à tout
  }
  else if (user.role === Role.OE) {
    // Vérifier que c'est l'OE assigné à l'audit
    if (!audit.oeId || audit.oeId !== user.oeId) {
      throw createError({
        statusCode: 403,
        message: 'Seul l\'OE assigné à cet audit peut refuser le plan correctif',
      })
    }
  }
  else {
    throw createError({
      statusCode: 403,
      message: 'Vous n\'avez pas la permission de refuser le plan correctif',
    })
  }

  // Vérifier que le plan n'est pas déjà refusé
  const refusedEvent = await getLatestEvent('AUDIT_CORRECTIVE_PLAN_REFUSED', { auditId: audit.id })
  if (refusedEvent) {
    throw createError({
      statusCode: 400,
      message: 'Le plan d\'action correctif a déjà été refusé',
    })
  }

  // Enregistrer l'événement de refus AVANT la transition
  await recordEvent(event, {
    type: 'AUDIT_CORRECTIVE_PLAN_REFUSED',
    auditId: auditId,
    entityId: audit.entityId,
    metadata: {
      reason: body.reason.trim(),
      previousStatus: audit.status,
      newStatus: AuditStatus.REFUSED_PLAN,
      timestamp: new Date(),
    },
  })

  // Mettre à jour le statut de l'audit et enregistrer le motif
  await db
    .update(audits)
    .set({
      status: AuditStatus.REFUSED_PLAN,
      planRefusalReason: body.reason.trim(),
      updatedBy: user.id,
      updatedAt: new Date(),
    })
    .where(eq(audits.id, auditId))

  // Récupérer l'audit mis à jour avec toutes ses relations
  const auditWithRelations = await db.query.audits.findFirst({
    where: eq(audits.id, auditId),
    with: {
      entity: true,
      oe: true,
      auditor: {
        columns: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
        },
      },
    },
  })

  if (!auditWithRelations) {
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la récupération de l\'audit mis à jour',
    })
  }

  // Annuler les actions en cours pour cet audit (état terminal)
  const { cancelActionsForAudit } = await import('~~/server/services/actions')
  await cancelActionsForAudit(auditId, event)

  return {
    data: auditWithRelations,
  }
})
