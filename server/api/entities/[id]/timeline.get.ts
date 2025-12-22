import { db } from '~~/server/database'
import { entities } from '~~/server/database/schema'
import { eq, isNull } from 'drizzle-orm'
import { Role } from '#shared/types/roles'
import { getEntityTimeline } from '~~/server/services/events'

/**
 * GET /api/entities/:id/timeline
 *
 * Récupère la timeline complète d'une entité (tous les événements liés).
 * Inclut les événements de l'entité elle-même, de ses audits et de ses contrats.
 *
 * Query params:
 * - categories: string[] - Filtrer par catégories (ex: AUDIT,ENTITY,CONTRACT)
 * - limit: number - Limiter le nombre de résultats (défaut: illimité)
 *
 * Autorisations: FEEF, OE, ENTITY (membres de l'entité)
 */
export default defineEventHandler(async (event) => {
  // Authentification requise
  const { user: currentUser } = await requireUserSession(event)

  // Récupérer l'ID de l'entité
  const entityId = getRouterParam(event, 'id')

  if (!entityId) {
    throw createError({
      statusCode: 400,
      message: 'ID de l\'entité manquant',
    })
  }

  const entityIdInt = parseInt(entityId)

  if (isNaN(entityIdInt)) {
    throw createError({
      statusCode: 400,
      message: 'ID de l\'entité invalide',
    })
  }

  // Vérifier que l'entité existe
  const entity = await db.query.entities.findFirst({
    where: (entities, { eq, isNull, and }) => and(
      eq(entities.id, entityIdInt),
      isNull(entities.deletedAt)
    ),
  })

  if (!entity) {
    throw createError({
      statusCode: 404,
      message: 'Entité non trouvée',
    })
  }

  // Vérifier les autorisations selon le rôle
  if (currentUser.role === Role.FEEF) {
    // FEEF a accès à tout
  } else if (currentUser.role === Role.OE) {
    // OE peut voir les entités qu'ils gèrent (via oeId sur entity ou audit)
    const hasAccess = entity.oeId === currentUser.oeId
    if (!hasAccess) {
      throw createError({
        statusCode: 403,
        message: 'Vous n\'avez pas accès à cette entité',
      })
    }
  } else if (currentUser.role === Role.ENTITY) {
    // Vérifier que l'utilisateur est membre de cette entité
    const { accountsToEntities } = await import('~~/server/database/schema')
    const accountToEntity = await db.query.accountsToEntities.findFirst({
      where: (accountsToEntities, { eq, and }) => and(
        eq(accountsToEntities.accountId, currentUser.id),
        eq(accountsToEntities.entityId, entityIdInt)
      ),
    })

    if (!accountToEntity) {
      throw createError({
        statusCode: 403,
        message: 'Vous n\'êtes pas membre de cette entité',
      })
    }
  } else {
    throw createError({
      statusCode: 403,
      message: 'Vous n\'avez pas accès à cette ressource',
    })
  }

  // Récupérer les paramètres de query
  const query = getQuery(event)
  const categories = query.categories ? String(query.categories).split(',') : undefined
  const limit = query.limit ? parseInt(String(query.limit)) : undefined

  // Récupérer la timeline
  const timeline = await getEntityTimeline(entityIdInt, { categories, limit })

  return {
    data: timeline,
  }
})
