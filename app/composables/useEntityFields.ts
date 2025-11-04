/**
 * Composable pour gérer les champs versionnés des entités
 */

import type { EntityField } from '~/types/entities'

export const useEntityFields = () => {
  const toast = useToast()

  // États de chargement
  const updateFieldLoading = useState('entityFields:updateFieldLoading', () => false)
  const updateFieldsLoading = useState('entityFields:updateFieldsLoading', () => false)

  /**
   * Met à jour un champ versionné d'une entité (crée une nouvelle version)
   */
  const updateEntityField = async (
    entityId: number,
    fieldKey: string,
    value: string | number | boolean | Date | null
  ) => {
    updateFieldLoading.value = true

    try {
      const response = await $fetch<{ data: any }>(`/api/entities/${entityId}/fields/${fieldKey}`, {
        method: 'PUT',
        body: { value },
      })

      toast.add({
        title: 'Succès',
        description: 'Champ mis à jour avec succès',
        color: 'success',
      })

      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la mise à jour du champ'

      toast.add({
        title: 'Erreur',
        description: errorMessage,
        color: 'error',
      })

      return { success: false, error: errorMessage }
    } finally {
      updateFieldLoading.value = false
    }
  }

  /**
   * Met à jour plusieurs champs versionnés en une seule opération
   */
  const updateEntityFields = async (
    entityId: number,
    fields: Map<string, string | number | boolean | Date | null>
  ) => {
    updateFieldsLoading.value = true

    try {
      const results = []
      const errors = []

      // Mettre à jour chaque champ modifié
      for (const [fieldKey, value] of fields.entries()) {
        try {
          const response = await $fetch<{ data: any }>(`/api/entities/${entityId}/fields/${fieldKey}`, {
            method: 'PUT',
            body: { value },
          })
          results.push(response.data)
        } catch (e: any) {
          errors.push({ fieldKey, error: e.data?.message || e.message })
        }
      }

      // Afficher le résultat
      if (errors.length === 0) {
        toast.add({
          title: 'Succès',
          description: `${results.length} champ(s) mis à jour avec succès`,
          color: 'success',
        })
        return { success: true, data: results }
      } else if (errors.length < fields.size) {
        toast.add({
          title: 'Succès partiel',
          description: `${results.length} champ(s) mis à jour, ${errors.length} erreur(s)`,
          color: 'warning',
        })
        return { success: true, data: results, errors }
      } else {
        toast.add({
          title: 'Erreur',
          description: 'Échec de la mise à jour des champs',
          color: 'error',
        })
        return { success: false, errors }
      }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la mise à jour des champs'

      toast.add({
        title: 'Erreur',
        description: errorMessage,
        color: 'error',
      })

      return { success: false, error: errorMessage }
    } finally {
      updateFieldsLoading.value = false
    }
  }

  return {
    // États de chargement
    updateFieldLoading: readonly(updateFieldLoading),
    updateFieldsLoading: readonly(updateFieldsLoading),

    // Actions
    updateEntityField,
    updateEntityFields,
  }
}
