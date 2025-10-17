import type {
  OEWithRelations,
  CreateOEData,
  UpdateOEData,
} from '~~/app/types/oes'
import type { PaginationParams } from '~~/app/types/pagination'

export const useOes = () => {
  const toast = useToast()

  // Utiliser le composable de pagination pour la liste des OEs
  const {
    data: oes,
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
  } = usePaginatedFetch<OEWithRelations>('/api/oes', {
    key: 'oes',
    defaultLimit: 25,
    immediate: true,
  })

  // State pour un OE individuel
  const currentOE = useState<OEWithRelations | null>('oes:current', () => null)

  // États de chargement pour les opérations CRUD
  const createLoading = useState('oes:createLoading', () => false)
  const updateLoading = useState('oes:updateLoading', () => false)
  const deleteLoading = useState('oes:deleteLoading', () => false)

  // Loading state dérivé de fetchStatus
  const fetchLoading = computed(() => fetchStatus.value === 'pending')

  // Error message dérivé de fetchError
  const fetchErrorMessage = computed(() => {
    if (!fetchError.value) return null
    return fetchError.value.data?.message || fetchError.value.message || 'Erreur lors de la récupération des organismes évaluateurs'
  })

  /**
   * Récupérer la liste des OEs avec pagination
   * Note: Le fetch est automatique via usePaginatedFetch, cette méthode est gardée pour compatibilité
   */
  const fetchOes = async (requestParams: PaginationParams = {}) => {
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

      return { success: true, data: oes.value }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la récupération des organismes évaluateurs'

      toast.add({
        title: 'Erreur',
        description: errorMessage,
        color: 'error',
      })

      return { success: false, error: errorMessage }
    }
  }

  /**
   * Récupérer un OE par ID
   */
  const fetchOE = async (id: number) => {
    try {
      const response = await $fetch<{ data: OEWithRelations }>(`/api/oes/${id}`)

      currentOE.value = response.data

      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la récupération de l\'organisme évaluateur'

      toast.add({
        title: 'Erreur',
        description: errorMessage,
        color: 'error',
      })

      return { success: false, error: errorMessage }
    }
  }

  /**
   * Créer un nouvel OE
   */
  const createOE = async (data: CreateOEData) => {
    createLoading.value = true

    try {
      const response = await $fetch<{ data: OEWithRelations }>('/api/oes', {
        method: 'POST',
        body: data,
      })

      // Rafraîchir la liste paginée pour inclure le nouvel OE
      await refresh()

      toast.add({
        title: 'Succès',
        description: 'Organisme évaluateur créé avec succès',
        color: 'success',
      })

      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la création de l\'organisme évaluateur'

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
   * Mettre à jour un OE
   */
  const updateOE = async (id: number, data: UpdateOEData) => {
    updateLoading.value = true

    try {
      const response = await $fetch<{ data: OEWithRelations }>(`/api/oes/${id}`, {
        method: 'PUT',
        body: data,
      })

      // Rafraîchir la liste paginée pour refléter les changements
      await refresh()

      // Mettre à jour l'OE courant si c'est celui-ci
      if (currentOE.value?.id === id) {
        currentOE.value = response.data
      }

      toast.add({
        title: 'Succès',
        description: 'Organisme évaluateur mis à jour avec succès',
        color: 'success',
      })

      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la mise à jour de l\'organisme évaluateur'

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
   * Supprimer un OE (soft delete)
   */
  const deleteOE = async (id: number) => {
    deleteLoading.value = true

    try {
      await $fetch(`/api/oes/${id}`, {
        method: 'DELETE',
      })

      // Rafraîchir la liste paginée
      await refresh()

      // Nettoyer l'OE courant si c'est celui-ci
      if (currentOE.value?.id === id) {
        currentOE.value = null
      }

      toast.add({
        title: 'Succès',
        description: 'Organisme évaluateur supprimé avec succès',
        color: 'success',
      })

      return { success: true }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la suppression de l\'organisme évaluateur'

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
   * Récupérer les OEs pour les filtres et sélecteurs
   */
  const fetchOesForSelect = async (options: { includeAll?: boolean } = {}) => {
    const { includeAll = true } = options

    try {
      const response = await $fetch<{ data: Array<{ id: number; name: string }> }>(
        '/api/oes?limit=-1'
      )

      const oesList = response.data.map(oe => ({
        label: oe.name,
        value: oe.id
      }))

      // Si includeAll est true, ajouter l'option "Tous les OE" au début
      if (includeAll) {
        return [
          { label: 'Tous les OE', value: null },
          ...oesList
        ]
      }

      return oesList
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la récupération des organismes évaluateurs'

      toast.add({
        title: 'Erreur',
        description: errorMessage,
        color: 'error',
      })

      return includeAll ? [{ label: 'Tous les OE', value: null }] : []
    }
  }

  /**
   * Réinitialiser le state
   */
  const reset = () => {
    resetPagination()
    currentOE.value = null
  }

  return {
    // Liste des OEs (readonly)
    oes: readonly(oes),

    // Pagination consolidée
    pagination,

    // Paramètres de pagination (readonly)
    params,

    // OE individuel
    currentOE: readonly(currentOE),

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
    fetchOes,
    fetchOE,
    fetchOesForSelect,
    createOE,
    updateOE,
    deleteOE,
    refresh,
    reset,
  }
}
