import { db } from '~~/server/database'
import { documentaryReviews, entities, accountsToEntities } from '~~/server/database/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'

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
        message: 'Vous n\'avez pas accès à ce document',
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
        message: 'Vous n\'avez pas accès à ce document',
      })
    }
  } else {
    throw createError({
      statusCode: 403,
      message: 'Rôle non autorisé',
    })
  }

  return {
    data: documentaryReview,
  }
})
