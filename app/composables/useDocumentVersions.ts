import type {
  DocumentVersion,
  CreateDocumentVersionData,
} from '~~/app/types/documentVersions'

export const useDocumentVersions = () => {
  const toast = useToast()

  // State pour la liste des versions
  const documentVersions = useState<DocumentVersion[]>('documentVersions:list', () => [])

  // State pour une version individuelle
  const currentDocumentVersion = useState<DocumentVersion | null>('documentVersions:current', () => null)

  // États de chargement pour les opérations
  const fetchLoading = useState('documentVersions:fetchLoading', () => false)
  const createLoading = useState('documentVersions:createLoading', () => false)

  // Erreur de fetch
  const fetchError = useState<string | null>('documentVersions:fetchError', () => null)

  /**
   * Récupérer la liste des versions pour un documentaryReview
   */
  const fetchDocumentVersions = async (documentaryReviewId: number) => {
    fetchLoading.value = true
    fetchError.value = null

    try {
      const response = await $fetch<{ data: DocumentVersion[] }>('/api/documents-versions', {
        query: { documentaryReviewId },
      })

      documentVersions.value = response.data

      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la récupération des versions'

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
   * Créer une nouvelle version de document
   */
  const createDocumentVersion = async (data: CreateDocumentVersionData) => {
    createLoading.value = true

    try {
      const response = await $fetch<{ data: DocumentVersion }>('/api/documents-versions', {
        method: 'POST',
        body: data,
      })

      // Ajouter la nouvelle version au début de la liste (plus récente)
      documentVersions.value.unshift(response.data)

      toast.add({
        title: 'Succès',
        description: 'Version créée avec succès',
        color: 'success',
      })

      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la création de la version'

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
   * Rafraîchir la liste des versions
   */
  const refresh = async (documentaryReviewId: number) => {
    return await fetchDocumentVersions(documentaryReviewId)
  }

  /**
   * Réinitialiser le state
   */
  const reset = () => {
    documentVersions.value = []
    currentDocumentVersion.value = null
    fetchError.value = null
  }

  return {
    // Liste des versions (readonly)
    documentVersions: readonly(documentVersions),

    // Version individuelle
    currentDocumentVersion: readonly(currentDocumentVersion),

    // États de chargement
    fetchLoading: readonly(fetchLoading),
    fetchError: readonly(fetchError),
    createLoading: readonly(createLoading),

    // Actions
    fetchDocumentVersions,
    createDocumentVersion,
    refresh,
    reset,
  }
}
