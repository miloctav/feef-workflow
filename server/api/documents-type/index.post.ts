import { db } from "~~/server/database"
import { documentsType } from "~~/server/database/schema"

interface CreateDocumentTypeBody {
  title: string
  description?: string
  category: 'LEGAL' | 'FINANCIAL' | 'TECHNICAL' | 'OTHER'
  autoAsk?: boolean
}

/**
 * POST /api/documents-type
 *
 * Créer un nouveau document type
 *
 * Accessible par: FEEF uniquement
 */
export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur est authentifié et a le role FEEF
  const { user: currentUser } = await requireUserSession(event)

  if (currentUser.role !== Role.FEEF) {
    throw createError({
      statusCode: 403,
      message: 'Accès refusé. Seul le role FEEF peut créer des documents types.'
    })
  }

  const body = await readBody<CreateDocumentTypeBody>(event)

  const { title, description, category, autoAsk } = body

  // Validation des champs requis
  if (!title) {
    throw createError({
      statusCode: 400,
      message: 'Le titre est requis.'
    })
  }

  if (!category) {
    throw createError({
      statusCode: 400,
      message: 'La catégorie est requise.'
    })
  }

  // Validation de la catégorie
  const validCategories = ['LEGAL', 'FINANCIAL', 'TECHNICAL', 'OTHER']
  if (!validCategories.includes(category)) {
    throw createError({
      statusCode: 400,
      message: 'Catégorie invalide. Les valeurs acceptées sont: LEGAL, FINANCIAL, TECHNICAL, OTHER.'
    })
  }

  const [newDocumentType] = await db.insert(documentsType).values({
    title,
    description: description || null,
    category,
    autoAsk: autoAsk ?? false,
  }).returning()

  return {
    data: newDocumentType
  }
})
