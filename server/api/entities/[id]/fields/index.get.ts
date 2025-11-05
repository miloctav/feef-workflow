/**
 * GET /api/entities/:id/fields
 *
 * Récupère tous les champs versionnés d'une entité avec leurs valeurs actuelles
 */

import { getEntityFields } from '~~/server/utils/entity-fields'

export default defineEventHandler(async (event) => {

  const { id } = getRouterParams(event)
  const entityId = Number(id)

  if (isNaN(entityId)) {
    throw createError({
      statusCode: 400,
      message: 'ID d\'entité invalide',
    })
  }

  const {user } = await requireUserSession(event)

  await requireEntityAccess({
      user,
      entityId: entityId,
      accessType: AccessType.READ,
      errorMessage: 'Vous n\'avez pas accès à cette entité'
  })

  // Récupérer tous les champs avec leurs valeurs actuelles
  const fieldsMap = await getEntityFields(entityId)

  // Convertir la Map en array pour la réponse JSON
  const fields = Array.from(fieldsMap.values()).map(field => ({
    key: field.key,
    label: field.label,
    type: field.type,
    value: field.value,
    unit: field.unit,
    lastUpdatedAt: field.lastUpdatedAt,
    lastUpdatedBy: field.lastUpdatedBy,
  }))

  return {
    data: fields,
  }
})
