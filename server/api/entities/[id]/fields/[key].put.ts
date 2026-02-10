/**
 * PUT /api/entities/:id/fields/:key
 *
 * Met à jour la valeur d'un champ versionné (crée une nouvelle version)
 */

import { setEntityField, type EntityFieldValue } from '~~/server/utils/entity-fields'
import { isValidFieldKey, getFieldDefinition, type EntityFieldKey } from '~~/server/database/entity-fields-config'
import { requireVersionedFieldsEditAccess } from '~~/server/utils/audit-lock'

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

  // Récupérer la valeur depuis le body
  const body = await readBody(event)
  const { value } = body

  const {user } = await requireUserSession(event)

  await requireEntityAccess({
      user,
      entityId: entityId,
      accessType: AccessType.WRITE,
      errorMessage: 'Vous n\'avez pas accès à cette entité'
  })

  // Vérifier le verrouillage audit pour champs versionnés
  await requireVersionedFieldsEditAccess(user, entityId)

  // Vérifier la restriction editableBy du champ
  const fieldDef = getFieldDefinition(key as EntityFieldKey)
  if (fieldDef?.editableBy && !fieldDef.editableBy.includes(user.role)) {
    throw createError({
      statusCode: 403,
      message: 'Vous n\'avez pas les droits pour modifier ce champ',
    })
  }

  try {
    // Créer une nouvelle version du champ
    const fieldVersion = await setEntityField(
      entityId,
      key as EntityFieldKey,
      value as EntityFieldValue,
      user.id
    )

    return {
      data: {
        id: fieldVersion.id,
        entityId: fieldVersion.entityId,
        fieldKey: fieldVersion.fieldKey,
        value,
        createdAt: fieldVersion.createdAt,
        createdBy: fieldVersion.createdBy,
      },
    }
  } catch (error) {
    throw createError({
      statusCode: 400,
      message: error instanceof Error ? error.message : 'Erreur lors de la mise à jour du champ',
    })
  }
})
