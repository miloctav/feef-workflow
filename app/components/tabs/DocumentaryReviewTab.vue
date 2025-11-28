<template>
  <div class="space-y-6">
    <!-- Loading state -->
    <div v-if="fetchLoading" class="flex items-center justify-center p-8">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-primary w-6 h-6" />
      <span class="ml-2">Chargement des documents...</span>
    </div>

    <!-- Error state -->
    <div v-else-if="fetchError" class="flex items-center justify-center p-8">
      <UAlert
        color="error"
        variant="soft"
        title="Erreur"
        :description="fetchError"
      />
    </div>

    <!-- Documents organisés par catégorie -->
    <div v-else class="space-y-4">
      <!-- Header avec bouton d'ajout global -->
      <div class="flex items-center justify-between pb-2">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Revue documentaire</h2>
          <p class="text-sm text-gray-600 mt-1">Gérez les documents de l'entité</p>
        </div>
        <div class="flex items-center gap-2">
          <!-- Bouton télécharger tout -->
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

          <!-- Bouton ajouter document -->
          <AddDocumentaryReviewModal
            v-if="user?.role === Role.FEEF && currentEntity"
            :entity-id="currentEntity.id"
          />
        </div>
      </div>

      <!-- Info sur la revue documentaire prête (visible uniquement pour OE et FEEF) -->
      <div
        v-if="showDocumentaryReviewStatus && currentEntity?.documentaryReviewReadyAt"
        class="p-4 bg-green-50 rounded-lg border border-green-200"
      >
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-check-circle" class="w-6 h-6 text-green-600 flex-shrink-0" />
          <div class="flex-1">
            <h5 class="font-medium text-green-800 mb-1">Revue documentaire validée par l'entité</h5>
            <p class="text-sm text-green-700">
              Marquée comme prête le {{ formatDate(currentEntity.documentaryReviewReadyAt, true) }}
              <span v-if="currentEntity.documentaryReviewReadyByAccount">
                par {{ currentEntity.documentaryReviewReadyByAccount.firstname }} {{ currentEntity.documentaryReviewReadyByAccount.lastname }}
              </span>
            </p>
          </div>
          <UBadge color="success" variant="solid" size="lg">
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

      <UCard v-if="canViewDocuments" v-for="category in accordionItems" :key="category.value" class="overflow-hidden">
        <UAccordion
          type="single"
          :items="[category]"
          :default-value="[category.value]"
        >
          <template #leading="{ item }">
            <div class="flex items-center gap-4">
              <div class="p-3 rounded-lg" :class="getCategoryBackgroundClass(item.badgeColor)">
                <UIcon :name="item.icon" class="w-6 h-6" :class="item.iconColor" />
              </div>
              <div>
                <h3 class="font-bold text-lg text-gray-900">{{ item.title }}</h3>
                <p class="text-sm text-gray-600 mt-0.5">
                  {{ item.documents.length }} document{{ item.documents.length > 1 ? 's' : '' }}
                </p>
              </div>
            </div>
          </template>

          <template #trailing="{ item }">
            <AddDocumentaryReviewModal
              v-if="user?.role === Role.FEEF && currentEntity"
              :entity-id="currentEntity.id"
              :category="item.value"
            />
          </template>

          <template #content="{ item }">
            <!-- Liste des documents -->
            <div class="px-6 pb-6 pt-4">
              <div v-if="item.documents.length === 0" class="text-center py-8 text-gray-500">
                <UIcon name="i-lucide-inbox" class="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Aucun document dans cette catégorie</p>
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="document in item.documents"
                  :key="document.id"
                  class="p-4 rounded-lg border-2 transition-all duration-200 group border-gray-200 hover:border-blue-400 hover:shadow-lg bg-white cursor-pointer"
                  @click="openDocumentViewer(document)"
                >
                  <div class="flex items-start gap-4">
                    <!-- Icône du document -->
                    <div class="flex-shrink-0">
                      <div class="p-3 rounded-lg bg-blue-50">
                        <UIcon
                          name="i-lucide-file-text"
                          class="w-6 h-6 text-blue-500"
                        />
                      </div>
                    </div>

                    <!-- Informations du document -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-start justify-between gap-4">
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2">
                            <h4 class="font-semibold text-base text-gray-900 group-hover:text-blue-900">
                              {{ document.title }}
                            </h4>
                            <UBadge
                              v-if="hasPendingRequest(document.id)"
                              color="warning"
                              variant="soft"
                              size="sm"
                              class="flex items-center gap-1"
                            >
                              <UIcon name="i-lucide-alert-circle" class="w-3 h-3" />
                              Demande en attente
                            </UBadge>
                            <UIcon name="i-lucide-eye" class="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                          </div>
                          <p v-if="document.description" class="text-sm text-gray-600 mt-1.5">
                            {{ document.description }}
                          </p>

                          <!-- Métadonnées -->
                          <div class="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
                            <span class="flex items-center gap-1.5">
                              <UIcon name="i-lucide-calendar" class="w-3.5 h-3.5" />
                              Créé le {{ formatDate(document.createdAt) }}
                            </span>
                            <span v-if="document.updatedAt && document.updatedAt !== document.createdAt" class="flex items-center gap-1.5">
                              <UIcon name="i-lucide-refresh-cw" class="w-3.5 h-3.5" />
                              Modifié le {{ formatDate(document.updatedAt) }}
                            </span>
                          </div>
                        </div>

                        <!-- Actions -->
                        <div class="flex-shrink-0 flex gap-2">
                          <!-- Bouton demande de mise à jour (FEEF ou OE, seulement si pas de demande en attente) -->
                          <DocumentRequestUpdateModal
                            v-if="(user?.role === Role.FEEF || user?.role === Role.OE) && !hasPendingRequest(document.id)"
                            :documentary-review-id="document.id"
                            :document-title="document.title"
                            button-label="Demander MAJ"
                            button-size="sm"
                            @update-requested="handleUpdateRequested(document.id)"
                            @click.stop
                          />

                          <!-- Bouton supprimer (FEEF seulement) -->
                          <UButton
                            v-if="user?.role === Role.FEEF"
                            color="error"
                            size="sm"
                            icon="i-lucide-trash-2"
                            variant="soft"
                            :loading="deleteLoading"
                            @click.stop="handleDelete(document)"
                          >
                            Supprimer
                          </UButton>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </UAccordion>
      </UCard>
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
import {
  DocumentaryReviewCategoryLabels,
  DocumentaryReviewCategoryIcons,
  DocumentaryReviewCategoryColors
} from '#shared/types/enums'
import AddDocumentaryReviewModal from '~/components/modals/AddDocumentaryReviewModal.vue'

const { user } = useAuth()

// Récupérer l'entité courante depuis le composable
const { currentEntity } = useEntities()

const {
  documentaryReviews,
  fetchLoading,
  fetchError,
  deleteLoading,
  fetchDocumentaryReviews,
  deleteDocumentaryReview,
} = useDocumentaryReviews()

const { toggleDocumentsAccess, toggleDocumentsAccessLoading } = useEntities()

// État pour tracker les documents avec demandes en attente
const documentsWithPendingRequests = ref<Set<number>>(new Set())

// État de chargement pour le téléchargement groupé
const downloadAllLoading = ref(false)

// Fonction pour vérifier si un document a une demande en attente
async function checkPendingRequest(documentId: number) {
  try {
    const response = await $fetch<{ data: any[] }>('/api/documents-versions', {
      query: { documentaryReviewId: documentId },
    })

    const hasPending = response.data.some(version =>
      version.s3Key === null && version.askedBy !== null
    )

    if (hasPending) {
      documentsWithPendingRequests.value.add(documentId)
    } else {
      documentsWithPendingRequests.value.delete(documentId)
    }
  } catch (error) {
    // Ignorer les erreurs silencieusement
  }
}

// Charger les documents au montage et vérifier les demandes
onMounted(async () => {
  if (currentEntity.value) {
    await fetchDocumentaryReviews(currentEntity.value.id)

    // Vérifier les demandes en attente pour tous les documents (en parallèle)
    const checks = documentaryReviews.value.map(doc => checkPendingRequest(doc.id))
    await Promise.all(checks)
  }
})

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

// Afficher le bouton pour activer le partage (uniquement pour ENTITY)
const showEnableAccessButton = computed(() => {
  return (
    user.value?.role === Role.ENTITY &&
    currentEntity.value?.oeId &&
    !currentEntity.value?.allowOeDocumentsAccess
  )
})

// Organiser les documents par catégorie
const documentsByCategory = computed(() => {
  const categories: Record<DocumentaryReviewCategoryType, DocumentaryReview[]> = {
    CANDIDACY: [],
    AUDIT: [],
    OTHER: [],
  }

  documentaryReviews.value.forEach(doc => {
    categories[doc.category].push(doc)
  })

  return categories
})

// Préparer les items pour l'accordion
const accordionItems = computed(() => {
  return Object.entries(documentsByCategory.value).map(([categoryKey, documents]) => ({
    title: DocumentaryReviewCategoryLabels[categoryKey as keyof typeof DocumentaryReviewCategoryLabels],
    icon: DocumentaryReviewCategoryIcons[categoryKey as keyof typeof DocumentaryReviewCategoryIcons],
    iconColor: getCategoryIconColor(categoryKey),
    badgeColor: DocumentaryReviewCategoryColors[categoryKey as keyof typeof DocumentaryReviewCategoryColors],
    value: categoryKey,
    documents: documents,
  }))
})

// Fonctions utilitaires
function getCategoryIconColor(categoryKey: string): string {
  const colors: Record<string, string> = {
    CANDIDACY: 'text-blue-500',
    AUDIT: 'text-green-500',
    OTHER: 'text-gray-500',
  }
  return colors[categoryKey] || 'text-gray-500'
}

function getCategoryBackgroundClass(color: string): string {
  const colorMap: Record<string, string> = {
    'primary': 'bg-blue-100',
    'success': 'bg-green-100',
    'neutral': 'bg-gray-100',
  }
  return colorMap[color] || 'bg-gray-100'
}

function formatDate(date: Date | string, includeTime: boolean = false): string {
  if (!date) return ''
  const d = new Date(date)

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }

  if (includeTime) {
    options.hour = '2-digit'
    options.minute = '2-digit'
  }

  return d.toLocaleDateString('fr-FR', options)
}

async function handleDelete(document: DocumentaryReview) {
  const confirmed = confirm(`Êtes-vous sûr de vouloir supprimer le document "${document.title}" ?`)

  if (confirmed) {
    await deleteDocumentaryReview(document.id)
  }
}

// Gestion du DocumentViewer
const isViewerOpen = ref(false)
const selectedDocument = ref<DocumentaryReview | null>(null)

function openDocumentViewer(document: DocumentaryReview) {
  selectedDocument.value = document
  isViewerOpen.value = true
}

// Rafraîchir les demandes après qu'une demande a été créée
async function handleUpdateRequested(documentId: number) {
  await checkPendingRequest(documentId)
}

// Vérifier si un document a une demande en attente
function hasPendingRequest(documentId: number): boolean {
  return documentsWithPendingRequests.value.has(documentId)
}

// Gérer l'activation de l'accès aux documents pour l'OE
async function handleEnableAccess() {
  if (!currentEntity.value?.id) {
    return
  }

  const result = await toggleDocumentsAccess(currentEntity.value.id)

  if (result.success) {
    // L'entité a déjà été mise à jour par le composable
  }
}

// Fonction pour télécharger tous les documents
async function handleDownloadAll() {
  if (!currentEntity.value?.id) return

  downloadAllLoading.value = true

  try {
    // Formater la date pour le nom de fichier
    const date = new Date()
    const formattedDate = date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).replace(/\//g, '-')

    const entityName = currentEntity.value.name.replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `Revue_documentaire_${entityName}_${formattedDate}.zip`

    // Télécharger via la route API
    const link = document.createElement('a')
    link.href = `/api/entities/${currentEntity.value.id}/documentary-reviews/download-all`
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Toast de succès
    const toast = useToast()
    toast.add({
      title: 'Succès',
      description: 'Téléchargement de l\'archive démarré',
      color: 'success',
    })
  } catch (error: any) {
    const toast = useToast()
    toast.add({
      title: 'Erreur',
      description: error.message || 'Erreur lors du téléchargement de l\'archive',
      color: 'error',
    })
  } finally {
    downloadAllLoading.value = false
  }
}
</script>
