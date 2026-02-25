import { db } from '~~/server/database'
import { documentaryReviews, documentsType, entities } from '~~/server/database/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { forInsert } from '~~/server/utils/tracking'
import type { DocumentaryReviewCategoryType } from '#shared/types/enums'
import { DocumentaryReviewCategory, canAccessDocumentaryReviewCategory } from '#shared/types/enums'

export default defineEventHandler(async (event) => {
  // Authentification et vérification du rôle FEEF
  const { user } = await requireUserSession(event)

  const body = await readBody(event)

  // Validation du entityId (obligatoire dans tous les cas)
  if (!body.entityId) {
    throw createError({
      statusCode: 400,
      message: 'entityId est obligatoire',
    })
  }

  // Vérifier que l'entité existe et n'est pas soft-deleted
  const entity = await db.query.entities.findFirst({
    where: and(
      eq(entities.id, body.entityId),
      isNull(entities.deletedAt)
    ),
  })

  if (!entity) {
    throw createError({
      statusCode: 404,
      message: 'Entité non trouvée',
    })
  }

  let documentData: {
    title: string
    description?: string
    category: DocumentaryReviewCategoryType
  }

  // Cas 1: Création depuis un documentTypeId
  if (body.documentTypeId) {
    // Vérifier qu'aucun autre champ n'est fourni
    if (body.title || body.category || body.description) {
      throw createError({
        statusCode: 400,
        message: 'Lorsque documentTypeId est fourni, ne fournissez pas title, category ou description',
      })
    }

    // Récupérer le documentType
    const documentType = await db.query.documentsType.findFirst({
      where: and(
        eq(documentsType.id, body.documentTypeId),
        isNull(documentsType.deletedAt)
      ),
    })

    if (!documentType) {
      throw createError({
        statusCode: 404,
        message: 'Type de document non trouvé',
      })
    }

    // Utiliser les données du documentType
    documentData = {
      title: documentType.title,
      description: documentType.description || undefined,
      category: documentType.category,
    }
  }
  // Cas 2: Création manuelle
  else {
    // Validation des champs obligatoires
    if (!body.title || !body.category) {
      throw createError({
        statusCode: 400,
        message: 'title et category sont obligatoires lors de la création manuelle',
      })
    }

    // Validation de la catégorie
    const validCategories = Object.values(DocumentaryReviewCategory)
    if (!validCategories.includes(body.category)) {
      throw createError({
        statusCode: 400,
        message: `category doit être l'une des valeurs suivantes: ${validCategories.join(', ')}`,
      })
    }

    documentData = {
      title: body.title,
      description: body.description,
      category: body.category,
    }
  }

  // Vérifier l'accès à la catégorie selon le rôle
  if (!canAccessDocumentaryReviewCategory(user.role, documentData.category)) {
    throw createError({
      statusCode: 403,
      message: 'Vous n\'avez pas accès à cette catégorie de document',
    })
  }

  // Créer le documentary review
  const [documentaryReview] = await db.insert(documentaryReviews).values(forInsert(event, {
    entityId: body.entityId,
    documentTypeId: body.documentTypeId || null,
    title: documentData.title,
    description: documentData.description,
    category: documentData.category,
  })).returning()

  return {
    data: documentaryReview,
  }
})
