<template>
  <USlideover
    v-model:open="isOpen"
    :title="documentTitle"
    side="right"
    class="w-full max-w-4xl"
    close-icon="i-lucide-arrow-right"
  >
    <!-- Header avec informations du document -->
    <template #header>
      <DocumentViewerHeader
        v-model="selectedVersionId"
        :document-title="documentTitle"
        :document-description="documentDescription"
        :has-versions="hasVersions"
        :selected-version-data="selectedVersionData"
        :current-signed-url="currentSignedUrl"
        :fetch-loading="fetchLoading"
        :can-upload-document="canUploadDocument"
        :create-loading="createLoading"
        :document-type="documentType"
        :documentary-review="documentaryReview"
        :contract="contract"
        :has-pending-request-for-document="hasPendingRequestForDocument"
        :version-select-items="versionSelectItems"
        @download="handleDownload"
        @trigger-file-input="triggerFileInput"
      />
    </template>

    <!-- Corps avec affichage du PDF -->
    <template #body>
      <div class="flex flex-col h-full">
        <!-- Input File caché (Global pour le composant) -->
        <input
          ref="fileInputRef"
          type="file"
          class="hidden"
          accept="*/*"
          @change="handleFileSelect"
        />

        <!-- État de chargement -->
        <DocumentViewerLoading v-if="fetchLoading" />

        <!-- Demande de mise à jour en attente -->
        <DocumentViewerPendingRequest
          v-else-if="hasVersions && isPendingRequest"
          :selected-version-data="selectedVersionData"
          :can-upload-document="canUploadDocument"
          :can-cancel-request="canCancelRequest"
          :create-loading="createLoading"
          @trigger-file-input="triggerFileInput"
          @cancel-request="handleCancelRequest"
        />

        <!-- Document avec versions disponibles -->
        <div
          v-else-if="hasVersions && selectedVersionData?.s3Key && currentSignedUrl"
          class="flex-1 bg-gray-100 rounded-lg overflow-hidden relative flex flex-col"
        >
          <!-- Barre d'outils avec icône contextuelle -->
          <div
            class="bg-gray-800 text-white p-2 flex justify-between items-center z-10 text-sm shrink-0"
          >
            <div class="flex items-center gap-2">
              <UIcon
                :name="getFileTypeIcon(selectedVersionData.mimeType)"
                class="w-4 h-4"
              />
              <span class="font-medium">{{ documentTitle }}</span>
            </div>
            <div class="flex items-center gap-2">
              <UBadge
                color="neutral"
                variant="soft"
                size="xs"
              >
                {{ getFileTypeLabel(selectedVersionData.mimeType) }}
              </UBadge>
            </div>
          </div>

          <!-- PDF Viewer -->
          <DocumentViewerPdf
            v-if="documentViewerType === DocumentViewerType.PDF"
            :current-signed-url="currentSignedUrl"
          />

          <!-- Image Viewer -->
          <DocumentViewerImage
            v-else-if="documentViewerType === DocumentViewerType.IMAGE"
            :current-signed-url="currentSignedUrl"
            :document-title="documentTitle"
            :selected-version-id="selectedVersionId"
          />

          <!-- Text Viewer -->
          <DocumentViewerText
            v-else-if="documentViewerType === DocumentViewerType.TEXT"
            :content="textContent"
            :loading="textLoading"
            :error="textError"
            :error-message="textErrorMessage"
            @retry="retryTextLoad"
          />

          <!-- Unsupported File Fallback -->
          <DocumentViewerUnsupported
            v-else
            :selected-version-data="selectedVersionData"
            :current-signed-url="currentSignedUrl"
            @download="handleDownload"
          />
        </div>

        <!-- Aucune version disponible -->
        <DocumentViewerEmpty
          v-else
          :can-upload-document="canUploadDocument"
          :create-loading="createLoading"
          @trigger-file-input="triggerFileInput"
        />
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import type { DocumentaryReview } from '~~/app/types/documentaryReviews'
import type { ContractWithRelations } from '~~/app/types/contracts'
import type { AuditWithRelations } from '~~/app/types/audits'
import type { AuditDocumentTypeType } from '~~/app/types/auditDocuments'
import { Role } from '#shared/types/roles'
import { AuditDocumentTypeLabels, AuditDocumentType } from '~~/app/types/auditDocuments'
import DocumentViewerHeader from './document-viewer/DocumentViewerHeader.vue'
import DocumentViewerLoading from './document-viewer/DocumentViewerLoading.vue'
import DocumentViewerPendingRequest from './document-viewer/DocumentViewerPendingRequest.vue'
import DocumentViewerEmpty from './document-viewer/DocumentViewerEmpty.vue'
import DocumentViewerPdf from './document-viewer/DocumentViewerPdf.vue'
import DocumentViewerImage from './document-viewer/DocumentViewerImage.vue'
import DocumentViewerText from './document-viewer/DocumentViewerText.vue'
import DocumentViewerUnsupported from './document-viewer/DocumentViewerUnsupported.vue'
import {
  getFileTypeIcon,
  getFileTypeLabel,
  isPreviewableImage,
  isPreviewableText,
} from '~~/app/utils/documentMimeTypes'

interface Props {
  documentaryReview?: DocumentaryReview | null
  contract?: ContractWithRelations | null
  audit?: AuditWithRelations | null
  auditDocumentType?: AuditDocumentTypeType
  open?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
})

// Types de viewers supportés
enum DocumentViewerType {
  PDF = 'pdf',
  IMAGE = 'image',
  TEXT = 'text',
  UNSUPPORTED = 'unsupported',
}

// Computed pour déterminer le type et récupérer les infos
const documentType = computed(() => {
  if (props.documentaryReview) return 'documentaryReview'
  if (props.contract) return 'contract'
  if (props.audit) return 'audit'
  return null
})

const documentData = computed(() => {
  if (props.documentaryReview) return props.documentaryReview
  if (props.contract) return props.contract
  if (props.audit) return props.audit
  return null
})

const documentTitle = computed(() => {
  // Pour les audits, générer un titre selon le type de document
  if (props.audit) {
    // Utiliser le type fourni en prop, sinon déduire de la première version
    const docType = props.auditDocumentType || documentVersions.value[0]?.auditDocumentType
    if (docType) {
      return (
        AuditDocumentTypeLabels[docType as keyof typeof AuditDocumentTypeLabels] ||
        "Document d'audit"
      )
    }
    return "Document d'audit"
  }

  // Pour les autres types (documentaryReview, contract)
  return (documentData.value as any)?.title || 'Document'
})

const documentDescription = computed(() => {
  // Pour les audits, générer une description contextuelle
  if (props.audit) {
    return `Audit ${props.audit.type} - ${props.audit.entity.name}`
  }

  // Pour les autres types
  return (documentData.value as any)?.description || ''
})

// Computed pour déterminer si l'utilisateur peut uploader selon le type de document
const canUploadDocument = computed(() => {
  if (!user.value?.role) return false

  const role = user.value.role

  // Permissions par type de document
  if (documentType.value === 'documentaryReview') {
    return role === Role.ENTITY || role === Role.FEEF
  }

  if (documentType.value === 'contract') {
    return role === Role.ENTITY || role === Role.FEEF || role === Role.OE
  }

  if (documentType.value === 'audit') {
    // Vérifier le type de document d'audit pour appliquer les bonnes permissions
    const docType = props.auditDocumentType

    if (
      docType === AuditDocumentType.SHORT_ACTION_PLAN ||
      docType === AuditDocumentType.LONG_ACTION_PLAN
    ) {
      // Plans d'action : seuls ENTITY ou FEEF peuvent uploader
      return role === Role.ENTITY || role === Role.FEEF
    } else if (docType === AuditDocumentType.ATTESTATION) {
      // Attestation : seulement FEEF
      return role === Role.FEEF
    } else {
      // PLAN, REPORT, OE_OPINION : OE, AUDITOR ou FEEF peuvent uploader
      return role === Role.OE || role === Role.AUDITOR || role === Role.FEEF
    }
  }

  return false
})

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

// Composable pour gérer les versions
const {
  documentVersions,
  fetchLoading,
  createLoading,
  fetchDocumentVersions,
  createDocumentVersion,
  cancelDocumentRequest,
  getVersionUrl,
  downloadVersion,
  reset,
} = useDocumentVersions()

// Session user pour vérifier les permissions
const { user } = useUserSession()

// Import du helper pour déclencher le rafraîchissement des actions
const { triggerActionRefresh } = useActionRefresh()

// Refs pour les inputs file
const fileInputRef = ref<HTMLInputElement | null>(null)

// États réactifs pour le viewer de texte
const textLoading = ref(false)
const textError = ref(false)
const textErrorMessage = ref('')
const textContent = ref('')

// ID de la version sélectionnée (undefined pour USelect)
const selectedVersionId = ref<number | undefined>(undefined)

// URL signée de la version sélectionnée
const currentSignedUrl = ref<string | null>(null)

// AbortController pour annuler les requêtes en cours
let urlFetchController: AbortController | null = null

// Vérifier si des versions existent
const hasVersions = computed(() => documentVersions.value.length > 0)

// Préparer les items pour le select avec le format "v1 - 16/10/2025"
const versionSelectItems = computed(() => {
  return documentVersions.value.map((version, index) => {
    const isPendingRequest = version.s3Key === null && version.askedBy !== null
    const versionLabel = `v${documentVersions.value.length - index} - ${formatDate(
      version.uploadAt
    )}`
    const statusLabel = isPendingRequest
      ? ' 🔔 Demande en attente'
      : index === 0 && !isPendingRequest
      ? ' (Actuelle)'
      : ''

    return {
      label: `${versionLabel}${statusLabel}`,
      value: version.id,
    }
  })
})

// Données de la version sélectionnée
const selectedVersionData = computed(() => {
  if (selectedVersionId.value === undefined) return null
  return documentVersions.value.find((v) => v.id === selectedVersionId.value) || null
})

// Vérifier si la version sélectionnée est une demande en attente
const isPendingRequest = computed(() => {
  return selectedVersionData.value?.s3Key === null && selectedVersionData.value?.askedBy !== null
})

// Vérifier si l'utilisateur peut annuler la demande (seulement celui qui a demandé)
const canCancelRequest = computed(() => {
  return isPendingRequest.value && selectedVersionData.value?.askedBy === user.value?.id
})

// Vérifier si le document a une demande en attente (pour masquer le bouton "Demander MAJ")
const hasPendingRequestForDocument = computed(() => {
  return documentVersions.value.some(
    (version) => version.s3Key === null && version.askedBy !== null
  )
})

// Computed property pour déterminer le type de viewer à utiliser
const documentViewerType = computed<DocumentViewerType>(() => {
  const mimeType = selectedVersionData.value?.mimeType
  if (!mimeType) return DocumentViewerType.UNSUPPORTED

  if (mimeType === 'application/pdf') return DocumentViewerType.PDF
  if (isPreviewableImage(mimeType)) return DocumentViewerType.IMAGE
  if (isPreviewableText(mimeType)) return DocumentViewerType.TEXT

  return DocumentViewerType.UNSUPPORTED
})

// Fonction pour formater une date
function formatDate(date: Date | string): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Trigger l'input file (header)
const triggerFileInput = () => {
  fileInputRef.value?.click()
}

// Gérer la sélection d'un fichier
const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file || !documentData.value || !documentType.value) return

  const result = await createDocumentVersion(
    documentData.value.id,
    file,
    documentType.value,
    props.auditDocumentType
  )

  if (result.success && result.data) {
    // Sélectionner automatiquement la nouvelle version (la plus récente)
    selectedVersionId.value = result.data.id

    // Déclencher le rafraîchissement des actions
    if (props.audit) {
      triggerActionRefresh({
        auditId: props.audit.id.toString(),
        entityId: props.audit.entityId.toString(),
      })
    } else if (props.documentaryReview) {
      triggerActionRefresh({
        entityId: props.documentaryReview.entityId.toString(),
      })
    } else if (props.contract) {
      triggerActionRefresh({
        entityId: props.contract.entityId.toString(),
      })
    }
  }

  // Réinitialiser l'input pour permettre de réuploader le même fichier
  input.value = ''
}

// Gérer le téléchargement du document
const handleDownload = () => {
  if (!selectedVersionData.value || !documentData.value || selectedVersionId.value === undefined)
    return

  // Calculer le numéro de version (inverse de l'index)
  const versionIndex = documentVersions.value.findIndex((v) => v.id === selectedVersionId.value)
  const versionNumber = documentVersions.value.length - versionIndex

  downloadVersion(
    selectedVersionId.value,
    documentTitle.value,
    versionNumber,
    selectedVersionData.value.uploadAt,
    selectedVersionData.value.mimeType
  )
}

// Annuler une demande de mise à jour
const handleCancelRequest = async () => {
  if (!selectedVersionId.value) return

  const result = await cancelDocumentRequest(selectedVersionId.value)

  if (result.success) {
    // Réinitialiser la sélection
    selectedVersionId.value = documentVersions.value[0]?.id
  }
}

// Fonctions pour le viewer de texte
async function loadTextContent(versionId: number) {
  textLoading.value = true
  textError.value = false
  textErrorMessage.value = ''

  try {
    const response = await $fetch<{ data: { content: string; size: number } }>(
      `/api/documents-versions/${versionId}/text-content`
    )

    textContent.value = response.data.content
  } catch (error: any) {
    textError.value = true
    textErrorMessage.value = error.data?.message || error.message || 'Erreur lors du chargement'
  } finally {
    textLoading.value = false
  }
}

function retryTextLoad() {
  if (selectedVersionId.value) {
    loadTextContent(selectedVersionId.value)
  }
}

// Watcher pour charger l'URL signée quand la version sélectionnée change
watch(selectedVersionId, async (newVersionId) => {
  // Reset états des viewers
  textContent.value = ''
  textError.value = false

  // IMPORTANT : Reset l'URL signée pour forcer le loading state
  currentSignedUrl.value = null

  // Annuler toute requête en cours
  if (urlFetchController) {
    urlFetchController.abort()
    urlFetchController = null
  }

  // Ne rien faire si le viewer est fermé
  if (!isOpen.value) {
    return
  }

  if (newVersionId && selectedVersionData.value?.s3Key) {
    // Créer un nouveau AbortController pour cette requête
    urlFetchController = new AbortController()

    try {
      currentSignedUrl.value = await getVersionUrl(newVersionId, urlFetchController.signal)
    } catch (error) {
      // Ignorer les erreurs d'annulation
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
      // Les autres erreurs sont gérées par le composable
      currentSignedUrl.value = null
    } finally {
      urlFetchController = null
    }
  } else {
    currentSignedUrl.value = null
  }
})

// Watcher pour charger le contenu texte si nécessaire
watch([selectedVersionId, documentViewerType], ([versionId, type]) => {
  if (versionId && type === DocumentViewerType.TEXT) {
    loadTextContent(versionId)
  }
})

const closeViewer = () => {
  isOpen.value = false
}

// Watcher pour charger les versions quand le viewer s'ouvre
watch(isOpen, async (newValue) => {
  if (newValue && documentData.value && documentType.value) {
    // Réinitialiser avant de charger
    reset()
    selectedVersionId.value = undefined
    currentSignedUrl.value = null

    // Toujours fetch les versions à l'ouverture avec le bon type
    if (documentType.value === 'audit' && props.auditDocumentType) {
      // Pour les audits, passer aussi le type de document
      await fetchDocumentVersions(
        documentData.value.id,
        documentType.value,
        props.auditDocumentType
      )
    } else {
      await fetchDocumentVersions(documentData.value.id, documentType.value as any)
    }

    // Sélectionner la version la plus récente par défaut (première dans la liste)
    // Uniquement si le viewer est toujours ouvert (évite les race conditions)
    if (isOpen.value && documentVersions.value.length > 0) {
      selectedVersionId.value = documentVersions.value[0]?.id
    }
  } else if (!newValue) {
    // Annuler toute requête en cours
    if (urlFetchController) {
      urlFetchController.abort()
      urlFetchController = null
    }

    // Réinitialiser quand on ferme
    reset()
    selectedVersionId.value = undefined
    currentSignedUrl.value = null
  }
})

// Raccourci clavier pour fermer (Échap)
let keydownHandler: ((event: KeyboardEvent) => void) | null = null

watch(
  isOpen,
  (newValue) => {
    if (newValue && typeof window !== 'undefined') {
      keydownHandler = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          closeViewer()
        }
      }
      document.addEventListener('keydown', keydownHandler)
    } else if (!newValue && keydownHandler && typeof window !== 'undefined') {
      document.removeEventListener('keydown', keydownHandler)
      keydownHandler = null
    }
  },
  { immediate: true }
)

// Nettoyage au démontage du composant
onUnmounted(() => {
  if (keydownHandler && typeof window !== 'undefined') {
    document.removeEventListener('keydown', keydownHandler)
  }

  // Annuler toute requête en cours
  if (urlFetchController) {
    urlFetchController.abort()
    urlFetchController = null
  }
})
</script>
