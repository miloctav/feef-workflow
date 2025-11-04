/**
 * Utilitaires pour formater les champs versionnés des entités
 * pour l'affichage dans l'API
 */

import { getEntityFields, type EntityFieldWithValue, type EntityFieldValue } from './entity-fields'
import { entityFieldsConfig, type EntityFieldKey, type EntityFieldType } from '../database/entity-fields-config'

/**
 * Format d'un champ pour l'API
 */
export interface FormattedEntityField {
  key: EntityFieldKey
  label: string
  type: EntityFieldType
  value: EntityFieldValue
  unit?: string
  lastUpdatedAt?: Date
  lastUpdatedBy?: number
}

/**
 * Récupère et formate tous les champs d'une entité pour l'affichage
 *
 * Retourne tous les champs configurés, même ceux sans valeur (value: null)
 *
 * @param entityId - ID de l'entité
 * @returns Tableau de tous les champs formatés
 */
export async function getFormattedEntityFields(entityId: number): Promise<FormattedEntityField[]> {
  // Récupérer les dernières valeurs de tous les champs
  const fieldsMap = await getEntityFields(entityId)

  // Pour chaque champ configuré, créer un objet formaté
  const formattedFields: FormattedEntityField[] = entityFieldsConfig.map(fieldDef => {
    const fieldValue = fieldsMap.get(fieldDef.key)

    if (fieldValue) {
      // Le champ a une valeur
      return {
        key: fieldDef.key,
        label: fieldDef.label,
        type: fieldDef.type,
        value: fieldValue.value,
        unit: fieldDef.unit,
        lastUpdatedAt: fieldValue.lastUpdatedAt,
        lastUpdatedBy: fieldValue.lastUpdatedBy,
      }
    } else {
      // Le champ n'a pas encore de valeur
      return {
        key: fieldDef.key,
        label: fieldDef.label,
        type: fieldDef.type,
        value: null,
        unit: fieldDef.unit,
      }
    }
  })

  return formattedFields
}
