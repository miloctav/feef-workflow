import { db } from '~~/server/database'
import { documentaryReviews } from '~~/server/database/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { forUpdate } from '~~/server/utils/tracking'
import { requireEntityAccess } from '~~/server/utils/authorization'

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

  // Vérifier l'accès à l'entité du document
  await requireEntityAccess(
    user.id,
    user.role,
    documentaryReview.entityId,
    user.oeId,
    'Vous n\'avez pas accès à ce document'
  )

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
  } = {}

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

  // Vérifier qu'il y a au moins un champ à mettre à jour
  if (Object.keys(updateData).length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Aucun champ à mettre à jour',
    })
  }

  // Mettre à jour le documentary review
  const [updatedReview] = await db
    .update(documentaryReviews)
    .set(forUpdate(event, updateData))
    .where(eq(documentaryReviews.id, documentId))
    .returning()

  return {
    data: updatedReview,
  }
})
