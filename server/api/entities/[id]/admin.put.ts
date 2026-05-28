import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { entities } from '~~/server/database/schema'
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

  await db.transaction(async (tx) => {
    for (const op of plan.operations) {
      await tx
        .update(entities)
        .set(forUpdate(event, op.set))
        .where(eq(entities.id, op.entityId))
    }
  })

  return {
    data: {
      success: true,
      changes: plan.changes,
      warnings: plan.warnings,
    },
  }
})
