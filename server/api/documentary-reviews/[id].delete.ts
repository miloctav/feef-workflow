import { db } from '~~/server/database'
import { documentaryReviews, entities, accountsToEntities } from '~~/server/database/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { Role } from '~~/shared/types'

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

  // Vérifier que l'entité existe et n'est pas soft-deleted
  const entity = await db.query.entities.findFirst({
    where: and(
      eq(entities.id, documentaryReview.entityId),
      isNull(entities.deletedAt)
    ),
  })

  if (!entity) {
    throw createError({
      statusCode: 404,
      message: 'Entité associée non trouvée',
    })
  }

  // Autorisation basée sur le rôle (mêmes règles que GET et PUT)
  if (user.role === Role.FEEF) {
    // FEEF a accès à tout
  } else if (user.role === Role.OE) {
    // OE doit être assigné à l'entité
    if (entity.oeId !== user.oeId) {
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

  // Soft delete : mettre à jour le champ deletedAt
  const [deletedReview] = await db
    .update(documentaryReviews)
    .set({ deletedAt: new Date() })
    .where(eq(documentaryReviews.id, documentId))
    .returning()

  return {
    success: true,
  }
})
