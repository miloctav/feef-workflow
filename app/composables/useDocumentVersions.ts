import type {
  DocumentVersion,
  CreateDocumentVersionData,
} from '~~/app/types/documentVersions'
import type { AuditDocumentTypeType } from '~~/app/types/auditDocuments'

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
  const requestUpdateLoading = useState('documentVersions:requestUpdateLoading', () => false)

  // Erreur de fetch
  const fetchError = useState<string | null>('documentVersions:fetchError', () => null)

  /**
   * Récupérer la liste des versions pour un documentaryReview, contract ou audit
   */
  const fetchDocumentVersions = async (
    id: number,
    type: 'documentaryReview' | 'contract' | 'audit' = 'documentaryReview',
    auditDocumentType?: AuditDocumentTypeType
  ) => {
    fetchLoading.value = true
    fetchError.value = null

    try {
      let queryParam: Record<string, any> = {}

      if (type === 'documentaryReview') {
        queryParam = { documentaryReviewId: id }
      } else if (type === 'contract') {
        queryParam = { contractId: id }
      } else if (type === 'audit') {
        queryParam = { auditId: id }
        if (auditDocumentType) {
          queryParam.auditDocumentType = auditDocumentType
        }
      }

      const response = await $fetch<{ data: DocumentVersion[] }>('/api/documents-versions', {
        query: queryParam,
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
  const createDocumentVersion = async (
    id: number,
    file: File,
    type: 'documentaryReview' | 'contract' | 'audit' = 'documentaryReview',
    auditDocumentType?: AuditDocumentTypeType
  ) => {
    createLoading.value = true

    try {
      // Créer le FormData avec le fichier et les données
      const formData = new FormData()

      // Déterminer l'URL et les paramètres selon le type
      let apiUrl: string

      if (type === 'audit') {
        // Utiliser la route spécifique pour les audits
        apiUrl = `/api/audits/${id}/documents`
        if (auditDocumentType) {
          formData.append('auditDocumentType', auditDocumentType)
        }
      } else {
        // Utiliser la route générique pour documentaryReview et contract
        apiUrl = '/api/documents-versions'
        if (type === 'documentaryReview') {
          formData.append('documentaryReviewId', id.toString())
        } else if (type === 'contract') {
          formData.append('contractId', id.toString())
        }
      }

      formData.append('file', file)

      const response = await $fetch<{ data: DocumentVersion }>(apiUrl, {
        method: 'POST',
        body: formData,
      })

      // Rafraîchir la liste complète (car une demande existante a pu être mise à jour)
      if (type === 'audit') {
        await fetchDocumentVersions(id, type, auditDocumentType)
      } else {
        await fetchDocumentVersions(id, type)
      }

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

      // Télécharger via la route API proxy (pas de CORS)
      const link = document.createElement('a')
      link.href = `/api/documents-versions/${versionId}/download-file?filename=${encodeURIComponent(filename)}`
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

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
   * Demander une mise à jour de document (crée une version fantôme)
   */
  const requestDocumentUpdate = async (
    id: number,
    type: 'documentaryReview' | 'contract' = 'documentaryReview',
    comment?: string
  ) => {
    requestUpdateLoading.value = true

    try {
      const body = type === 'documentaryReview'
        ? { documentaryReviewId: id, comment }
        : { contractId: id, comment }

      const response = await $fetch<{ data: DocumentVersion }>('/api/documents-versions/request-update', {
        method: 'POST',
        body,
      })

      // Ajouter la demande au début de la liste
      documentVersions.value.unshift(response.data)

      toast.add({
        title: 'Succès',
        description: 'Demande de mise à jour créée',
        color: 'success',
      })

      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la création de la demande'

      toast.add({
        title: 'Erreur',
        description: errorMessage,
        color: 'error',
      })

      return { success: false, error: errorMessage }
    } finally {
      requestUpdateLoading.value = false
    }
  }

  /**
   * Annuler une demande de mise à jour (hard delete)
   */
  const cancelDocumentRequest = async (versionId: number) => {
    try {
      await $fetch(`/api/documents-versions/${versionId}/cancel-request`, {
        method: 'DELETE',
      })

      // Retirer la version de la liste
      documentVersions.value = documentVersions.value.filter(v => v.id !== versionId)

      toast.add({
        title: 'Succès',
        description: 'Demande annulée',
        color: 'success',
      })

      return { success: true }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de l\'annulation de la demande'

      toast.add({
        title: 'Erreur',
        description: errorMessage,
        color: 'error',
      })

      return { success: false, error: errorMessage }
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
    requestUpdateLoading: readonly(requestUpdateLoading),

    // Actions
    fetchDocumentVersions,
    createDocumentVersion,
    requestDocumentUpdate,
    cancelDocumentRequest,
    getVersionUrl,
    downloadVersion,
    refresh,
    reset,
  }
}
