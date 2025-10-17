import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { documentsType } from '~~/server/database/schema'
import { forUpdate } from '~~/server/utils/tracking'

interface UpdateDocumentTypeBody {
  title?: string
  description?: string
  category?: 'LEGAL' | 'FINANCIAL' | 'TECHNICAL' | 'OTHER'
  autoAsk?: boolean
}

/**
 * PUT /api/documents-type/[id]
 *
 * Modifier un document type existant
 *
 * Accessible par: FEEF uniquement
 */
export default defineEventHandler(async (event) => {
  console.log('[DOCUMENTS-TYPE API] Modification d\'un document type')

  // Vérifier que l'utilisateur connecté est FEEF
  const { user: currentUser } = await requireUserSession(event)

  if (currentUser.role !== Role.FEEF) {
    throw createError({
      statusCode: 403,
      message: 'Seul un administrateur FEEF peut modifier des documents types',
    })
  }

  // Récupérer l'ID du document type à modifier
  const documentTypeId = getRouterParam(event, 'id')

  if (!documentTypeId) {
    throw createError({
      statusCode: 400,
      message: 'ID du document type manquant',
    })
  }

  const documentTypeIdInt = parseInt(documentTypeId)

  if (isNaN(documentTypeIdInt)) {
    throw createError({
      statusCode: 400,
      message: 'ID du document type invalide',
    })
  }

  // Vérifier que le document type existe
  const existingDocumentType = await db.query.documentsType.findFirst({
    where: eq(documentsType.id, documentTypeIdInt),
  })

  if (!existingDocumentType) {
    throw createError({
      statusCode: 404,
      message: 'Document type non trouvé',
    })
  }

  // Récupérer les données du corps de la requête
  const body = await readBody<UpdateDocumentTypeBody>(event)

  const { title, description, category, autoAsk } = body

  // Vérifier qu'au moins un champ est fourni
  if (title === undefined && description === undefined && category === undefined && autoAsk === undefined) {
    throw createError({
      statusCode: 400,
      message: 'Au moins un champ doit être fourni pour la modification',
    })
  }

  // Validation de la catégorie si fournie
  if (category !== undefined) {
    const validCategories = ['LEGAL', 'FINANCIAL', 'TECHNICAL', 'OTHER']
    if (!validCategories.includes(category)) {
      throw createError({
        statusCode: 400,
        message: 'Catégorie invalide. Les valeurs acceptées sont: LEGAL, FINANCIAL, TECHNICAL, OTHER.',
      })
    }
  }

  console.log('[DOCUMENTS-TYPE API] Mise à jour du document type', documentTypeIdInt)

  // Préparer les données à mettre à jour
  const updateData: Partial<UpdateDocumentTypeBody> = {}

  if (title !== undefined) updateData.title = title
  if (description !== undefined) updateData.description = description
  if (category !== undefined) updateData.category = category
  if (autoAsk !== undefined) updateData.autoAsk = autoAsk

  // Mettre à jour le document type
  const [updatedDocumentType] = await db
    .update(documentsType)
    .set(forUpdate(event, updateData))
    .where(eq(documentsType.id, documentTypeIdInt))
    .returning({
      id: documentsType.id,
      title: documentsType.title,
      description: documentsType.description,
      category: documentsType.category,
      autoAsk: documentsType.autoAsk,
      createdAt: documentsType.createdAt,
    })

  console.log('[DOCUMENTS-TYPE API] Document type mis à jour avec ID', updatedDocumentType.id)

  // Retourner le document type mis à jour
  return {
    data: updatedDocumentType,
  }
})
