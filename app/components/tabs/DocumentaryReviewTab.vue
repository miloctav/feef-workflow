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

          <template #trailing>
            <AddDocumentaryReviewModal
              v-if="props.role === 'feef' && currentEntity"
              :entity-id="currentEntity.id"
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
                        <div v-if="props.role === 'feef'" class="flex-shrink-0 flex gap-2">
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
import { en } from '@nuxt/ui/runtime/locale/index.js';

interface Props {
  role?: 'feef' | 'oe' | 'company'
}

const props = withDefaults(defineProps<Props>(), {
  role: 'feef'
})

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

function formatDate(date: Date | string): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
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
