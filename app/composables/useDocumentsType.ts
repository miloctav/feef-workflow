import type {
  DocumentTypeWithRelations,
  CreateDocumentTypeData,
  UpdateDocumentTypeData,
} from '~~/app/types/documents-type'
import type { PaginationParams } from '~~/app/types/pagination'

export const useDocumentsType = () => {
  const toast = useToast()

  // Utiliser le composable de pagination pour la liste des documents types
  const {
    data: documentsType,
    pagination,
    status: fetchStatus,
    error: fetchError,
    params,
    refresh,
    nextPage,
    prevPage,
    goToPage,
    setSearch,
    setSort,
    setFilters,
    setLimit,
    reset: resetPagination,
  } = usePaginatedFetch<DocumentTypeWithRelations>('/api/documents-type', {
    key: 'documents-type',
    defaultLimit: 25,
    immediate: true,
  })

  // State pour un document type individuel
  const currentDocumentType = useState<DocumentTypeWithRelations | null>('documentsType:current', () => null)

  // États de chargement pour les opérations CRUD
  const createLoading = useState('documentsType:createLoading', () => false)
  const updateLoading = useState('documentsType:updateLoading', () => false)
  const deleteLoading = useState('documentsType:deleteLoading', () => false)

  // Loading state dérivé de fetchStatus
  const fetchLoading = computed(() => fetchStatus.value === 'pending')

  // Error message dérivé de fetchError
  const fetchErrorMessage = computed(() => {
    if (!fetchError.value) return null
    return fetchError.value.data?.message || fetchError.value.message || 'Erreur lors de la récupération des documents types'
  })

  /**
   * Récupérer la liste des documents types avec pagination
   * Note: Le fetch est automatique via usePaginatedFetch, cette méthode est gardée pour compatibilité
   */
  const fetchDocumentsType = async (requestParams: PaginationParams = {}) => {
    try {
      // Appliquer les paramètres de pagination
      if (requestParams.page) goToPage(requestParams.page)
      if (requestParams.limit) setLimit(requestParams.limit)
      if (requestParams.search !== undefined) setSearch(requestParams.search)
      if (requestParams.sort) setSort(requestParams.sort)

      // Extraire les filtres (tous les params sauf page, limit, search, sort)
      const { page, limit, search, sort, ...filters } = requestParams
      if (Object.keys(filters).length > 0) {
        setFilters(filters)
      }

      // Si les paramètres n'ont pas changé, forcer un refresh
      await refresh()

      return { success: true, data: documentsType.value }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la récupération des documents types'

      toast.add({
        title: 'Erreur',
        description: errorMessage,
        color: 'error',
      })

      return { success: false, error: errorMessage }
    }
  }

  /**
   * Créer un nouveau document type
   */
  const createDocumentType = async (data: CreateDocumentTypeData) => {
    createLoading.value = true

    try {
      const response = await $fetch<{ data: DocumentTypeWithRelations }>('/api/documents-type', {
        method: 'POST',
        body: data,
      })

      // Rafraîchir la liste paginée pour inclure le nouveau document type
      await refresh()

      toast.add({
        title: 'Succès',
        description: 'Document type créé avec succès',
        color: 'success',
      })

      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la création du document type'

      toast.add({
        title: 'Erreur',
        description: errorMessage,
        color: 'error',
      })

      return { success: false, error: errorMessage }
    } finally {
      createLoading.value = false
    }
  }

  /**
   * Mettre à jour un document type
   */
  const updateDocumentType = async (id: number, data: UpdateDocumentTypeData) => {
    updateLoading.value = true

    try {
      const response = await $fetch<{ data: DocumentTypeWithRelations }>(`/api/documents-type/${id}`, {
        method: 'PUT',
        body: data,
      })

      // Rafraîchir la liste paginée pour refléter les changements
      await refresh()

      // Mettre à jour le document type courant si c'est celui-ci
      if (currentDocumentType.value?.id === id) {
        currentDocumentType.value = response.data
      }

      toast.add({
        title: 'Succès',
        description: 'Document type mis à jour avec succès',
        color: 'success',
      })

      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la mise à jour du document type'

      toast.add({
        title: 'Erreur',
        description: errorMessage,
        color: 'error',
      })

      return { success: false, error: errorMessage }
    } finally {
      updateLoading.value = false
    }
  }

  /**
   * Supprimer un document type (soft delete)
   */
  const deleteDocumentType = async (id: number) => {
    deleteLoading.value = true

    try {
      await $fetch(`/api/documents-type/${id}`, {
        method: 'DELETE',
      })

      // Rafraîchir la liste paginée
      await refresh()

      // Nettoyer le document type courant si c'est celui-ci
      if (currentDocumentType.value?.id === id) {
        currentDocumentType.value = null
      }

      toast.add({
        title: 'Succès',
        description: 'Document type supprimé avec succès',
        color: 'success',
      })

      return { success: true }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la suppression du document type'

      toast.add({
        title: 'Erreur',
        description: errorMessage,
        color: 'error',
      })

      return { success: false, error: errorMessage }
    } finally {
      deleteLoading.value = false
    }
  }

  /**
   * Récupérer tous les documents types (sans pagination)
   * Utile pour les select / dropdowns
   */
  const fetchAllDocumentsType = async (filters?: { category?: string }) => {
    try {
      const query: Record<string, string> = { limit: '-1' }

      // Ajouter les filtres si fournis
      if (filters?.category) {
        query.category = filters.category
      }

      const response = await $fetch<{ data: Array<{ id: number, title: string, description: string | null, category: string }> }>('/api/documents-type', {
        query,
      })

      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la récupération des documents types'

      toast.add({
        title: 'Erreur',
        description: errorMessage,
        color: 'error',
      })

      return { success: false, error: errorMessage, data: [] }
    }
  }

  /**
   * Réinitialiser le state
   */
  const reset = () => {
    resetPagination()
    currentDocumentType.value = null
  }

  return {
    // Liste des documents types (readonly)
    documentsType: readonly(documentsType),

    // Pagination consolidée
    pagination,

    // Paramètres de pagination (readonly)
    params,

    // Document type individuel
    currentDocumentType: readonly(currentDocumentType),

    // États de chargement
    fetchLoading: readonly(fetchLoading),
    fetchError: readonly(fetchErrorMessage),
    createLoading: readonly(createLoading),
    updateLoading: readonly(updateLoading),
    deleteLoading: readonly(deleteLoading),

    // Actions de pagination
    nextPage,
    prevPage,
    goToPage,
    setSearch,
    setSort,
    setFilters,
    setLimit,

    // Actions CRUD
    fetchDocumentsType,
    fetchAllDocumentsType,
    createDocumentType,
    updateDocumentType,
    deleteDocumentType,
    refresh,
    reset,
  }
}
