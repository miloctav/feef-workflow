import { db } from '~~/server/database'
import { documentaryReviews } from '~~/server/database/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { requireEntityAccess, AccessType } from '~~/server/utils/authorization'

export default defineEventHandler(async (event) => {
  // Authentification
  const { user } = await requireUserSession(event)

  // Récupérer l'ID depuis les params
  const id = getRouterParam(event, 'id')

  if (!id || isNaN(Number(id))) {
    throw createError({
      statusCode: 400,
      message: 'ID invalide',
    })
  }

  const documentaryReviewId = Number(id)

  // Récupérer le documentary review avec ses relations
  const documentaryReview = await db.query.documentaryReviews.findFirst({
    where: and(
      eq(documentaryReviews.id, documentaryReviewId),
      isNull(documentaryReviews.deletedAt)
    ),
    with: {
      entity: true,
      documentType: true,
      createdByAccount: {
        columns: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
        },
      },
      documentVersions: {
        orderBy: (documentVersions, { desc }) => [desc(documentVersions.uploadAt)],
        with: {
          uploadByAccount: {
            columns: {
              id: true,
              firstname: true,
              lastname: true,
            },
          },
        },
      },
    },
  })

  if (!documentaryReview) {
    throw createError({
      statusCode: 404,
      message: 'Document non trouvé',
    })
  }

  // Vérifier l'accès à l'entité du document
  await requireEntityAccess({
    user,
    entityId: documentaryReview.entityId,
    accessType: AccessType.READ,
    errorMessage: 'Vous n\'avez pas accès à ce document'
  })

  return {
    data: documentaryReview,
  }
})
