import { db } from '~~/server/database'
import { contracts } from '~~/server/database/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { forUpdate } from '~~/server/utils/tracking'

export default defineEventHandler(async (event) => {
  // Authentification
  const { user } = await requireUserSession(event)

  // Récupérer l'id du contrat depuis les paramètres de route
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'ID du contrat est obligatoire',
    })
  }

  const contractId = Number(id)

  // Vérifier que le contrat existe et n'est pas soft-deleted
  const contract = await db.query.contracts.findFirst({
    where: and(
      eq(contracts.id, contractId),
      isNull(contracts.deletedAt)
    ),
  })

  if (!contract) {
    throw createError({
      statusCode: 404,
      message: 'Contrat non trouvé',
    })
  }

  // Autorisation stricte : uniquement le créateur peut modifier
  if (contract.createdBy !== user.id) {
    throw createError({
      statusCode: 403,
      message: 'Seul le créateur du contrat peut le modifier',
    })
  }

  // Récupérer le body
  const body = await readBody(event)

  // Vérifier qu'on ne tente pas de modifier des champs non modifiables
  if (body.entityId !== undefined || body.oeId !== undefined ||
    body.createdBy !== undefined || body.createdAt !== undefined) {
    throw createError({
      statusCode: 400,
      message: 'Les champs entityId, oeId, createdBy et createdAt ne peuvent pas être modifiés',
    })
  }

  // Préparer les données de mise à jour
  const updateData: {
    title?: string
    description?: string | null
    validityEndDate?: string | null
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

  // Gérer les champs de validité
  // Vérifier qu'un seul type de validité est fourni
  const validityFieldsCount = [body.validityMonths, body.validityYears, body.validityEndDate].filter(v => v !== undefined).length
  if (validityFieldsCount > 1) {
    throw createError({
      statusCode: 400,
      message: 'Vous ne pouvez spécifier qu\'un seul type de validité (mois, années, ou date directe)',
    })
  }

  if (body.validityMonths !== undefined) {
    if (body.validityMonths === null) {
      // Supprimer la validité
      updateData.validityEndDate = null
    } else {
      // Calculer à partir de la date de création du contrat
      const createdDate = new Date(contract.createdAt)
      createdDate.setMonth(createdDate.getMonth() + body.validityMonths)
      updateData.validityEndDate = createdDate.toISOString().split('T')[0]
    }
  } else if (body.validityYears !== undefined) {
    if (body.validityYears === null) {
      // Supprimer la validité
      updateData.validityEndDate = null
    } else {
      // Calculer à partir de la date de création du contrat
      const createdDate = new Date(contract.createdAt)
      createdDate.setFullYear(createdDate.getFullYear() + body.validityYears)
      updateData.validityEndDate = createdDate.toISOString().split('T')[0]
    }
  } else if (body.validityEndDate !== undefined) {
    // Date directe ou null pour supprimer
    updateData.validityEndDate = body.validityEndDate
  }

  // Vérifier qu'il y a au moins un champ à mettre à jour
  if (Object.keys(updateData).length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Aucun champ à mettre à jour',
    })
  }

  // Mettre à jour le contrat
  const [updatedContract] = await db
    .update(contracts)
    .set(forUpdate(event, updateData))
    .where(eq(contracts.id, contractId))
    .returning()

  return {
    data: updatedContract,
  }
})
