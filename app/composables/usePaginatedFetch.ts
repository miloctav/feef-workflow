import type {
  PaginatedResponse,
  PaginationState,
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
    defaultLimit = 25,
    initialParams = {},
    immediate = false,
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

  // État de la requête
  const response = ref<PaginatedResponse<T> | null>(null)
  const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
  const error = ref<any>(null)

  // Construire les query params
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

  // Fonction de fetch directe
  const execute = async () => {
    status.value = 'pending'
    error.value = null

    try {
      const result = await $fetch<PaginatedResponse<T>>(url, {
        query: queryParams.value,
      })
      response.value = result
      status.value = 'success'
    } catch (e: any) {
      error.value = e
      status.value = 'error'
    }
  }

  // Alias pour compatibilité
  const refresh = execute

  // Watch manuel sur les paramètres pour déclencher le refetch
  if (enableWatch) {
    watch([page, limit, search, sort, filters], () => {
      execute()
    })
  }

  // Fetch immédiat si demandé
  if (immediate) {
    execute()
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
    page.value = 1
  }

  const setSort = (sortValue: string) => {
    sort.value = sortValue
    page.value = 1
  }

  const setFilters = (newFilters: Record<string, any>) => {
    filters.value = { ...newFilters }
    page.value = 1
  }

  const setLimit = (newLimit: number) => {
    limit.value = newLimit
    page.value = 1
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
