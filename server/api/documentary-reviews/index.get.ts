import { db } from '~~/server/database'
import { documentaryReviews, entities, accountsToEntities } from '~~/server/database/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { Role } from '~~/shared/types'

export default defineEventHandler(async (event) => {
  // Authentification
  const { user } = await requireUserSession(event)

  // Récupérer entityId depuis query params
  const query = getQuery(event)
  const entityId = query.entityId ? Number(query.entityId) : null

  if (!entityId) {
    throw createError({
      statusCode: 400,
      message: 'entityId est obligatoire',
    })
  }

  // Vérifier que l'entité existe et n'est pas soft-deleted
  const entity = await db.query.entities.findFirst({
    where: and(
      eq(entities.id, entityId),
      isNull(entities.deletedAt)
    ),
  })

  if (!entity) {
    throw createError({
      statusCode: 404,
      message: 'Entité non trouvée',
    })
  }

  // Autorisation basée sur le rôle
  if (user.role === Role.FEEF) {
    // FEEF a accès à tout
  } else if (user.role === Role.OE) {
    // OE doit être assigné à l'entité
    if (entity.oeId !== user.oeId) {
      throw createError({
        statusCode: 403,
        message: 'Vous n\'avez pas accès aux documents de cette entité',
      })
    }
  } else if (user.role === Role.ENTITY || user.role === Role.AUDITOR) {
    // Utilisateur doit être lié à l'entité via accountsToEntities
    const accountToEntity = await db.query.accountsToEntities.findFirst({
      where: and(
        eq(accountsToEntities.accountId, user.id),
        eq(accountsToEntities.entityId, entityId)
      ),
    })

    if (!accountToEntity) {
      throw createError({
        statusCode: 403,
        message: 'Vous n\'avez pas accès aux documents de cette entité',
      })
    }
  } else {
    throw createError({
      statusCode: 403,
      message: 'Rôle non autorisé',
    })
  }

  // Récupérer les documentary reviews de l'entité (excluant les soft-deleted)
  const reviews = await db.query.documentaryReviews.findMany({
    where: and(
      eq(documentaryReviews.entityId, entityId),
      isNull(documentaryReviews.deletedAt)
    ),
  })

  return {
    data: reviews,
  }
})
