<template>
  <UModal title="Ajouter un document" :ui="{ footer: 'justify-end' }">
    <UButton icon="i-lucide-plus" size="sm" color="primary" variant="soft">
      Ajouter
    </UButton>

    <template #body>
      <div class="space-y-6">
        <!-- Choix du mode de création -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Mode de création
          </label>
          <div class="grid grid-cols-2 gap-4">
            <button type="button" class="p-4 border-2 rounded-lg transition-all"
              :class="creationMode === 'manual' ? 'border-primary bg-primary-50' : 'border-gray-200 hover:border-gray-300'"
              @click="creationMode = 'manual'">
              <UIcon name="i-lucide-pen" class="w-6 h-6 mx-auto mb-2"
                :class="creationMode === 'manual' ? 'text-primary' : 'text-gray-400'" />
              <div class="text-sm font-medium">Création manuelle</div>
            </button>
            <button type="button" class="p-4 border-2 rounded-lg transition-all"
              :class="creationMode === 'template' ? 'border-primary bg-primary-50' : 'border-gray-200 hover:border-gray-300'"
              @click="creationMode = 'template'">
              <UIcon name="i-lucide-file-text" class="w-6 h-6 mx-auto mb-2"
                :class="creationMode === 'template' ? 'text-primary' : 'text-gray-400'" />
              <div class="text-sm font-medium">Depuis un modèle</div>
            </button>
          </div>
        </div>

        <!-- Formulaire création manuelle -->
        <div v-if="creationMode === 'manual'" class="space-y-4">
          <UFormField label="Titre" required>
            <UInput v-model="form.title" placeholder="Titre du document" />
          </UFormField>

          <UFormField label="Description">
            <UTextarea v-model="form.description" placeholder="Description du document" :rows="3" />
          </UFormField>

          <UFormField label="Catégorie" required>
            <USelect v-model="form.category" :items="categoryOptions" placeholder="Sélectionner une catégorie" :disabled="!!props.category" />
          </UFormField>
        </div>

        <!-- Sélection de template -->
        <div v-else class="space-y-4">
          <UFormField label="Type de document" required>
            <USelectMenu v-model="form.documentTypeId" :items="documentTypeOptions"
              placeholder="Sélectionner un type de document" :loading="documentTypesLoading" value-key="value" />
          </UFormField>

          <!-- Aperçu du template sélectionné -->
          <div v-if="selectedDocumentType" class="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div class="flex items-start gap-3">
              <UIcon :name="getCategoryIcon(selectedDocumentType.category)" class="w-5 h-5 text-primary mt-0.5" />
              <div class="flex-1 min-w-0">
                <h4 class="font-medium text-gray-900">{{ selectedDocumentType.title }}</h4>
                <p v-if="selectedDocumentType.description" class="text-sm text-gray-600 mt-1">
                  {{ selectedDocumentType.description }}
                </p>
                <div class="flex items-center gap-2 mt-2">
                  <UBadge :color="getCategoryColor(selectedDocumentType.category)" variant="soft" size="xs">
                    {{ getCategoryLabel(selectedDocumentType.category) }}
                  </UBadge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer="{ close }">
      <UButton label="Annuler" color="neutral" variant="outline" @click="close" />
      <UButton label="Créer le document" color="primary" :loading="createLoading" :disabled="!isFormValid" @click="handleSubmit(close)" />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { CreateDocumentaryReviewData } from '~~/app/types/documentaryReviews'
import { DocumentCategoryLabels, DocumentCategoryIcons, DocumentCategoryColors } from '~~/app/types/documentaryReviews'

interface Props {
  entityId: number
  category?: 'LEGAL' | 'FINANCIAL' | 'TECHNICAL' | 'OTHER'
}

const props = defineProps<Props>()

const { createDocumentaryReview, createLoading, fetchDocumentaryReviews } = useDocumentaryReviews()
const { fetchAllDocumentsType } = useDocumentsType()

// Mode de création : 'manual' ou 'template'
const creationMode = ref<'manual' | 'template'>('manual')

// Formulaire
const form = reactive<{
  title: string
  description: string
  category: 'LEGAL' | 'FINANCIAL' | 'TECHNICAL' | 'OTHER' | ''
  documentTypeId: number | null
}>({
  title: '',
  description: '',
  category: props.category || '',
  documentTypeId: null,
})

// Options pour les catégories
const categoryOptions = [
  { label: 'Juridique', value: 'LEGAL' },
  { label: 'Financier', value: 'FINANCIAL' },
  { label: 'Technique', value: 'TECHNICAL' },
  { label: 'Autre', value: 'OTHER' },
]

// Charger les types de documents disponibles
const documentTypesLoading = ref(false)
const documentTypes = ref<Array<{ id: number, title: string, description: string | null, category: string }>>([])

const documentTypeOptions = computed(() => {
  return documentTypes.value.map(dt => ({
    label: dt.title,
    value: dt.id,
  }))
})

const selectedDocumentType = computed(() => {
  if (!form.documentTypeId) return null
  return documentTypes.value.find(dt => dt.id === form.documentTypeId)
})

// Charger les document types au montage
onMounted(async () => {
  documentTypesLoading.value = true
  // Filtrer par catégorie si une catégorie est imposée
  const filters = props.category ? { category: props.category } : undefined
  const result = await fetchAllDocumentsType(filters)
  if (result.success) {
    documentTypes.value = result.data
  }
  documentTypesLoading.value = false
})

// Validation du formulaire
const isFormValid = computed(() => {
  if (creationMode.value === 'manual') {
    return form.title.trim() !== '' && form.category !== ''
  } else {
    return form.documentTypeId !== null
  }
})

// Soumettre le formulaire
const handleSubmit = async (close: () => void) => {
  const data: CreateDocumentaryReviewData = {
    entityId: props.entityId,
  }

  if (creationMode.value === 'manual') {
    data.title = form.title
    data.description = form.description || undefined
    data.category = form.category as 'LEGAL' | 'FINANCIAL' | 'TECHNICAL' | 'OTHER'
  } else {
    data.documentTypeId = form.documentTypeId!
  }

  const result = await createDocumentaryReview(data)

  if (result.success) {
    // Rafraîchir la liste
    await fetchDocumentaryReviews(props.entityId)

    // Réinitialiser le formulaire
    resetForm()

    // Fermer le modal
    close()
  }
}

// Réinitialiser le formulaire
const resetForm = () => {
  form.title = ''
  form.description = ''
  form.category = props.category || ''
  form.documentTypeId = null
  creationMode.value = 'manual'
}

// Utilitaires pour les catégories
const getCategoryLabel = (category: string) => {
  return DocumentCategoryLabels[category as keyof typeof DocumentCategoryLabels] || category
}

const getCategoryIcon = (category: string) => {
  return DocumentCategoryIcons[category as keyof typeof DocumentCategoryIcons] || 'i-lucide-folder'
}

const getCategoryColor = (category: string) => {
  return DocumentCategoryColors[category as keyof typeof DocumentCategoryColors] || 'neutral'
}
</script>
