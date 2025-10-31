import { db } from '~~/server/database'
import { documentaryReviews } from '~~/server/database/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { requireEntityAccess, AccessType } from '~~/server/utils/authorization'

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

  // Vérifier l'accès à l'entité
  await requireEntityAccess({
    userId: user.id,
    userRole: user.role,
    entityId: entityId,
    userOeId: user.oeId,
    accessType: AccessType.READ,
    errorMessage: 'Vous n\'avez pas accès aux documents de cette entité'
  })

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
