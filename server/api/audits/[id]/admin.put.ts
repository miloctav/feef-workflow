import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { audits } from '~~/server/database/schema'
import { forUpdate } from '~~/server/utils/tracking'
import { recordEvent } from '~~/server/services/events'
import { Role } from '#shared/types/roles'
import {
  loadAuditForAdmin,
  planAuditAdminChange,
  type AuditAdminBody,
} from '~~/server/utils/audit-admin-plan'

/**
 * PUT /api/audits/:id/admin
 *
 * Modification administrative d'un audit par la FEEF.
 *
 * Écriture brute : contrairement au PUT métier, aucun automatisme n'est rejoué
 * (pas de state machine, pas de checkAutoTransition, pas de recalcul du plan
 * d'action, pas de complétion automatique des actions). Les valeurs saisies
 * sont écrites telles quelles.
 *
 * Seule exception : si le statut change, les actions en cours de l'audit sont
 * annulées puis celles du nouveau statut sont créées, afin que l'audit ne reste
 * pas avec des tâches incohérentes.
 *
 * Autorisations : FEEF uniquement.
 */
export default defineEventHandler(async (event) => {
  const { user: currentUser } = await requireUserSession(event)

  if (currentUser.role !== Role.FEEF) {
    throw createError({
      statusCode: 403,
      message: 'Accès refusé. Seul le rôle FEEF peut effectuer des opérations administratives sur les audits.',
    })
  }

  const idParam = getRouterParam(event, 'id')
  const auditId = parseInt(idParam ?? '', 10)
  if (Number.isNaN(auditId)) {
    throw createError({ statusCode: 400, message: 'ID de l\'audit invalide' })
  }

  const audit = await loadAuditForAdmin(auditId)
  if (!audit) {
    throw createError({ statusCode: 404, message: 'Audit non trouvé' })
  }

  const body = await readBody<AuditAdminBody>(event)
  const plan = await planAuditAdminChange(audit, body)

  if (plan.blocked) {
    throw createError({ statusCode: 400, message: plan.blocked.reason })
  }

  await db
    .update(audits)
    .set(forUpdate(event, plan.set))
    .where(eq(audits.id, auditId))

  // Resynchronisation des actions uniquement si le statut a été forcé :
  // les tâches de l'ancien statut n'ont plus de sens, celles du nouveau doivent exister.
  if (plan.statusChange) {
    const { cancelActionsForAudit, createActionsForAuditStatus } = await import('~~/server/services/actions')

    await cancelActionsForAudit(auditId, event)

    const updatedAudit = await db.query.audits.findFirst({
      where: eq(audits.id, auditId),
    })
    if (updatedAudit) {
      await createActionsForAuditStatus(updatedAudit, plan.statusChange.to, event)
    }

    await recordEvent(event, {
      type: 'AUDIT_STATUS_CHANGED',
      auditId,
      entityId: audit.entityId,
      metadata: {
        from: plan.statusChange.from,
        to: plan.statusChange.to,
        forcedByAdmin: true,
      },
    })
  }

  const finalAudit = await db.query.audits.findFirst({
    where: eq(audits.id, auditId),
    with: {
      entity: true,
      oe: true,
      auditor: true,
    },
  })

  return {
    data: {
      success: true,
      audit: finalAudit,
      changes: plan.changes,
      warnings: plan.warnings,
    },
  }
})
