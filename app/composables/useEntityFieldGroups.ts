/**
 * Composable pour gérer l'édition groupée de champs
 * Utilise les endpoints individuels existants mais les orchestre pour une UX groupée
 */

import type { EntityFieldGroupKey, EntityField, EntityFieldGroup } from '~/types/entities'
import { entityFieldGroups, getFieldsByGroup } from '~~/server/database/entity-fields-config'

export const useEntityFieldGroups = () => {
  const toast = useToast()
  const { updateEntityField } = useEntityFields() // Réutilise le composable existant

  /**
   * Construit les groupes à partir des champs de l'entité
   */
  const buildFieldGroups = (fields: EntityField[]): EntityFieldGroup[] => {
    return entityFieldGroups.map(groupDef => {
      const groupFields = fields.filter(field => {
        const fieldDef = getFieldsByGroup(groupDef.key).find(f => f.key === field.key)
        return !!fieldDef
      })

      return {
        key: groupDef.key,
        label: groupDef.label,
        description: groupDef.description,
        icon: groupDef.icon,
        fields: groupFields,
      }
    })
  }

  /**
   * Met à jour plusieurs champs d'un groupe en parallèle
   * Chaque champ est sauvegardé individuellement via l'endpoint existant
   */
  const updateFieldGroup = async (
    entityId: number,
    groupKey: EntityFieldGroupKey,
    fieldUpdates: Map<string, any>  // Map<fieldKey, newValue>
  ) => {
    const updates = Array.from(fieldUpdates.entries())

    if (updates.length === 0) {
      return { success: true }
    }

    try {
      // Sauvegarder tous les champs modifiés en parallèle
      const results = await Promise.all(
        updates.map(([fieldKey, value]) =>
          updateEntityField(entityId, fieldKey, value)
        )
      )

      // Vérifier si toutes les mises à jour ont réussi
      const allSuccess = results.every(r => r.success)

      if (allSuccess) {
        toast.add({
          title: 'Succès',
          description: `${updates.length} champ${updates.length > 1 ? 's' : ''} mis à jour avec succès`,
          color: 'success',
        })
        return { success: true }
      } else {
        const failedCount = results.filter(r => !r.success).length
        toast.add({
          title: 'Erreur partielle',
          description: `${failedCount} champ${failedCount > 1 ? 's' : ''} n'ont pas pu être mis à jour`,
          color: 'error',
        })
        return { success: false }
      }
    } catch (error: any) {
      toast.add({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la mise à jour du groupe',
        color: 'error',
      })
      return { success: false, error: error.message }
    }
  }

  return {
    buildFieldGroups,
    updateFieldGroup,
  }
}
