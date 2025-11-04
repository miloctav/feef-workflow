/**
 * GET /api/entities/:id/fields/:key/history
 *
 * Récupère l'historique complet d'un champ versionné
 */

import { getEntityFieldHistory } from '~~/server/utils/entity-fields'
import { isValidFieldKey, type EntityFieldKey } from '~~/server/database/entity-fields-config'

export default defineEventHandler(async (event) => {
  const { id, key } = getRouterParams(event)
  const entityId = Number(id)

  if (isNaN(entityId)) {
    throw createError({
      statusCode: 400,
      message: 'ID d\'entité invalide',
    })
  }

  if (!isValidFieldKey(key)) {
    throw createError({
      statusCode: 400,
      message: `Clé de champ invalide: ${key}`,
    })
  }

  try {
    // Récupérer l'historique du champ
    const history = await getEntityFieldHistory(entityId, key as EntityFieldKey)

    return {
      data: history,
    }
  } catch (error) {
    throw createError({
      statusCode: 400,
      message: error instanceof Error ? error.message : 'Erreur lors de la récupération de l\'historique',
    })
  }
})
