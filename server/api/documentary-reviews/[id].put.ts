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

  // Vérifier que le documentary review existe et n'est pas soft-deleted
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

  // Autorisation basée sur le rôle (mêmes règles que GET)
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

  // Récupérer le body
  const body = await readBody(event)

  // Vérifier qu'on ne tente pas de modifier des champs non modifiables
  if (body.entityId !== undefined || body.documentTypeId !== undefined ||
      body.createdBy !== undefined || body.createdAt !== undefined) {
    throw createError({
      statusCode: 400,
      message: 'Les champs entityId, documentTypeId, createdBy et createdAt ne peuvent pas être modifiés',
    })
  }

  // Préparer les données de mise à jour
  const updateData: {
    title?: string
    description?: string | null
    category?: 'LEGAL' | 'FINANCIAL' | 'TECHNICAL' | 'OTHER'
    updatedAt: Date
  } = {
    updatedAt: new Date(),
  }

  // Validation et ajout du title si fourni
  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim() === '') {
      throw createError({
        statusCode: 400,
        message: 'Le titre ne peut pas être vide',
      })
    }
    updateData.title = body.title
  }

  // Ajout de la description si fournie
  if (body.description !== undefined) {
    updateData.description = body.description
  }

  // Validation et ajout de la category si fournie
  if (body.category !== undefined) {
    const validCategories = ['LEGAL', 'FINANCIAL', 'TECHNICAL', 'OTHER']
    if (!validCategories.includes(body.category)) {
      throw createError({
        statusCode: 400,
        message: `category doit être l'une des valeurs suivantes: ${validCategories.join(', ')}`,
      })
    }
    updateData.category = body.category
  }

  // Vérifier qu'il y a au moins un champ à mettre à jour (en plus de updatedAt)
  if (Object.keys(updateData).length === 1) {
    throw createError({
      statusCode: 400,
      message: 'Aucun champ à mettre à jour',
    })
  }

  // Mettre à jour le documentary review
  const [updatedReview] = await db
    .update(documentaryReviews)
    .set(updateData)
    .where(eq(documentaryReviews.id, documentId))
    .returning()

  return {
    data: updatedReview,
  }
})
