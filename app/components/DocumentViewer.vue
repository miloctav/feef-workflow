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
      <div class="flex flex-col space-y-3">
        <div class="flex items-start gap-12">
          <div class="flex-1 pr-16 max-w-2xl">
            <h2 class="text-lg font-semibold text-gray-900">
              {{ documentTitle }}
            </h2>
            <p class="text-sm text-gray-600 mt-1">
              {{ documentDescription }}
            </p>
          </div>

          <!-- Sélecteur de version et boutons d'action -->
          <div
            v-if="hasVersions"
            class="flex items-end gap-3 min-w-0 flex-shrink-0 ml-auto mr-4"
          >
            <div class="flex flex-col gap-2">
              <label class="text-xs font-semibold text-gray-700 uppercase tracking-wide"
                >Version du document</label
              >
              <USelect
                v-model="selectedVersionId"
                :items="versionSelectItems"
                size="sm"
                class="w-48"
                placeholder="Choisir une version"
                :disabled="fetchLoading"
                :ui="{
                  base: 'min-w-0 bg-white border-gray-300',
                  content: 'w-full',
                }"
              />
            </div>
            <div class="flex gap-2">
              <input
                v-if="canUploadDocument"
                ref="fileInputRef"
                type="file"
                class="hidden"
                accept="*/*"
                @change="handleFileSelect"
              />
              <DocumentRequestUpdateModal
                v-if="
                  (user?.role === Role.FEEF || user?.role === Role.OE) &&
                  !hasPendingRequestForDocument
                "
                :documentary-review-id="documentaryReview?.id"
                :contract-id="contract?.id"
                :document-title="documentTitle"
                button-label="Demander MAJ"
              />
              <UButton
                v-if="canUploadDocument"
                @click="triggerFileInput"
                color="secondary"
                variant="outline"
                icon="i-lucide-upload"
                label="Importer nouvelle version"
                size="sm"
                :loading="createLoading"
                :disabled="createLoading"
              />
              <UButton
                v-if="selectedVersionData?.s3Key && currentSignedUrl"
                @click="handleDownload"
                color="secondary"
                variant="solid"
                icon="i-lucide-download"
                label="Télécharger"
                size="sm"
              />
              <UButton
                v-if="selectedVersionData?.s3Key && currentSignedUrl"
                :href="currentSignedUrl"
                target="_blank"
                color="primary"
                variant="solid"
                icon="i-lucide-external-link"
                label="Ouvrir"
                size="sm"
              />
            </div>
          </div>
        </div>

        <div
          v-if="hasVersions && selectedVersionData"
          class="flex flex-wrap gap-4 text-xs text-gray-500"
        >
          <span>
            <UIcon
              name="i-lucide-calendar"
              class="w-3 h-3 mr-1"
            />
            Uploadé le {{ formatDate(selectedVersionData.uploadAt) }}
          </span>
          <span>
            <UIcon
              name="i-lucide-user"
              class="w-3 h-3 mr-1"
            />
            {{ selectedVersionData.uploadByAccount.firstname }}
            {{ selectedVersionData.uploadByAccount.lastname }}
          </span>
        </div>
      </div>
    </template>

    <!-- Corps avec affichage du PDF -->
    <template #body>
      <div class="flex flex-col h-full">
        <!-- État de chargement -->
        <div
          v-if="fetchLoading"
          class="flex-1 flex items-center justify-center bg-gray-50 rounded-lg"
        >
          <div class="text-center">
            <UIcon
              name="i-heroicons-arrow-path"
              class="animate-spin w-8 h-8 mx-auto mb-4 text-primary"
            />
            <p class="text-gray-600">Chargement des versions...</p>
          </div>
        </div>

        <!-- Demande de mise à jour en attente -->
        <div
          v-else-if="hasVersions && isPendingRequest"
          class="flex-1 flex items-center justify-center bg-gray-50 rounded-lg"
        >
          <div class="text-center p-8 max-w-md">
            <UIcon
              name="i-lucide-alert-circle"
              class="w-16 h-16 mx-auto mb-4 text-orange-500"
            />
            <h3 class="text-lg font-semibold text-gray-900 mb-2">
              Demande de mise à jour en attente
            </h3>

            <div
              v-if="selectedVersionData?.askedByAccount"
              class="mb-4 text-sm text-gray-600"
            >
              <p class="mb-2">
                Demandée par
                <span class="font-medium"
                  >{{ selectedVersionData.askedByAccount.firstname }}
                  {{ selectedVersionData.askedByAccount.lastname }}</span
                >
              </p>
              <p class="text-xs text-gray-500">Le {{ formatDate(selectedVersionData.uploadAt) }}</p>
            </div>

            <div
              v-if="selectedVersionData?.comment"
              class="bg-white rounded-lg p-4 mb-6 text-left border border-gray-200"
            >
              <p class="text-xs font-semibold text-gray-700 mb-2">Commentaire :</p>
              <p class="text-sm text-gray-800 whitespace-pre-wrap">
                {{ selectedVersionData.comment }}
              </p>
            </div>

            <p class="text-gray-600 mb-6">
              Ce document est en attente de mise à jour. L'entité doit uploader une nouvelle version
              pour répondre à cette demande.
            </p>

            <div class="flex flex-col gap-3">
              <!-- Bouton pour ENTITY : Upload le document demandé -->
              <UButton
                v-if="canUploadDocument"
                @click="triggerFileInput"
                color="primary"
                variant="solid"
                icon="i-lucide-upload"
                label="Importer le document mis à jour"
                size="lg"
                :loading="createLoading"
                :disabled="createLoading"
              />

              <!-- Bouton pour annuler (celui qui a demandé) -->
              <UButton
                v-if="canCancelRequest"
                @click="handleCancelRequest"
                color="error"
                variant="outline"
                icon="i-lucide-x"
                label="Annuler cette demande"
              />
            </div>
          </div>
        </div>

        <!-- Document avec versions disponibles -->
        <div
          v-else-if="hasVersions && selectedVersionData?.s3Key && currentSignedUrl"
          class="flex-1 bg-gray-100 rounded-lg overflow-hidden relative flex flex-col"
        >
          <!-- Barre d'outils PDF -->
          <div
            class="bg-gray-800 text-white p-2 flex justify-between items-center z-10 text-sm shrink-0"
          >
            <div class="flex items-center gap-2">
              <UIcon
                name="i-lucide-file-text"
                class="w-4 h-4"
              />
              <span class="font-medium">{{ documentTitle }}</span>
            </div>
            <div class="flex items-center gap-2">
              <UButton
                :href="currentSignedUrl"
                target="_blank"
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-external-link"
                label="Ouvrir dans un nouvel onglet"
              />
            </div>
          </div>

          <!-- Viewer PDF intégré -->
          <div class="flex-1 relative">
            <iframe
              :key="currentSignedUrl"
              :src="currentSignedUrl + '#toolbar=1&navpanes=1&scrollbar=1&page=1&view=FitH'"
              class="w-full h-full border-0 absolute inset-0"
              type="application/pdf"
              loading="lazy"
              title="Visualiseur PDF"
            >
            </iframe>
          </div>
        </div>

        <!-- Aucune version disponible -->
        <div
          v-else
          class="flex-1 flex items-center justify-center bg-gray-50 rounded-lg"
        >
          <div class="text-center p-8 max-w-md">
            <UIcon
              name="i-lucide-file-x"
              class="w-20 h-20 mx-auto mb-6 text-gray-400"
            />
            <h3 class="text-xl font-medium text-gray-900 mb-3">Aucune version disponible</h3>
            <p class="text-gray-600 mb-6 leading-relaxed">
              Ce document n'a pas encore été uploadé. Cliquez sur "Importer première version" pour
              ajouter la première version du document.
            </p>
            <input
              v-if="canUploadDocument"
              ref="fileInputEmptyRef"
              type="file"
              class="hidden"
              accept="*/*"
              @change="handleFileSelect"
            />
            <UButton
              v-if="canUploadDocument"
              @click="triggerFileInputEmpty"
              color="primary"
              variant="solid"
              icon="i-lucide-upload"
              label="Importer première version"
              :loading="createLoading"
              :disabled="createLoading"
            />
          </div>
        </div>
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

    if (docType === AuditDocumentType.CORRECTIVE_PLAN) {
      // Plan correctif : seuls ENTITY ou FEEF peuvent uploader
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
  requestUpdateLoading,
  fetchDocumentVersions,
  createDocumentVersion,
  requestDocumentUpdate,
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
const fileInputEmptyRef = ref<HTMLInputElement | null>(null)

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

// Trigger l'input file (empty state)
const triggerFileInputEmpty = () => {
  fileInputEmptyRef.value?.click()
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
    // L'upload d'un document peut créer/compléter des actions
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

// Watcher pour charger l'URL signée quand la version sélectionnée change
watch(selectedVersionId, async (newVersionId) => {
  // Annuler toute requête en cours
  if (urlFetchController) {
    urlFetchController.abort()
    urlFetchController = null
  }

  // Ne rien faire si le viewer est fermé
  if (!isOpen.value) {
    currentSignedUrl.value = null
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
