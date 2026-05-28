import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { entities, audits } from '~~/server/database/schema'
import { forUpdate } from '~~/server/utils/tracking'
import { loadEntityForAdmin } from '~~/server/utils/entity-admin-validation'
import { planAdminChange, type AdminChangeBody } from '~~/server/utils/entity-admin-plan'

export default defineEventHandler(async (event) => {
  const { user: currentUser } = await requireUserSession(event)

  if (currentUser.role !== 'FEEF') {
    throw createError({
      statusCode: 403,
      message: 'Accès refusé. Seul le rôle FEEF peut effectuer des opérations administratives sur les entités.',
    })
  }

  const idParam = getRouterParam(event, 'id')
  if (!idParam) {
    throw createError({ statusCode: 400, message: 'ID de l\'entité requis' })
  }
  const entityId = parseInt(idParam, 10)
  if (Number.isNaN(entityId)) {
    throw createError({ statusCode: 400, message: 'ID de l\'entité invalide' })
  }

  const entity = await loadEntityForAdmin(entityId)
  if (!entity) {
    throw createError({ statusCode: 404, message: 'Entité non trouvée' })
  }

  const body = await readBody<AdminChangeBody>(event)
  const plan = await planAdminChange(entity, body)

  if (plan.blocked) {
    throw createError({ statusCode: 400, message: plan.blocked.reason })
  }

  // Liste des audits dont le statut a changé : on déclenche la création d'actions après le commit
  const auditsWithStatusChange: number[] = []

  await db.transaction(async (tx) => {
    for (const op of plan.operations) {
      await tx
        .update(entities)
        .set(forUpdate(event, op.set))
        .where(eq(entities.id, op.entityId))
    }
    for (const op of plan.auditOperations) {
      await tx
        .update(audits)
        .set(forUpdate(event, op.set))
        .where(eq(audits.id, op.auditId))
      if (op.statusChanged) {
        auditsWithStatusChange.push(op.auditId)
      }
    }
  })

  // Hors transaction : création/complétion d'actions selon les nouveaux statuts.
  // Cette logique reproduit le comportement de assign-oe.post.ts.
  if (plan.triggerActionsRefresh && plan.auditOperations.length > 0) {
    const { createActionsForAuditStatus, checkAndCompleteAllPendingActions } = await import('~~/server/services/actions')
    for (const op of plan.auditOperations) {
      const updatedAudit = await db.query.audits.findFirst({
        where: eq(audits.id, op.auditId),
      })
      if (!updatedAudit) continue
      if (auditsWithStatusChange.includes(op.auditId)) {
        await createActionsForAuditStatus(updatedAudit, updatedAudit.status, event)
      }
      await checkAndCompleteAllPendingActions(updatedAudit, currentUser.id, event)
    }
  }

  return {
    data: {
      success: true,
      changes: plan.changes,
      warnings: plan.warnings,
    },
  }
})
