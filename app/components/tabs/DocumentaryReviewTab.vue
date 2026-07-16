<template>
  <div class="space-y-6">
    <!-- Loading state -->
    <div
      v-if="fetchLoading"
      class="flex items-center justify-center p-8"
    >
      <UIcon
        name="i-heroicons-arrow-path"
        class="animate-spin text-primary w-6 h-6"
      />
      <span class="ml-2">Chargement des documents...</span>
    </div>

    <!-- Error state -->
    <div
      v-else-if="fetchError"
      class="flex items-center justify-center p-8"
    >
      <UAlert
        color="error"
        variant="soft"
        title="Erreur"
        :description="fetchError"
      />
    </div>

    <div
      v-else
      class="space-y-4"
    >
      <!-- Header avec bouton d'ajout global -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Revue documentaire</h2>
          <p class="text-sm text-gray-600 mt-0.5">Gérez les documents de l'entité</p>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            v-if="canViewDocuments && documentaryReviews.length > 0"
            color="primary"
            variant="outline"
            icon="i-lucide-download"
            :loading="downloadAllLoading"
            @click="handleDownloadAll"
          >
            Télécharger tout
          </UButton>

          <AddDocumentaryReviewModal
            v-if="canCreateDocuments && currentEntity"
            :entity-id="currentEntity.id"
            button-label="Ajouter un document"
            button-size="md"
            button-variant="solid"
          />
        </div>
      </div>

      <!-- Info sur la revue documentaire prête (visible uniquement pour OE et FEEF) -->
      <div
        v-if="showDocumentaryReviewStatus && currentEntity?.documentaryReviewReadyAt"
        class="p-4 bg-green-50 rounded-lg border border-green-200"
      >
        <div class="flex items-center gap-3">
          <UIcon
            name="i-lucide-check-circle"
            class="w-6 h-6 text-green-600 flex-shrink-0"
          />
          <div class="flex-1">
            <h5 class="font-medium text-green-800 mb-1">Revue documentaire validée par l'entité</h5>
            <p class="text-sm text-green-700">
              Marquée comme prête le {{ formatDateTime(currentEntity.documentaryReviewReadyAt) }}
              <span v-if="currentEntity.documentaryReviewReadyByAccount">
                par {{ currentEntity.documentaryReviewReadyByAccount.firstname }}
                {{ currentEntity.documentaryReviewReadyByAccount.lastname }}
              </span>
            </p>
          </div>
          <UBadge
            color="success"
            variant="solid"
            size="lg"
          >
            Validée
          </UBadge>
        </div>
      </div>

      <!-- Bouton pour activer l'accès aux documents (visible uniquement pour ENTITY si OE assigné et accès désactivé) -->
      <UAlert
        v-if="showEnableAccessButton"
        color="warning"
        variant="soft"
        title="Accès aux documents désactivé"
        description="Votre OE n'a pas encore accès à vos documents. Activez le partage pour permettre à l'OE de consulter votre revue documentaire."
      >
        <template #actions>
          <UButton
            color="warning"
            variant="solid"
            icon="i-lucide-unlock"
            :loading="toggleDocumentsAccessLoading"
            @click="handleEnableAccess"
          >
            Autoriser l'accès
          </UButton>
        </template>
      </UAlert>

      <!-- Message pour OE sans accès -->
      <UAlert
        v-if="user?.role === Role.OE && !canViewDocuments"
        color="info"
        variant="soft"
        title="Accès aux documents non autorisé"
        description="L'entité n'a pas encore autorisé l'accès à sa revue documentaire. Veuillez contacter l'entité pour demander l'accès."
        icon="i-lucide-lock"
      />

      <template v-if="canViewDocuments">
        <!-- Recherche et filtres -->
        <div class="flex flex-col sm:flex-row gap-2">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Rechercher un document..."
            class="flex-1"
            :ui="{ trailing: 'pe-1' }"
          >
            <template
              v-if="search"
              #trailing
            >
              <UButton
                color="neutral"
                variant="link"
                size="sm"
                icon="i-lucide-x"
                aria-label="Effacer la recherche"
                @click="search = ''"
              />
            </template>
          </UInput>

          <USelect
            v-model="statusFilter"
            :items="statusFilterItems"
            class="sm:w-64"
          />
        </div>

        <!-- Aucun résultat pour la recherche -->
        <div
          v-if="filteredSections.length === 0"
          class="rounded-lg border border-dashed border-gray-200 px-4 py-12 text-center"
        >
          <UIcon
            name="i-lucide-search-x"
            class="w-8 h-8 mx-auto mb-2 text-gray-300"
          />
          <p class="text-sm text-gray-500">Aucun document ne correspond à votre recherche</p>
        </div>

        <div
          v-else
          class="space-y-3"
        >
          <DocumentaryReviewSection
            v-for="section in filteredSections"
            :key="section.value"
            :title="section.title"
            :icon="section.icon"
            :icon-color="section.iconColor"
            :documents="section.documents"
            :pending-count="section.pendingCount"
            :access-label="section.accessLabel"
            :can-drop="section.canWrite && canCreateDocuments"
            :empty-label="
              hasActiveFilter
                ? 'Aucun document ne correspond à votre recherche'
                : 'Aucun document dans cette catégorie'
            "
            @drop="importFiles(section.value, $event)"
          >
            <template #actions>
              <!-- Progression de l'import groupé, à la place des actions de la section -->
              <span
                v-if="importState?.category === section.value"
                class="flex items-center gap-1.5 text-xs font-medium text-primary-700 pr-1"
              >
                <UIcon
                  name="i-lucide-loader-circle"
                  class="w-3.5 h-3.5 animate-spin"
                />
                Import {{ importState.done }}/{{ importState.total }}
              </span>

              <ImportFilesButton
                v-else-if="
                  section.value === DocumentaryReviewCategory.PAST_AUDIT_REPORT &&
                  section.canWrite &&
                  canCreateDocuments &&
                  currentEntity
                "
                label="Importer des rapports"
                @select="importFiles(section.value, $event)"
              />
              <AddDocumentaryReviewModal
                v-else-if="section.canWrite && canCreateDocuments && currentEntity"
                :entity-id="currentEntity.id"
                :category="section.value as DocumentaryReviewCategoryType"
                button-label="Ajouter"
                button-size="xs"
                button-variant="soft"
              />
            </template>

            <DocumentaryReviewRow
              v-for="document in section.documents"
              :key="document.id"
              :document="document"
              :can-delete="user?.role === Role.FEEF"
              :can-request-update="canRequestUpdate(document)"
              :can-upload="section.canWrite && canCreateDocuments"
              :delete-loading="deleteLoading"
              :uploading="uploadingDocumentId === document.id"
              @open="openDocumentViewer"
              @delete="handleDelete"
              @upload="handleUploadVersion"
              @update-requested="refreshDocuments"
            />
          </DocumentaryReviewSection>
        </div>
      </template>
    </div>

    <!-- Document Viewer -->
    <DocumentViewer
      v-model:open="isViewerOpen"
      :documentary-review="selectedDocument"
    />
  </div>
</template>

<script setup lang="ts">
import type { DocumentaryReview } from '~~/app/types/documentaryReviews'
import type { DocumentaryReviewCategoryType } from '#shared/types/enums'
import type { DocumentaryReviewStatusType } from '~~/app/utils/documentaryReviewStatus'
import {
  DocumentaryReviewStatus,
  DocumentaryReviewStatusMeta,
  getDocumentaryReviewStatus,
} from '~~/app/utils/documentaryReviewStatus'
import { formatDateTime } from '~~/app/utils/dates'
import {
  DocumentaryReviewCategory,
  DocumentaryReviewCategoryLabels,
  DocumentaryReviewCategoryIcons,
  DocumentaryReviewCategoryAccess,
  RoleLabels,
  canAccessDocumentaryReviewCategory,
  canWriteDocumentaryReviewCategory,
} from '#shared/types/enums'
import AddDocumentaryReviewModal from '~/components/modals/AddDocumentaryReviewModal.vue'

const toast = useToast()
const { user } = useAuth()

// Récupérer l'entité courante depuis le composable
const { currentEntity } = useEntities()

const {
  documentaryReviews,
  fetchLoading,
  fetchError,
  deleteLoading,
  fetchDocumentaryReviews,
  createDocumentaryReview,
  deleteDocumentaryReview,
} = useDocumentaryReviews()

const { createDocumentVersion } = useDocumentVersions()
const { toggleDocumentsAccess, toggleDocumentsAccessLoading } = useEntities()

// État de chargement pour le téléchargement groupé
const downloadAllLoading = ref(false)

// Document en cours d'upload (glisser-déposer ou sélecteur de fichier)
const uploadingDocumentId = ref<number | null>(null)

// Import groupé en cours : catégorie ciblée et progression, pour n'en autoriser qu'un à la fois
const importState = ref<{
  category: DocumentaryReviewCategoryType
  done: number
  total: number
} | null>(null)

// Recherche et filtre de statut
const search = ref('')
const statusFilter = ref<'ALL' | DocumentaryReviewStatusType>('ALL')

const statusFilterItems = [
  { label: 'Tous les statuts', value: 'ALL' },
  ...Object.entries(DocumentaryReviewStatusMeta).map(([value, meta]) => ({
    label: meta.label,
    value,
    icon: meta.icon,
  })),
]

const hasActiveFilter = computed(() => search.value.trim() !== '' || statusFilter.value !== 'ALL')

// Vérifier si l'utilisateur peut voir le statut de la revue documentaire (OE ou FEEF)
const showDocumentaryReviewStatus = computed(() => {
  return user.value?.role === Role.FEEF || user.value?.role === Role.OE
})

// Vérifier si l'utilisateur peut voir les documents
const canViewDocuments = computed(() => {
  if (user.value?.role === Role.OE) {
    return currentEntity.value?.allowOeDocumentsAccess === true
  }
  // FEEF et ENTITY peuvent toujours voir
  return true
})

// Seuls FEEF et ENTITY peuvent créer des documents et déposer des fichiers
const canCreateDocuments = computed(() => {
  return user.value?.role === Role.FEEF || user.value?.role === Role.ENTITY
})

// Afficher le bouton pour activer le partage (uniquement pour ENTITY)
const showEnableAccessButton = computed(() => {
  return (
    user.value?.role === Role.ENTITY &&
    currentEntity.value?.oeId &&
    !currentEntity.value?.allowOeDocumentsAccess
  )
})

const CategoryIconColors: Record<string, string> = {
  CANDIDACY: 'text-blue-500',
  AUDIT: 'text-green-500',
  OTHER: 'text-gray-500',
  CORRECTIVE_ACTION_PROOF: 'text-orange-500',
  PAST_AUDIT_REPORT: 'text-sky-500',
}

// Documents filtrés par la recherche et le statut
const filteredDocuments = computed(() => {
  const term = search.value.trim().toLowerCase()

  return documentaryReviews.value.filter((document) => {
    if (statusFilter.value !== 'ALL' && getDocumentaryReviewStatus(document) !== statusFilter.value) {
      return false
    }

    if (!term) return true

    return (
      document.title.toLowerCase().includes(term) ||
      (document.description?.toLowerCase().includes(term) ?? false)
    )
  })
})

// Catégories accessibles à l'utilisateur, dans l'ordre de l'énumération
const visibleCategories = computed(() => {
  return Object.values(DocumentaryReviewCategory).filter((category) => {
    if (user.value?.role && !canAccessDocumentaryReviewCategory(user.value.role, category)) {
      return false
    }

    // Les rapports d'audit passés ne concernent pas toutes les entités : la section
    // reste masquée tant qu'elle est vide, sauf pour la FEEF qui doit pouvoir importer
    if (category === DocumentaryReviewCategory.PAST_AUDIT_REPORT) {
      const hasDocuments = documentaryReviews.value.some((doc) => doc.category === category)
      return hasDocuments || user.value?.role === Role.FEEF
    }

    return true
  })
})

// Sections affichées : une par catégorie, masquée si un filtre est actif et ne remonte rien
const filteredSections = computed(() => {
  return visibleCategories.value
    .map((category) => {
      const documents = filteredDocuments.value.filter((doc) => doc.category === category)

      return {
        value: category,
        title: DocumentaryReviewCategoryLabels[category],
        icon: DocumentaryReviewCategoryIcons[category],
        iconColor: CategoryIconColors[category] ?? 'text-gray-500',
        documents,
        pendingCount: documents.filter(
          (doc) => getDocumentaryReviewStatus(doc) === DocumentaryReviewStatus.PENDING_REQUEST
        ).length,
        accessLabel: DocumentaryReviewCategoryAccess[category]
          .map((role) => RoleLabels[role])
          .join(', '),
        canWrite: user.value?.role
          ? canWriteDocumentaryReviewCategory(user.value.role, category)
          : false,
      }
    })
    .filter((section) => !hasActiveFilter.value || section.documents.length > 0)
})

async function refreshDocuments() {
  if (currentEntity.value) {
    await fetchDocumentaryReviews(currentEntity.value.id)
  }
}

async function handleDelete(document: DocumentaryReview) {
  const confirmed = confirm(`Êtes-vous sûr de vouloir supprimer le document "${document.title}" ?`)

  if (confirmed) {
    await deleteDocumentaryReview(document.id)
  }
}

// Déposer un fichier sur une ligne ajoute une version au document existant
async function handleUploadVersion(document: DocumentaryReview, file: File) {
  uploadingDocumentId.value = document.id

  try {
    const result = await createDocumentVersion(document.id, file, 'documentaryReview')

    if (result.success) {
      await refreshDocuments()
    }
  } finally {
    uploadingDocumentId.value = null
  }
}

// Le titre du document reprend le nom du fichier, sans son extension.
// Le fichier lui-même conserve son nom d'origine.
function buildDocumentTitle(filename: string): string {
  const withoutExtension = filename.replace(/\.[^.]+$/, '').trim()
  return (withoutExtension || filename).slice(0, 255)
}

// Un fichier = un document créé puis alimenté par sa première version
async function importFile(category: DocumentaryReviewCategoryType, file: File) {
  const created = await createDocumentaryReview(
    {
      entityId: currentEntity.value!.id,
      title: buildDocumentTitle(file.name),
      category,
    },
    { silent: true }
  )

  if (!created.success || !created.data) {
    throw new Error(created.error ?? 'Erreur lors de la création du document')
  }

  uploadingDocumentId.value = created.data.id

  try {
    const uploaded = await createDocumentVersion(created.data.id, file, 'documentaryReview', undefined, {
      silent: true,
      refreshVersions: false,
    })

    if (!uploaded.success) {
      // L'upload a échoué : ne pas laisser un document sans fichier
      await deleteDocumentaryReview(created.data.id, { silent: true })
      throw new Error(uploaded.error ?? "Erreur lors de l'upload du fichier")
    }
  } finally {
    uploadingDocumentId.value = null
  }
}

// Déposer ou sélectionner des fichiers sur une section crée un document par fichier
async function importFiles(category: DocumentaryReviewCategoryType, files: File[]) {
  if (!currentEntity.value || files.length === 0 || importState.value) return

  importState.value = { category, done: 0, total: files.length }

  const failures: string[] = []

  // Import séquentiel : l'ordre des documents créés suit celui des fichiers
  for (const file of files) {
    try {
      await importFile(category, file)
    } catch {
      failures.push(file.name)
    }

    importState.value.done++
  }

  const succeeded = files.length - failures.length

  importState.value = null

  await refreshDocuments()

  if (succeeded > 0) {
    toast.add({
      title: 'Import terminé',
      description: `${succeeded} document${succeeded > 1 ? 's' : ''} ajouté${succeeded > 1 ? 's' : ''} dans « ${DocumentaryReviewCategoryLabels[category]} »`,
      color: 'success',
    })
  }

  if (failures.length > 0) {
    toast.add({
      title: 'Import incomplet',
      description: `${failures.length} fichier${failures.length > 1 ? 's' : ''} non importé${failures.length > 1 ? 's' : ''} : ${formatFailureList(failures)}`,
      color: 'error',
    })
  }
}

// Lister les fichiers en échec sans noyer le toast quand il y en a beaucoup
function formatFailureList(filenames: string[]): string {
  const shown = filenames.slice(0, 3).join(', ')
  const remaining = filenames.length - 3

  return remaining > 0 ? `${shown} et ${remaining} autre${remaining > 1 ? 's' : ''}` : shown
}

// Gestion du DocumentViewer
const isViewerOpen = ref(false)
const selectedDocument = ref<DocumentaryReview | null>(null)

function openDocumentViewer(document: DocumentaryReview) {
  selectedDocument.value = document
  isViewerOpen.value = true
}

// Le viewer permet de déposer des versions : rafraîchir les statuts à sa fermeture
watch(isViewerOpen, (open) => {
  if (!open) refreshDocuments()
})

// Une demande de mise à jour n'a pas de sens sur une catégorie en lecture seule
function canRequestUpdate(document: DocumentaryReview): boolean {
  if (user.value?.role !== Role.FEEF && user.value?.role !== Role.OE) return false
  return canWriteDocumentaryReviewCategory(user.value.role, document.category)
}

// Gérer l'activation de l'accès aux documents pour l'OE
async function handleEnableAccess() {
  if (!currentEntity.value?.id) {
    return
  }

  await toggleDocumentsAccess(currentEntity.value.id)
}

// Fonction pour télécharger tous les documents
async function handleDownloadAll() {
  if (!currentEntity.value?.id) return

  downloadAllLoading.value = true

  try {
    // Formater la date pour le nom de fichier
    const date = new Date()
    const formattedDate = date
      .toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
      .replace(/\//g, '-')

    const entityName = currentEntity.value.name.replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `Revue_documentaire_${entityName}_${formattedDate}.zip`

    // Télécharger via la route API
    const link = document.createElement('a')
    link.href = `/api/entities/${currentEntity.value.id}/documentary-reviews/download-all`
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.add({
      title: 'Succès',
      description: "Téléchargement de l'archive démarré",
      color: 'success',
    })
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || "Erreur lors du téléchargement de l'archive",
      color: 'error',
    })
  } finally {
    downloadAllLoading.value = false
  }
}
</script>
