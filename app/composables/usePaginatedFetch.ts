import type {
  PaginatedResponse,
  PaginationState,
  PaginationParams,
  PaginatedFetchOptions,
} from '~~/app/types/pagination'

/**
 * Composable générique pour gérer les requêtes paginées
 *
 * @example
 * ```ts
 * const {
 *   data,
 *   pagination,
 *   status,
 *   error,
 *   refresh,
 *   nextPage,
 *   prevPage,
 *   goToPage,
 *   setSearch,
 *   setSort,
 *   setFilters
 * } = usePaginatedFetch<Account>('/api/accounts', {
 *   key: 'accounts',
 *   defaultLimit: 25,
 *   immediate: true
 * })
 * ```
 */
export function usePaginatedFetch<T>(
  url: string,
  options: PaginatedFetchOptions = {}
) {
  const {
    key = url,
    defaultLimit = 25,
    initialParams = {},
    immediate = false, // Désactivé par défaut pour éviter les fetch inutiles et race conditions
    watch: enableWatch = true,
  } = options

  // Refs réactifs pour les paramètres de pagination
  const page = ref(initialParams.page || 1)
  const limit = ref(initialParams.limit || defaultLimit)
  const search = ref(initialParams.search || '')
  const sort = ref(initialParams.sort || '')
  const filters = ref<Record<string, any>>({})

  // Extraire les filtres initiaux (tous les params sauf page, limit, search, sort)
  const { page: _p, limit: _l, search: _s, sort: _so, ...initialFilters } = initialParams
  filters.value = initialFilters

  // Construire les query params pour useFetch
  const queryParams = computed(() => {
    const params: Record<string, any> = {
      page: page.value,
      limit: limit.value,
    }

    if (search.value) params.search = search.value
    if (sort.value) params.sort = sort.value

    // Ajouter les filtres dynamiques
    Object.entries(filters.value).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          params[key] = value.join(',')
        } else {
          params[key] = value
        }
      }
    })

    return params
  })

  // Utiliser useLazyFetch avec l'option query
  const {
    data: response,
    status,
    error,
    refresh,
    execute,
  } = useLazyFetch<PaginatedResponse<T>>(url, {
    key: () => unref(key), // Clé dynamique pour gérer les refs/computed
    query: queryParams,
    immediate,
    server: true,
    lazy: true,
    watch: false, // On gère le watch manuellement ci-dessous si enableWatch est true
  })

  // Watch manuel sur les paramètres pour déclencher le refetch
  if (enableWatch) {
    watch([page, limit, search, sort, filters], () => {
      console.log('[usePaginatedFetch] Watcher triggered. Refreshing...', { query: queryParams.value })
      execute()
    })
  }

  // Extraire les données de la réponse
  const data = computed(() => response.value?.data || [])
  const meta = computed(() => response.value?.meta)

  // État de pagination consolidé
  const pagination = computed<PaginationState>(() => {
    const currentPage = meta.value?.page || page.value
    const currentLimit = meta.value?.limit || limit.value
    const total = meta.value?.total || 0
    const totalPages = meta.value?.totalPages || 0

    return {
      page: currentPage,
      limit: currentLimit,
      total,
      totalPages,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
    }
  })

  // Méthodes de navigation
  const nextPage = () => {
    if (pagination.value.hasNext) {
      page.value += 1
    }
  }

  const prevPage = () => {
    if (pagination.value.hasPrev) {
      page.value -= 1
    }
  }

  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= pagination.value.totalPages) {
      page.value = pageNumber
    }
  }

  const setSearch = (searchTerm: string) => {
    search.value = searchTerm
    page.value = 1 // Réinitialiser à la première page lors d'une recherche
  }

  const setSort = (sortValue: string) => {
    console.log('[usePaginatedFetch] Setting sort to:', sortValue)
    sort.value = sortValue
    page.value = 1 // Réinitialiser à la première page lors d'un tri
  }

  const setFilters = (newFilters: Record<string, any>) => {
    filters.value = { ...newFilters }
    page.value = 1 // Réinitialiser à la première page lors d'un filtrage
  }

  const setLimit = (newLimit: number) => {
    limit.value = newLimit
    page.value = 1 // Réinitialiser à la première page lors d'un changement de limite
  }

  const reset = () => {
    page.value = 1
    limit.value = defaultLimit
    search.value = ''
    sort.value = ''
    filters.value = {}
  }

  return {
    // Données
    data,
    meta,
    pagination: readonly(pagination),

    // État de la requête
    status: readonly(status),
    error: readonly(error),

    // Paramètres (readonly pour usage externe)
    params: {
      page: readonly(page),
      limit: readonly(limit),
      search: readonly(search),
      sort: readonly(sort),
      filters: readonly(filters),
    },

    // Actions
    refresh,
    execute,
    nextPage,
    prevPage,
    goToPage,
    setSearch,
    setSort,
    setFilters,
    setLimit,
    reset,
  }
}
