import type {
  AccountWithRelations,
  CreateAccountData,
  UpdateAccountData,
} from '~~/app/types/accounts'
import type { PaginationParams } from '~~/app/types/api'

export const useAccounts = () => {
  const toast = useToast()

  // State partagé pour la liste des comptes
  const accounts = useState<AccountWithRelations[]>('accounts:list', () => [])
  const total = useState<number>('accounts:total', () => 0)
  const currentPage = useState<number>('accounts:page', () => 1)
  const pageSize = useState<number>('accounts:pageSize', () => 10)

  // State pour un compte individuel
  const currentAccount = useState<AccountWithRelations | null>('accounts:current', () => null)

  // États de chargement
  const fetchLoading = useState('accounts:fetchLoading', () => false)
  const fetchError = useState<string | null>('accounts:fetchError', () => null)

  const createLoading = useState('accounts:createLoading', () => false)
  const updateLoading = useState('accounts:updateLoading', () => false)
  const deleteLoading = useState('accounts:deleteLoading', () => false)

  /**
   * Récupérer la liste des comptes avec pagination
   */
  const fetchAccounts = async (params: PaginationParams = {}) => {
    fetchLoading.value = true
    fetchError.value = null

    try {
      // Construction des query params
      const query = new URLSearchParams()
      if (params.page) query.append('page', params.page.toString())
      if (params.pageSize) query.append('pageSize', params.pageSize.toString())
      if (params.search) query.append('search', params.search)
      if (params.sortBy) query.append('sortBy', params.sortBy)
      if (params.sortOrder) query.append('sortOrder', params.sortOrder)

      const queryString = query.toString()
      const url = `/api/accounts${queryString ? `?${queryString}` : ''}`

      const response = await $fetch<{ accounts: AccountWithRelations[] }>(url)

      accounts.value = response.accounts
      // TODO: Ajouter pagination côté serveur
      total.value = response.accounts.length
      if (params.page) currentPage.value = params.page
      if (params.pageSize) pageSize.value = params.pageSize

      return { success: true, data: response.accounts }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la récupération des comptes'
      fetchError.value = errorMessage

      // Toast pour les erreurs de récupération
      toast.add({
        title: 'Erreur',
        description: errorMessage,
        color: 'error',
      })

      return { success: false, error: errorMessage }
    } finally {
      fetchLoading.value = false
    }
  }

  /**
   * Récupérer un compte par ID
   */
  const fetchAccount = async (id: number) => {
    fetchLoading.value = true
    fetchError.value = null

    try {
      const response = await $fetch<{ account: AccountWithRelations }>(`/api/accounts/${id}`)

      currentAccount.value = response.account

      return { success: true, data: response.account }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la récupération du compte'
      fetchError.value = errorMessage

      toast.add({
        title: 'Erreur',
        description: errorMessage,
        color: 'error',
      })

      return { success: false, error: errorMessage }
    } finally {
      fetchLoading.value = false
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

      // Ajouter le nouveau compte à la liste
      accounts.value = [response.account, ...accounts.value]
      total.value += 1

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

      // Mettre à jour dans la liste
      const index = accounts.value.findIndex(a => a.id === id)
      if (index !== -1) {
        accounts.value[index] = response.account
      }

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

      // Retirer de la liste
      accounts.value = accounts.value.filter(a => a.id !== id)
      total.value -= 1

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
   * Réinitialiser le state
   */
  const reset = () => {
    accounts.value = []
    total.value = 0
    currentPage.value = 1
    currentAccount.value = null
    fetchError.value = null
  }

  return {
    // State (readonly pour éviter les modifications directes)
    accounts: readonly(accounts),
    total: readonly(total),
    currentPage: readonly(currentPage),
    pageSize: readonly(pageSize),
    currentAccount: readonly(currentAccount),

    // Loading states
    fetchLoading: readonly(fetchLoading),
    fetchError: readonly(fetchError),
    createLoading: readonly(createLoading),
    updateLoading: readonly(updateLoading),
    deleteLoading: readonly(deleteLoading),

    // Actions
    fetchAccounts,
    fetchAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    reset,
  }
}
