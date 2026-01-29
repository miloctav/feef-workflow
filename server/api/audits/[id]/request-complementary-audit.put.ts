import { db } from '~~/server/database'
import { audits } from '~~/server/database/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { Role } from '#shared/types/roles'
import { recordEvent, getLatestEvent } from '~~/server/services/events'
import { AuditStatus } from '#shared/types/enums'

/**
 * PUT /api/audits/[id]/request-complementary-audit
 *
 * Demande un audit complémentaire (phase 2) pour vérifier les corrections.
 * Uniquement possible si c'est le premier audit complémentaire.
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
      message: `La demande d'audit complémentaire n'est possible que dans le statut 'En attente de validation du plan'. Statut actuel: ${audit.status}`,
    })
  }

  // Vérifier qu'aucun audit complémentaire n'a déjà été fait
  if (audit.hasComplementaryAudit === true) {
    throw createError({
      statusCode: 400,
      message: 'Un audit complémentaire a déjà été effectué pour cet audit. Seul un audit complémentaire est autorisé.',
    })
  }

  // Autorisation: Seuls FEEF et OE (celui assigné à l'audit) peuvent demander un audit complémentaire
  if (user.role === Role.FEEF) {
    // FEEF a accès à tout
  }
  else if (user.role === Role.OE) {
    // Vérifier que c'est l'OE assigné à l'audit
    if (!audit.oeId || audit.oeId !== user.oeId) {
      throw createError({
        statusCode: 403,
        message: 'Seul l\'OE assigné à cet audit peut demander un audit complémentaire',
      })
    }
  }
  else {
    throw createError({
      statusCode: 403,
      message: 'Vous n\'avez pas la permission de demander un audit complémentaire',
    })
  }

  // Vérifier qu'il n'y a pas déjà une demande d'audit complémentaire
  const complementaryRequestedEvent = await getLatestEvent('AUDIT_COMPLEMENTARY_REQUESTED', { auditId: audit.id })
  if (complementaryRequestedEvent) {
    throw createError({
      statusCode: 400,
      message: 'Un audit complémentaire a déjà été demandé',
    })
  }

  // Enregistrer l'événement de demande d'audit complémentaire AVANT la transition
  await recordEvent(event, {
    type: 'AUDIT_COMPLEMENTARY_REQUESTED',
    auditId: auditId,
    entityId: audit.entityId,
    metadata: {
      previousStatus: audit.status,
      newStatus: AuditStatus.PENDING_COMPLEMENTARY_AUDIT,
      timestamp: new Date(),
    },
  })

  // Mettre à jour le statut de l'audit et marquer l'audit complémentaire comme démarré
  await db
    .update(audits)
    .set({
      status: AuditStatus.PENDING_COMPLEMENTARY_AUDIT,
      hasComplementaryAudit: true,
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

  // Créer les actions pour le nouveau statut
  const { createActionsForAuditStatus, checkAndCompleteAllPendingActions } = await import('~~/server/services/actions')
  await createActionsForAuditStatus(auditWithRelations, AuditStatus.PENDING_COMPLEMENTARY_AUDIT, event)

  // Check and complete all pending actions based on audit state
  await checkAndCompleteAllPendingActions(auditWithRelations, user.id, event)

  return {
    data: auditWithRelations,
  }
})
