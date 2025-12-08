
import type { Action } from '~~/server/database/schema'
import type { PaginationParams } from '~~/app/types/pagination'
import { isRef, unref, watch, computed } from 'vue'

export const useActions = (options?: { auditId?: number | Ref<number | undefined>; entityId?: number | Ref<number | undefined> }) => {
  // Permet d'accepter un ref/computed ou une valeur primitive
  const auditIdRef = options?.auditId && isRef(options.auditId) ? options.auditId : ref(options?.auditId)
  const entityIdRef = options?.entityId && isRef(options.entityId) ? options.entityId : ref(options?.entityId)

  // Génère une clé de cache unique selon le contexte
  const cacheKey = computed(() =>
    auditIdRef.value
      ? `actions-audit-${auditIdRef.value}`
      : entityIdRef.value
        ? `actions-entity-${entityIdRef.value}`
        : 'actions'
  )


  // Utilise le composable de pagination pour la liste des actions
  const paginated = usePaginatedFetch<Action>('/api/actions', {
    key: cacheKey,
    defaultLimit: 50,
    immediate: false, // on déclenche manuellement
    initialParams: {},
    watch: false, // on gère le watch nous-même
  })

  // Watch sur auditId/entityId pour relancer le fetch si besoin, uniquement si défini
  watch([auditIdRef, entityIdRef], ([newAuditId, newEntityId]) => {
    if (newAuditId || newEntityId) {
      paginated.setFilters({
        ...(newAuditId ? { auditId: newAuditId } : {}),
        ...(newEntityId ? { entityId: newEntityId } : {}),
      })
      paginated.refresh()
    } else {
      // Reset data when both IDs are undefined to prevent stale data
      paginated.reset()
    }
  }, { immediate: true })

  // Loading state dérivé
  const fetchLoading = computed(() => paginated.status.value === 'pending')
  const fetchErrorMessage = computed(() => {
    if (!paginated.error.value) return null
    return paginated.error.value.data?.message || paginated.error.value.message || 'Erreur lors de la récupération des actions'
  })

  // Méthode pour forcer le fetch
  const fetchActions = async (requestParams: PaginationParams = {}) => {
    try {
      if (requestParams.page) paginated.goToPage(requestParams.page)
      if (requestParams.limit) paginated.setLimit(requestParams.limit)
      if (requestParams.search !== undefined) paginated.setSearch(requestParams.search)
      if (requestParams.sort) paginated.setSort(requestParams.sort)
      const { page, limit, search, sort, ...filters } = requestParams
      if (Object.keys(filters).length > 0) paginated.setFilters(filters)
      await paginated.refresh()
      return { success: true, data: paginated.data.value }
    } catch (e: any) {
      return { success: false, error: e.data?.message || e.message || 'Erreur lors de la récupération des actions' }
    }
  }

  const reset = () => {
    paginated.reset()
  }

  return {
    actions: paginated.data,
    pagination: paginated.pagination,
    params: paginated.params,
    fetchLoading: readonly(fetchLoading),
    fetchError: readonly(fetchErrorMessage),
    fetchActions,
    refresh: paginated.refresh,
    nextPage: paginated.nextPage,
    prevPage: paginated.prevPage,
    goToPage: paginated.goToPage,
    setSearch: paginated.setSearch,
    setSort: paginated.setSort,
    setFilters: paginated.setFilters,
    setLimit: paginated.setLimit,
    reset,
  }
}
