import { db } from '~~/server/database'
import { documentaryReviews } from '~~/server/database/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { forDelete } from '~~/server/utils/tracking'
import { requireEntityAccess, AccessType } from '~~/server/utils/authorization'

export default defineEventHandler(async (event) => {
  // Authentification
  const { user } = await requireUserSession(event)

  // Récupérer l'id du documentary review depuis les paramètres de route
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'ID du document est obligatoire',
    })
  }

  const documentId = Number(id)

  // Vérifier que le documentary review existe et n'est pas déjà soft-deleted
  const documentaryReview = await db.query.documentaryReviews.findFirst({
    where: and(
      eq(documentaryReviews.id, documentId),
      isNull(documentaryReviews.deletedAt)
    ),
  })

  if (!documentaryReview) {
    throw createError({
      statusCode: 404,
      message: 'Document de revue documentaire non trouvé',
    })
  }

  // Vérifier l'accès à l'entité du document
  await requireEntityAccess({
    userId: user.id,
    userRole: user.role,
    entityId: documentaryReview.entityId,
    userOeId: user.oeId,
    accessType: AccessType.WRITE,
    errorMessage: 'Vous n\'avez pas accès à ce document'
  })

  // Soft delete : mettre à jour le champ deletedAt avec tracking
  const [deletedReview] = await db
    .update(documentaryReviews)
    .set(forDelete(event))
    .where(eq(documentaryReviews.id, documentId))
    .returning()

  return {
    success: true,
  }
})
