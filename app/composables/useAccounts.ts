import type {
  AccountWithRelations,
  CreateAccountData,
  UpdateAccountData,
} from '~~/app/types/accounts'
import type { PaginationParams } from '~~/app/types/pagination'

export const useAccounts = () => {
  const toast = useToast()

  // Utiliser le composable de pagination pour la liste des comptes
  const {
    data: accounts,
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
  } = usePaginatedFetch<AccountWithRelations>('/api/accounts', {
    key: 'accounts',
    defaultLimit: 25,
    immediate: true,
  })

  // State pour un compte individuel
  const currentAccount = useState<AccountWithRelations | null>('accounts:current', () => null)

  // États de chargement pour les opérations CRUD
  const createLoading = useState('accounts:createLoading', () => false)
  const updateLoading = useState('accounts:updateLoading', () => false)
  const deleteLoading = useState('accounts:deleteLoading', () => false)

  // Loading state dérivé de fetchStatus
  const fetchLoading = computed(() => fetchStatus.value === 'pending')

  // Error message dérivé de fetchError
  const fetchErrorMessage = computed(() => {
    if (!fetchError.value) return null
    return fetchError.value.data?.message || fetchError.value.message || 'Erreur lors de la récupération des comptes'
  })

  /**
   * Récupérer la liste des comptes avec pagination
   * Note: Le fetch est automatique via usePaginatedFetch, cette méthode est gardée pour compatibilité
   */
  const fetchAccounts = async (requestParams: PaginationParams = {}) => {
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

      return { success: true, data: accounts.value }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la récupération des comptes'

      toast.add({
        title: 'Erreur',
        description: errorMessage,
        color: 'error',
      })

      return { success: false, error: errorMessage }
    }
  }

  /**
   * Récupérer un compte par ID
   */
  const fetchAccount = async (id: number) => {
    try {
      const response = await $fetch<{ account: AccountWithRelations }>(`/api/accounts/${id}`)

      currentAccount.value = response.account

      return { success: true, data: response.account }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la récupération du compte'

      toast.add({
        title: 'Erreur',
        description: errorMessage,
        color: 'error',
      })

      return { success: false, error: errorMessage }
    }
  }

  /**
   * Créer un nouveau compte
   */
  const createAccount = async (data: CreateAccountData) => {
    createLoading.value = true

    try {
      const response = await $fetch<{ account: AccountWithRelations }>('/api/accounts', {
        method: 'POST',
        body: data,
      })

      // Rafraîchir la liste paginée pour inclure le nouveau compte
      await refresh()

      toast.add({
        title: 'Succès',
        description: 'Compte créé avec succès',
        color: 'success',
      })

      return { success: true, data: response.account }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la création du compte'

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
   * Mettre à jour un compte
   */
  const updateAccount = async (id: number, data: UpdateAccountData) => {
    updateLoading.value = true

    try {
      const response = await $fetch<{ account: AccountWithRelations }>(`/api/accounts/${id}`, {
        method: 'PATCH',
        body: data,
      })

      // Rafraîchir la liste paginée pour refléter les changements
      await refresh()

      // Mettre à jour le compte courant si c'est celui-ci
      if (currentAccount.value?.id === id) {
        currentAccount.value = response.account
      }

      toast.add({
        title: 'Succès',
        description: 'Compte mis à jour avec succès',
        color: 'success',
      })

      return { success: true, data: response.account }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la mise à jour du compte'

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
   * Supprimer un compte (soft delete)
   */
  const deleteAccount = async (id: number) => {
    deleteLoading.value = true

    try {
      await $fetch(`/api/accounts/${id}`, {
        method: 'DELETE',
      })

      // Rafraîchir la liste paginée
      await refresh()

      // Nettoyer le compte courant si c'est celui-ci
      if (currentAccount.value?.id === id) {
        currentAccount.value = null
      }

      toast.add({
        title: 'Succès',
        description: 'Compte supprimé avec succès',
        color: 'success',
      })

      return { success: true }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la suppression du compte'

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
   * Récupérer les auditeurs pour les filtres et sélecteurs
   */
  const fetchAuditors = async (options: { includeAll?: boolean } = {}) => {
    const { includeAll = true } = options

    try {
      const response = await $fetch<{ data: Array<{ id: number; firstname: string; lastname: string }> }>(
        '/api/accounts?role=AUDITOR&limit=-1'
      )

      const auditorsList = response.data.map(auditor => ({
        label: `${auditor.firstname} ${auditor.lastname}`,
        value: auditor.id
      }))

      // Si includeAll est true, ajouter l'option "Tous les auditeurs" au début
      if (includeAll) {
        return [
          { label: 'Tous les auditeurs', value: null },
          ...auditorsList
        ]
      }

      return auditorsList
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la récupération des auditeurs'

      toast.add({
        title: 'Erreur',
        description: errorMessage,
        color: 'error',
      })

      return includeAll ? [{ label: 'Tous les auditeurs', value: null }] : []
    }
  }

  /**
   * Supprimer l'association entre un compte et une entité
   */
  const removeAccountFromEntity = async (accountId: number, entityId: number) => {
    deleteLoading.value = true

    try {
      await $fetch('/api/accounts-to-entities', {
        method: 'DELETE',
        query: {
          accountId,
          entityId,
        },
      })

      // Rafraîchir la liste paginée
      await refresh()

      toast.add({
        title: 'Succès',
        description: 'Association compte-entité supprimée avec succès',
        color: 'success',
      })

      return { success: true }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la suppression de l\'association'

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
    currentAccount.value = null
  }

  return {
    // Liste des comptes (readonly)
    accounts: readonly(accounts),

    // Pagination consolidée
    pagination,

    // Paramètres de pagination (readonly)
    params,

    // Compte individuel
    currentAccount: readonly(currentAccount),

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
    fetchAccounts,
    fetchAccount,
    fetchAuditors,
    createAccount,
    updateAccount,
    deleteAccount,
    removeAccountFromEntity,
    refresh,
    reset,
  }
}
