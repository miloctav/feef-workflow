import { loadEntityForAdmin } from '~~/server/utils/entity-admin-validation'
import { planAdminChange, type AdminChangeBody } from '~~/server/utils/entity-admin-plan'

export default defineEventHandler(async (event) => {
  const { user: currentUser } = await requireUserSession(event)

  if (currentUser.role !== 'FEEF') {
    throw createError({
      statusCode: 403,
      message: 'Accès refusé.',
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

  return {
    data: {
      changes: plan.changes,
      warnings: plan.warnings,
      blocked: plan.blocked,
    },
  }
})
