import type {
  EntityWithRelations,
  CreateEntityData,
  UpdateEntityData,
} from '~~/app/types/entities'
import type { PaginationParams } from '~~/app/types/pagination'

export const useEntities = () => {
  const toast = useToast()

  // Utiliser le composable de pagination pour la liste des entités
  const {
    data: entities,
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
  } = usePaginatedFetch<EntityWithRelations>('/api/entities', {
    key: 'entities',
    defaultLimit: 25,
  })

  // State pour une entité individuelle
  const currentEntity = useState<EntityWithRelations | null>('entities:current', () => null)

  // États de chargement pour les opérations CRUD
  const createLoading = useState('entities:createLoading', () => false)
  const updateLoading = useState('entities:updateLoading', () => false)
  const deleteLoading = useState('entities:deleteLoading', () => false)

  // Loading state dérivé de fetchStatus
  const fetchLoading = computed(() => fetchStatus.value === 'pending')

  // Error message dérivé de fetchError
  const fetchErrorMessage = computed(() => {
    if (!fetchError.value) return null
    return fetchError.value.data?.message || fetchError.value.message || 'Erreur lors de la récupération des entités'
  })

  /**
   * Récupérer la liste des entités avec pagination
   * Note: Le fetch est automatique via usePaginatedFetch, cette méthode est gardée pour compatibilité
   */
  const fetchEntities = async (requestParams: PaginationParams = {}) => {
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

      return { success: true, data: entities.value }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la récupération des entités'

      toast.add({
        title: 'Erreur',
        description: errorMessage,
        color: 'error',
      })

      return { success: false, error: errorMessage }
    }
  }

  /**
   * Récupérer une entité par ID
   */
  const fetchEntity = async (id: number) => {
    try {
      const response = await $fetch<{ data: EntityWithRelations }>(`/api/entities/${id}`)

      currentEntity.value = response.data

      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la récupération de l\'entité'

      toast.add({
        title: 'Erreur',
        description: errorMessage,
        color: 'error',
      })

      return { success: false, error: errorMessage }
    }
  }

  /**
   * Créer une nouvelle entité
   */
  const createEntity = async (data: CreateEntityData) => {
    createLoading.value = true

    try {
      const response = await $fetch<{ data: EntityWithRelations }>('/api/entities', {
        method: 'POST',
        body: data,
      })

      // Rafraîchir la liste paginée pour inclure la nouvelle entité
      await refresh()

      toast.add({
        title: 'Succès',
        description: 'Entité créée avec succès',
        color: 'success',
      })

      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la création de l\'entité'

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
   * Mettre à jour une entité
   */
  const updateEntity = async (id: number, data: UpdateEntityData) => {
    updateLoading.value = true

    try {
      const response = await $fetch<{ data: EntityWithRelations }>(`/api/entities/${id}`, {
        method: 'PUT',
        body: data,
      })

      // Rafraîchir la liste paginée pour refléter les changements
      await refresh()

      // Mettre à jour l'entité courante si c'est celle-ci
      if (currentEntity.value?.id === id) {
        currentEntity.value = response.data
      }

      toast.add({
        title: 'Succès',
        description: 'Entité mise à jour avec succès',
        color: 'success',
      })

      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la mise à jour de l\'entité'

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
   * Supprimer une entité (soft delete)
   */
  const deleteEntity = async (id: number) => {
    deleteLoading.value = true

    try {
      await $fetch(`/api/entities/${id}`, {
        method: 'DELETE',
      })

      // Rafraîchir la liste paginée
      await refresh()

      // Nettoyer l'entité courante si c'est celle-ci
      if (currentEntity.value?.id === id) {
        currentEntity.value = null
      }

      toast.add({
        title: 'Succès',
        description: 'Entité supprimée avec succès',
        color: 'success',
      })

      return { success: true }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la suppression de l\'entité'

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
   * Réinitialiser le state
   */
  const reset = () => {
    resetPagination()
    currentEntity.value = null
  }

  return {
    // Liste des entités (readonly)
    entities: readonly(entities),

    // Pagination consolidée
    pagination,

    // Paramètres de pagination (readonly)
    params,

    // Entité individuelle
    currentEntity: readonly(currentEntity),

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
    fetchEntities,
    fetchEntity,
    createEntity,
    updateEntity,
    deleteEntity,
    refresh,
    reset,
  }
}
