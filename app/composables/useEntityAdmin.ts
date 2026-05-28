import type { EntityTypeType, EntityModeType } from '#shared/types/enums'

export interface AdminChangeBody {
  mode?: EntityModeType
  type?: EntityTypeType
  parentGroupId?: number | null
  swapWithParent?: boolean
  siret?: string
  oeId?: number | null
  allowOeDocumentsAccess?: boolean
}

export interface AdminChangeItem {
  field: 'mode' | 'type' | 'parentGroupId' | 'siret' | 'oeId'
  entityId: number
  entityName: string
  from: string | number | null
  to: string | number | null
  fromLabel: string
  toLabel: string
}

export interface AdminPreviewResult {
  changes: AdminChangeItem[]
  warnings: string[]
  blocked: { reason: string } | null
}

export interface AdminApplyResult {
  success: boolean
  changes: AdminChangeItem[]
  warnings: string[]
}

export const useEntityAdmin = () => {
  const toast = useToast()
  const loading = useState('entityAdmin:loading', () => false)

  const previewChange = async (
    entityId: number,
    body: AdminChangeBody,
  ): Promise<{ success: boolean; data?: AdminPreviewResult; error?: string }> => {
    try {
      const response = await $fetch<{ data: AdminPreviewResult }>(
        `/api/entities/${entityId}/admin/preview`,
        {
          method: 'POST',
          body,
        },
      )
      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors du calcul des impacts'
      toast.add({ title: 'Erreur', description: errorMessage, color: 'error' })
      return { success: false, error: errorMessage }
    }
  }

  const applyChange = async (
    entityId: number,
    body: AdminChangeBody,
  ): Promise<{ success: boolean; data?: AdminApplyResult; error?: string }> => {
    loading.value = true
    try {
      const response = await $fetch<{ data: AdminApplyResult }>(
        `/api/entities/${entityId}/admin`,
        {
          method: 'PUT',
          body,
        },
      )
      toast.add({
        title: 'Succès',
        description: 'Modification administrative appliquée.',
        color: 'success',
      })
      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de l\'application'
      toast.add({ title: 'Erreur', description: errorMessage, color: 'error' })
      return { success: false, error: errorMessage }
    } finally {
      loading.value = false
    }
  }

  return {
    loading: readonly(loading),
    previewChange,
    applyChange,
  }
}
