import type {
  AuditWithRelations,
  CreateAuditData,
  UpdateAuditData,
} from '~~/app/types/audits'
import type { PaginationParams } from '~~/app/types/pagination'

export const useAudits = (options?: { entityId?: number }) => {
  const toast = useToast()

  // Construire une clé unique si un entityId est fourni pour éviter les conflits de cache
  const cacheKey = options?.entityId ? `audits-entity-${options.entityId}` : 'audits'

  // Utiliser le composable de pagination pour la liste des audits
  const {
    data: audits,
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
  } = usePaginatedFetch<AuditWithRelations>('/api/audits', {
    key: cacheKey,
    defaultLimit: 25,
    immediate: false,
    initialParams: options?.entityId ? { entityId: options.entityId } : {},
  })

  // State pour un audit individuel
  const currentAudit = useState<AuditWithRelations | null>('audits:current', () => null)

  // �tats de chargement pour les op�rations CRUD
  const createLoading = useState('audits:createLoading', () => false)
  const updateLoading = useState('audits:updateLoading', () => false)
  const deleteLoading = useState('audits:deleteLoading', () => false)

  // Loading state d�riv� de fetchStatus
  const fetchLoading = computed(() => fetchStatus.value === 'pending')

  // Error message d�riv� de fetchError
  const fetchErrorMessage = computed(() => {
    if (!fetchError.value) return null
    return fetchError.value.data?.message || fetchError.value.message || 'Erreur lors de la r�cup�ration des audits'
  })

  /**
   * R�cup�rer la liste des audits avec pagination
   * Note: Le fetch est automatique via usePaginatedFetch, cette m�thode est gard�e pour compatibilit�
   */
  const fetchAudits = async (requestParams: PaginationParams = {}) => {
    try {
      // Appliquer les param�tres de pagination
      if (requestParams.page) goToPage(requestParams.page)
      if (requestParams.limit) setLimit(requestParams.limit)
      if (requestParams.search !== undefined) setSearch(requestParams.search)
      if (requestParams.sort) setSort(requestParams.sort)

      // Extraire les filtres (tous les params sauf page, limit, search, sort)
      const { page, limit, search, sort, ...filters } = requestParams
      if (Object.keys(filters).length > 0) {
        setFilters(filters)
      }

      // Si les param�tres n'ont pas chang�, forcer un refresh
      await refresh()

      return { success: true, data: audits.value }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la r�cup�ration des audits'

      toast.add({
        title: 'Erreur',
        description: errorMessage,
        color: 'error',
      })

      return { success: false, error: errorMessage }
    }
  }

  /**
   * R�cup�rer un audit par ID
   */
  const fetchAudit = async (id: number) => {
    try {
      const response = await $fetch<{ data: AuditWithRelations }>(`/api/audits/${id}`)

      currentAudit.value = response.data

      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la r�cup�ration de l\'audit'

      currentAudit.value = null

      toast.add({
        title: 'Erreur',
        description: errorMessage,
        color: 'error',
      })

      return { success: false, error: errorMessage }
    }
  }

  /**
   * Cr�er un nouvel audit
   */
  const createAudit = async (data: CreateAuditData) => {
    createLoading.value = true

    try {
      const response = await $fetch<{ data: AuditWithRelations }>('/api/audits', {
        method: 'POST',
        body: data,
      })

      // Rafra�chir la liste pagin�e pour inclure le nouvel audit
      await refresh()

      toast.add({
        title: 'Succ�s',
        description: 'Audit cr�� avec succ�s',
        color: 'success',
      })

      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la cr�ation de l\'audit'

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
   * Mettre � jour un audit
   */
  const updateAudit = async (id: number, data: UpdateAuditData) => {
    updateLoading.value = true

    try {
      const response = await $fetch<{ data: AuditWithRelations }>(`/api/audits/${id}`, {
        method: 'PUT',
        body: data,
      })

      // Rafra�chir la liste pagin�e pour refl�ter les changements
      await refresh()

      // Mettre � jour l'audit courant si c'est celui-ci
      if (currentAudit.value?.id === id) {
        currentAudit.value = response.data
      }

      toast.add({
        title: 'Succ�s',
        description: 'Audit mis � jour avec succ�s',
        color: 'success',
      })

      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la mise � jour de l\'audit'

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
   * Supprimer un audit (soft delete)
   */
  const deleteAudit = async (id: number) => {
    deleteLoading.value = true

    try {
      await $fetch(`/api/audits/${id}`, {
        method: 'DELETE',
      })

      // Rafra�chir la liste pagin�e
      await refresh()

      // Nettoyer l'audit courant si c'est celui-ci
      if (currentAudit.value?.id === id) {
        currentAudit.value = null
      }

      toast.add({
        title: 'Succ�s',
        description: 'Audit supprim� avec succ�s',
        color: 'success',
      })

      return { success: true }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la suppression de l\'audit'

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
   * Affecter un auditeur � un audit
   */
  const assignAuditor = async (id: number, auditorId: number) => {
    updateLoading.value = true

    try {
      const response = await $fetch<{ data: AuditWithRelations }>(`/api/audits/${id}/assign-auditor`, {
        method: 'POST',
        body: { auditorId },
      })

      // Rafra�chir la liste pagin�e pour refl�ter les changements
      await refresh()

      // Mettre � jour l'audit courant si c'est celui-ci
      if (currentAudit.value?.id === id) {
        currentAudit.value = response.data
      }

      toast.add({
        title: 'Succ�s',
        description: 'Auditeur affect� avec succ�s',
        color: 'success',
      })

      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de l\'affectation de l\'auditeur'

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
   * R�initialiser le state
   */
  const reset = () => {
    resetPagination()
    currentAudit.value = null
  }

  return {
    // Liste des audits (readonly)
    audits: readonly(audits),

    // Pagination consolid�e
    pagination,

    // Param�tres de pagination (readonly)
    params,

    // Audit individuel
    currentAudit: readonly(currentAudit),

    // �tats de chargement
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
    fetchAudits,
    fetchAudit,
    createAudit,
    updateAudit,
    deleteAudit,
    assignAuditor,
    refresh,
    reset,
  }
}
