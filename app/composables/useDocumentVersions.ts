import type {
  DocumentVersion,
  CreateDocumentVersionData,
} from '~~/app/types/documentVersions'

/**
 * Obtenir l'extension du fichier à partir du type MIME
 */
function getExtensionFromMimeType(mimeType: string | null | undefined): string {
  if (!mimeType) return 'pdf'

  const mimeToExt: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'application/zip': 'zip',
  }

  return mimeToExt[mimeType] || 'pdf'
}

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
   * Créer une nouvelle version de document avec upload de fichier
   */
  const createDocumentVersion = async (documentaryReviewId: number, file: File) => {
    createLoading.value = true

    try {
      // Créer le FormData avec le fichier et les données
      const formData = new FormData()
      formData.append('documentaryReviewId', documentaryReviewId.toString())
      formData.append('file', file)

      const response = await $fetch<{ data: DocumentVersion }>('/api/documents-versions', {
        method: 'POST',
        body: formData,
      })

      // Ajouter la nouvelle version au début de la liste (plus récente)
      documentVersions.value.unshift(response.data)

      toast.add({
        title: 'Succès',
        description: 'Fichier uploadé avec succès',
        color: 'success',
      })

      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de l\'upload du fichier'

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
   * Récupérer l'URL signée d'une version pour affichage/téléchargement
   */
  const getVersionUrl = async (versionId: number, signal?: AbortSignal): Promise<string | null> => {
    try {
      const response = await $fetch<{ data: { url: string } }>(`/api/documents-versions/${versionId}/download`, {
        signal,
      })
      return response.data.url
    } catch (e: any) {
      // Ne pas afficher de toast pour les erreurs d'annulation
      if (e.name === 'AbortError') {
        return null
      }

      const errorMessage = e.data?.message || e.message || 'Erreur lors de la récupération du fichier'

      toast.add({
        title: 'Erreur',
        description: errorMessage,
        color: 'error',
      })

      return null
    }
  }

  /**
   * Télécharger une version de document directement
   * Le nom du fichier est construit automatiquement : "{titre} - v{version} - {date}.{ext}"
   */
  const downloadVersion = async (
    versionId: number,
    documentTitle: string,
    versionNumber: number,
    uploadDate: Date | string,
    mimeType: string | null | undefined
  ): Promise<void> => {
    try {
      // Récupérer l'URL signée
      const url = await getVersionUrl(versionId)

      if (!url) {
        throw new Error('Impossible de récupérer l\'URL du fichier')
      }

      // Formater la date
      const date = new Date(uploadDate)
      const formattedDate = date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).replace(/\//g, '-')

      // Construire le nom du fichier
      const extension = getExtensionFromMimeType(mimeType)
      const filename = `${documentTitle} - v${versionNumber} - ${formattedDate}.${extension}`

      // Télécharger via fetch et créer un blob
      const response = await fetch(url)
      const blob = await response.blob()

      // Créer un lien temporaire et le cliquer pour télécharger
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)

      toast.add({
        title: 'Succès',
        description: 'Téléchargement démarré',
        color: 'success',
      })
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors du téléchargement du fichier'

      toast.add({
        title: 'Erreur',
        description: errorMessage,
        color: 'error',
      })
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
    getVersionUrl,
    downloadVersion,
    refresh,
    reset,
  }
}
