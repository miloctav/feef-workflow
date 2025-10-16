import type {
  DocumentaryReview,
  CreateDocumentaryReviewData,
  UpdateDocumentaryReviewData,
} from '~~/app/types/documentaryReviews'

export const useDocumentaryReviews = () => {
  const toast = useToast()

  // State pour la liste des documentary reviews
  const documentaryReviews = useState<DocumentaryReview[]>('documentaryReviews:list', () => [])

  // State pour un documentary review individuel
  const currentDocumentaryReview = useState<DocumentaryReview | null>('documentaryReviews:current', () => null)

  // États de chargement pour les opérations CRUD
  const fetchLoading = useState('documentaryReviews:fetchLoading', () => false)
  const createLoading = useState('documentaryReviews:createLoading', () => false)
  const updateLoading = useState('documentaryReviews:updateLoading', () => false)
  const deleteLoading = useState('documentaryReviews:deleteLoading', () => false)

  // Erreur de fetch
  const fetchError = useState<string | null>('documentaryReviews:fetchError', () => null)

  /**
   * Récupérer la liste des documentary reviews pour une entité
   */
  const fetchDocumentaryReviews = async (entityId: number) => {
    fetchLoading.value = true
    fetchError.value = null

    try {
      const response = await $fetch<{ data: DocumentaryReview[] }>('/api/documentary-reviews', {
        query: { entityId },
      })

      documentaryReviews.value = response.data

      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la récupération des documents'

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
   * Créer un nouveau documentary review
   */
  const createDocumentaryReview = async (data: CreateDocumentaryReviewData) => {
    createLoading.value = true

    try {
      const response = await $fetch<{ data: DocumentaryReview }>('/api/documentary-reviews', {
        method: 'POST',
        body: data,
      })

      // Ajouter le nouveau document à la liste
      documentaryReviews.value.push(response.data)

      toast.add({
        title: 'Succès',
        description: 'Document créé avec succès',
        color: 'success',
      })

      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la création du document'

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
   * Mettre à jour un documentary review
   */
  const updateDocumentaryReview = async (id: number, data: UpdateDocumentaryReviewData) => {
    updateLoading.value = true

    try {
      const response = await $fetch<{ data: DocumentaryReview }>(`/api/documentary-reviews/${id}`, {
        method: 'PUT',
        body: data,
      })

      // Mettre à jour le document dans la liste
      const index = documentaryReviews.value.findIndex(doc => doc.id === id)
      if (index !== -1) {
        documentaryReviews.value[index] = response.data
      }

      // Mettre à jour le document courant si c'est celui-ci
      if (currentDocumentaryReview.value?.id === id) {
        currentDocumentaryReview.value = response.data
      }

      toast.add({
        title: 'Succès',
        description: 'Document mis à jour avec succès',
        color: 'success',
      })

      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la mise à jour du document'

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
   * Supprimer un documentary review (soft delete)
   */
  const deleteDocumentaryReview = async (id: number) => {
    deleteLoading.value = true

    try {
      await $fetch(`/api/documentary-reviews/${id}`, {
        method: 'DELETE',
      })

      // Retirer le document de la liste
      documentaryReviews.value = documentaryReviews.value.filter(doc => doc.id !== id)

      // Nettoyer le document courant si c'est celui-ci
      if (currentDocumentaryReview.value?.id === id) {
        currentDocumentaryReview.value = null
      }

      toast.add({
        title: 'Succès',
        description: 'Document supprimé avec succès',
        color: 'success',
      })

      return { success: true }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la suppression du document'

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
   * Rafraîchir la liste des documentary reviews
   */
  const refresh = async (entityId: number) => {
    return await fetchDocumentaryReviews(entityId)
  }

  /**
   * Réinitialiser le state
   */
  const reset = () => {
    documentaryReviews.value = []
    currentDocumentaryReview.value = null
    fetchError.value = null
  }

  return {
    // Liste des documentary reviews (readonly)
    documentaryReviews: readonly(documentaryReviews),

    // Documentary review individuel
    currentDocumentaryReview: readonly(currentDocumentaryReview),

    // États de chargement
    fetchLoading: readonly(fetchLoading),
    fetchError: readonly(fetchError),
    createLoading: readonly(createLoading),
    updateLoading: readonly(updateLoading),
    deleteLoading: readonly(deleteLoading),

    // Actions CRUD
    fetchDocumentaryReviews,
    createDocumentaryReview,
    updateDocumentaryReview,
    deleteDocumentaryReview,
    refresh,
    reset,
  }
}
