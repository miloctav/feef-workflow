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
        <AddDocumentaryReviewModal
          v-if="user?.role === Role.FEEF && currentEntity"
          :entity-id="currentEntity.id"
        />
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

      <UCard v-for="category in accordionItems" :key="category.value" class="overflow-hidden">
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
                        <div v-if="user?.role === Role.FEEF" class="flex-shrink-0 flex gap-2">
                          <UButton
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
import type { DocumentaryReview, DocumentCategoryType } from '~~/app/types/documentaryReviews'
import { DocumentCategoryLabels, DocumentCategoryIcons, DocumentCategoryColors } from '~~/app/types/documentaryReviews'
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

// Charger les documents au montage
onMounted(async () => {
  if (currentEntity.value) {
    await fetchDocumentaryReviews(currentEntity.value.id)
  }
})

// Vérifier si l'utilisateur peut voir le statut de la revue documentaire (OE ou FEEF)
const showDocumentaryReviewStatus = computed(() => {
  return user.value?.role === Role.FEEF || user.value?.role === Role.OE
})

// Organiser les documents par catégorie
const documentsByCategory = computed(() => {
  const categories: Record<DocumentCategoryType, DocumentaryReview[]> = {
    LEGAL: [],
    FINANCIAL: [],
    TECHNICAL: [],
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
    title: DocumentCategoryLabels[categoryKey as keyof typeof DocumentCategoryLabels],
    icon: DocumentCategoryIcons[categoryKey as keyof typeof DocumentCategoryIcons],
    iconColor: getCategoryIconColor(categoryKey),
    badgeColor: DocumentCategoryColors[categoryKey as keyof typeof DocumentCategoryColors],
    value: categoryKey,
    documents: documents,
  }))
})

// Fonctions utilitaires
function getCategoryIconColor(categoryKey: string): string {
  const colors: Record<string, string> = {
    LEGAL: 'text-blue-500',
    FINANCIAL: 'text-green-500',
    TECHNICAL: 'text-orange-500',
    OTHER: 'text-gray-500',
  }
  return colors[categoryKey] || 'text-gray-500'
}

function getCategoryBackgroundClass(color: string): string {
  const colorMap: Record<string, string> = {
    'primary': 'bg-blue-100',
    'success': 'bg-green-100',
    'warning': 'bg-orange-100',
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
</script>
