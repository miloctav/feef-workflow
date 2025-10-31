import { db } from '~~/server/database'
import { documentaryReviews, documentVersions } from '~~/server/database/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { requireEntityAccess, AccessType } from '~~/server/utils/authorization'

export default defineEventHandler(async (event) => {
  // Authentification
  const { user } = await requireUserSession(event)

  // Récupérer documentaryReviewId depuis query params
  const query = getQuery(event)
  const documentaryReviewId = query.documentaryReviewId ? Number(query.documentaryReviewId) : null

  if (!documentaryReviewId || isNaN(documentaryReviewId)) {
    throw createError({
      statusCode: 400,
      message: 'documentaryReviewId est obligatoire',
    })
  }

  // Récupérer le documentary review avec l'entité
  const documentaryReview = await db.query.documentaryReviews.findFirst({
    where: and(
      eq(documentaryReviews.id, documentaryReviewId),
      isNull(documentaryReviews.deletedAt)
    ),
    with: {
      entity: true,
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
    errorMessage: 'Vous n\'avez pas accès aux versions de ce document'
  })

  // Récupérer les versions triées par date (plus récente en premier)
  const versions = await db.query.documentVersions.findMany({
    where: eq(documentVersions.documentaryReviewId, documentaryReviewId),
    orderBy: [desc(documentVersions.uploadAt)],
    with: {
      uploadByAccount: {
        columns: {
          id: true,
          firstname: true,
          lastname: true,
        },
      },
    },
  })

  return {
    data: versions,
  }
})
