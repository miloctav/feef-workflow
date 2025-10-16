<template>
  <USlideover v-model:open="isOpen" :title="documentaryReview?.title || 'Document'" side="right" class="w-full max-w-4xl" close-icon="i-lucide-arrow-right">
    <!-- Header avec informations du document -->
    <template #header>
      <div class="flex flex-col space-y-3">
        <div class="flex items-start gap-12">
          <div class="flex-1 pr-16 max-w-2xl">
            <h2 class="text-lg font-semibold text-gray-900">
              {{ documentaryReview?.title || 'Document' }}
            </h2>
            <p class="text-sm text-gray-600 mt-1">
              {{ documentaryReview?.description }}
            </p>
          </div>

          <!-- Sélecteur de version et boutons d'action -->
          <div v-if="hasVersions" class="flex items-end gap-3 min-w-0 flex-shrink-0 ml-auto mr-4">
            <div class="flex flex-col gap-2">
              <label class="text-xs font-semibold text-gray-700 uppercase tracking-wide">Version du document</label>
              <USelect
                v-model="selectedVersionId"
                :items="versionSelectItems"
                size="sm"
                class="w-48"
                placeholder="Choisir une version"
                :disabled="fetchLoading"
                :ui="{
                  base: 'min-w-0 bg-white border-gray-300',
                  content: 'w-full'
                }"
              />
            </div>
            <div class="flex gap-2">
              <UButton
                @click="importNewVersion"
                color="secondary"
                variant="outline"
                icon="i-lucide-upload"
                label="Importer nouvelle version"
                size="sm"
                :loading="createLoading"
              />
              <UButton
                v-if="selectedVersionData?.key"
                :href="selectedVersionData.key"
                target="_blank"
                color="primary"
                variant="solid"
                icon="i-lucide-download"
                label="Télécharger"
                size="sm"
              />
            </div>
          </div>
        </div>

        <div v-if="hasVersions && selectedVersionData" class="flex flex-wrap gap-4 text-xs text-gray-500">
          <span>
            <UIcon name="i-lucide-calendar" class="w-3 h-3 mr-1" />
            Uploadé le {{ formatDate(selectedVersionData.uploadAt) }}
          </span>
          <span>
            <UIcon name="i-lucide-user" class="w-3 h-3 mr-1" />
            {{ selectedVersionData.uploadByAccount.firstname }} {{ selectedVersionData.uploadByAccount.lastname }}
          </span>
        </div>
      </div>
    </template>

    <!-- Corps avec affichage du PDF -->
    <template #body>
      <div class="flex flex-col h-full">
        <!-- État de chargement -->
        <div v-if="fetchLoading" class="flex-1 flex items-center justify-center bg-gray-50 rounded-lg">
          <div class="text-center">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin w-8 h-8 mx-auto mb-4 text-primary" />
            <p class="text-gray-600">Chargement des versions...</p>
          </div>
        </div>

        <!-- Document avec versions disponibles -->
        <div v-else-if="hasVersions && selectedVersionData?.key" class="flex-1 bg-gray-100 rounded-lg overflow-hidden relative">
          <!-- Barre d'outils PDF -->
          <div class="absolute top-0 left-0 right-0 bg-gray-800 text-white p-2 flex justify-between items-center z-10 text-sm">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-file-text" class="w-4 h-4" />
              <span class="font-medium">{{ documentaryReview?.title }}</span>
            </div>
            <div class="flex items-center gap-2">
              <UButton
                :href="selectedVersionData.key"
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
          <iframe
            :src="selectedVersionData.key + '#toolbar=1&navpanes=1&scrollbar=1&page=1&view=FitH'"
            class="w-full h-full border-0 pt-10"
            type="application/pdf"
            loading="lazy"
            title="Visualiseur PDF"
          >
          </iframe>
        </div>

        <!-- Aucune version disponible -->
        <div v-else class="flex-1 flex items-center justify-center bg-gray-50 rounded-lg">
          <div class="text-center p-8 max-w-md">
            <UIcon name="i-lucide-file-x" class="w-20 h-20 mx-auto mb-6 text-gray-400" />
            <h3 class="text-xl font-medium text-gray-900 mb-3">Aucune version disponible</h3>
            <p class="text-gray-600 mb-6 leading-relaxed">
              Ce document n'a pas encore été uploadé. Cliquez sur "Importer nouvelle version" pour ajouter la première version du document.
            </p>
            <UButton
              @click="importNewVersion"
              color="primary"
              variant="solid"
              icon="i-lucide-upload"
              label="Importer première version"
              :loading="createLoading"
            />
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import type { DocumentaryReview } from '~~/app/types/documentaryReviews'

interface Props {
  documentaryReview?: DocumentaryReview | null
  open?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  open: false
})

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value)
})

// Composable pour gérer les versions
const {
  documentVersions,
  fetchLoading,
  createLoading,
  fetchDocumentVersions,
  createDocumentVersion,
  reset,
} = useDocumentVersions()

// ID de la version sélectionnée
const selectedVersionId = ref<number | null>(null)

// Vérifier si des versions existent
const hasVersions = computed(() => documentVersions.value.length > 0)

// Préparer les items pour le select avec le format "v1 - 16/10/2025"
const versionSelectItems = computed(() => {
  return documentVersions.value.map((version, index) => ({
    label: `v${documentVersions.value.length - index} - ${formatDate(version.uploadAt)}${index === 0 ? ' (Actuelle)' : ''}`,
    value: version.id,
  }))
})

// Données de la version sélectionnée
const selectedVersionData = computed(() => {
  if (!selectedVersionId.value) return null
  return documentVersions.value.find(v => v.id === selectedVersionId.value) || null
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

// Fonction pour importer une nouvelle version
const importNewVersion = async () => {
  if (!props.documentaryReview) return

  const result = await createDocumentVersion({
    documentaryReviewId: props.documentaryReview.id,
  })

  if (result.success && result.data) {
    // Sélectionner automatiquement la nouvelle version (la plus récente)
    selectedVersionId.value = result.data.id
  }
}

const closeViewer = () => {
  isOpen.value = false
}

// Watcher pour charger les versions quand le viewer s'ouvre
watch(isOpen, async (newValue) => {
  if (newValue && props.documentaryReview) {
    // Toujours fetch les versions à l'ouverture
    await fetchDocumentVersions(props.documentaryReview.id)

    // Sélectionner la version la plus récente par défaut (première dans la liste)
    if (documentVersions.value.length > 0) {
      selectedVersionId.value = documentVersions.value[0].id
    }
  } else if (!newValue) {
    // Réinitialiser quand on ferme
    reset()
    selectedVersionId.value = null
  }
})

// Raccourci clavier pour fermer (Échap)
let keydownHandler: ((event: KeyboardEvent) => void) | null = null

watch(isOpen, (newValue) => {
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
}, { immediate: true })

// Nettoyage au démontage du composant
onUnmounted(() => {
  if (keydownHandler && typeof window !== 'undefined') {
    document.removeEventListener('keydown', keydownHandler)
  }
})
</script>
