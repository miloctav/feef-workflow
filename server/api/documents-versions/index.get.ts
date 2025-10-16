import { db } from '~~/server/database'
import { documentaryReviews, documentVersions, accountsToEntities } from '~~/server/database/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'

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

  // Vérifier que l'entité n'est pas soft-deleted
  if (documentaryReview.entity.deletedAt) {
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
    if (documentaryReview.entity.oeId !== user.oeId) {
      throw createError({
        statusCode: 403,
        message: 'Vous n\'avez pas accès aux versions de ce document',
      })
    }
  } else if (user.role === Role.ENTITY || user.role === Role.AUDITOR) {
    // Utilisateur doit être lié à l'entité via accountsToEntities
    const accountToEntity = await db.query.accountsToEntities.findFirst({
      where: and(
        eq(accountsToEntities.accountId, user.id),
        eq(accountsToEntities.entityId, documentaryReview.entityId)
      ),
    })

    if (!accountToEntity) {
      throw createError({
        statusCode: 403,
        message: 'Vous n\'avez pas accès aux versions de ce document',
      })
    }
  } else {
    throw createError({
      statusCode: 403,
      message: 'Rôle non autorisé',
    })
  }

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
