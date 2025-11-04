import type {
  Contract,
  ContractWithRelations,
  CreateContractData,
  UpdateContractData,
} from '~~/app/types/contracts'

export const useContracts = () => {
  const toast = useToast()

  // State pour la liste des contrats
  const contracts = useState<ContractWithRelations[]>('contracts:list', () => [])

  // State pour un contrat individuel
  const currentContract = useState<ContractWithRelations | null>('contracts:current', () => null)

  // États de chargement pour les opérations CRUD
  const fetchLoading = useState('contracts:fetchLoading', () => false)
  const createLoading = useState('contracts:createLoading', () => false)
  const updateLoading = useState('contracts:updateLoading', () => false)

  // Erreur de fetch
  const fetchError = useState<string | null>('contracts:fetchError', () => null)

  /**
   * Récupérer la liste des contrats pour une entité
   * Pour les utilisateurs ENTITY, entityId est optionnel (utilise user.currentEntityId par défaut)
   */
  const fetchContracts = async (entityId?: number) => {
    fetchLoading.value = true
    fetchError.value = null

    try {
      // Construire les query params uniquement si entityId est fourni
      const queryParams = entityId ? { entityId } : {}

      const response = await $fetch<{ data: ContractWithRelations[] }>('/api/contracts', {
        query: queryParams,
      })

      contracts.value = response.data

      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la récupération des contrats'

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
   * Récupérer un contrat spécifique avec ses relations
   */
  const fetchContract = async (id: number) => {
    fetchLoading.value = true
    fetchError.value = null

    try {
      const response = await $fetch<{ data: ContractWithRelations }>(`/api/contracts/${id}`)

      currentContract.value = response.data

      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la récupération du contrat'

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
   * Créer un nouveau contrat
   */
  const createContract = async (data: CreateContractData) => {
    createLoading.value = true

    try {
      const response = await $fetch<{ data: Contract }>('/api/contracts', {
        method: 'POST',
        body: data,
      })

      // Ne pas recharger automatiquement ici (sera géré par le composant via événement)

      toast.add({
        title: 'Succès',
        description: 'Contrat créé avec succès',
        color: 'success',
      })

      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la création du contrat'

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
   * Mettre à jour un contrat
   */
  const updateContract = async (id: number, data: UpdateContractData) => {
    updateLoading.value = true

    try {
      const response = await $fetch<{ data: Contract }>(`/api/contracts/${id}`, {
        method: 'PUT',
        body: data,
      })

      // Mettre à jour le contrat dans la liste
      const index = contracts.value.findIndex(contract => contract.id === id)
      if (index !== -1) {
        // Conserver les relations existantes
        contracts.value[index] = {
          ...contracts.value[index],
          ...response.data,
        }
      }

      // Mettre à jour le contrat courant si c'est celui-ci
      if (currentContract.value?.id === id) {
        currentContract.value = {
          ...currentContract.value,
          ...response.data,
        }
      }

      toast.add({
        title: 'Succès',
        description: 'Contrat mis à jour avec succès',
        color: 'success',
      })

      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la mise à jour du contrat'

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
   * Rafraîchir la liste des contrats
   */
  const refresh = async (entityId?: number) => {
    return await fetchContracts(entityId)
  }

  /**
   * Réinitialiser le state
   */
  const reset = () => {
    contracts.value = []
    currentContract.value = null
    fetchError.value = null
  }

  return {
    // Liste des contrats (readonly)
    contracts: readonly(contracts),

    // Contrat individuel
    currentContract: readonly(currentContract),

    // États de chargement
    fetchLoading: readonly(fetchLoading),
    fetchError: readonly(fetchError),
    createLoading: readonly(createLoading),
    updateLoading: readonly(updateLoading),

    // Actions CRUD
    fetchContracts,
    fetchContract,
    createContract,
    updateContract,
    refresh,
    reset,
  }
}
