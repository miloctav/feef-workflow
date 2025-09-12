<template>
  <USlideover v-model:open="isOpen" :title="document?.name || 'Document'" side="right" class="w-full max-w-4xl" close-icon="i-lucide-arrow-right">
    <!-- Header avec informations du document -->
    <template #header>
      <div class="flex flex-col space-y-3">
        <div class="flex items-start gap-12">
          <div class="flex-1 pr-16 max-w-2xl">
            <h2 class="text-lg font-semibold text-gray-900">
              {{ document?.name || 'Document' }}
            </h2>
            <p class="text-sm text-gray-600 mt-1">
              {{ document?.description }}
            </p>
          </div>
          
          <!-- Sélecteur de version et boutons d'action -->
          <div v-if="document?.isAvailable" class="flex items-end gap-3 min-w-0 flex-shrink-0 ml-auto mr-4">
            <div class="flex flex-col gap-2">
              <label class="text-xs font-semibold text-gray-700 uppercase tracking-wide">Version du document</label>
              <USelect 
                v-model="selectedVersion" 
                :items="documentVersions" 
                size="sm"
                class="w-48"
                placeholder="Choisir une version"
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
              />
              <UButton 
                :href="pdfUrl" 
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
        
        <div v-if="document?.isAvailable" class="flex flex-wrap gap-4 text-xs text-gray-500">
          <span v-if="document.dateUpload">
            <UIcon name="i-lucide-calendar" class="w-3 h-3 mr-1" />
            Uploadé le {{ document.dateUpload }}
          </span>
          <span v-if="document.uploadedBy">
            <UIcon name="i-lucide-user" class="w-3 h-3 mr-1" />
            {{ document.uploadedBy }}
          </span>
          <span v-if="document.fileSize">
            <UIcon name="i-lucide-file" class="w-3 h-3 mr-1" />
            {{ document.fileSize }}
          </span>
          <span v-if="document.fileType">
            <UIcon name="i-lucide-file-type" class="w-3 h-3 mr-1" />
            {{ document.fileType }}
          </span>
        </div>
      </div>
    </template>

    <!-- Corps avec affichage du PDF -->
    <template #body>
      <div class="flex flex-col h-full">
        <div v-if="document?.isAvailable" class="flex-1 bg-gray-100 rounded-lg overflow-hidden relative">
          <!-- Barre d'outils PDF -->
          <div class="absolute top-0 left-0 right-0 bg-gray-800 text-white p-2 flex justify-between items-center z-10 text-sm">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-file-text" class="w-4 h-4" />
              <span class="font-medium">{{ document.name }}</span>
            </div>
            <div class="flex items-center gap-2">
              <UButton 
                :href="pdfUrl" 
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
            :src="pdfUrl + '#toolbar=1&navpanes=1&scrollbar=1&page=1&view=FitH'"
            class="w-full h-full border-0 pt-10"
            type="application/pdf"
            loading="lazy"
            title="Visualiseur PDF"
          >
          </iframe>
        </div>
        
        <div v-else class="flex-1 flex items-center justify-center bg-gray-50 rounded-lg">
          <div class="text-center p-8 max-w-md">
            <UIcon name="i-lucide-file-x" class="w-20 h-20 mx-auto mb-6 text-gray-400" />
            <h3 class="text-xl font-medium text-gray-900 mb-3">Document non disponible</h3>
            <p class="text-gray-600 mb-6 leading-relaxed">
              Ce document n'a pas encore été uploadé par l'entreprise ou n'est pas encore disponible à cette étape du processus.
            </p>
            <div v-if="document?.dateLimiteDepot" class="inline-flex items-center px-4 py-2 rounded-lg text-sm bg-orange-50 text-orange-800 border border-orange-200">
              <UIcon name="i-lucide-calendar-clock" class="w-4 h-4 mr-2" />
              <span class="font-medium">Date limite de dépôt : {{ document.dateLimiteDepot }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import type { Documents } from '~/utils/data'

interface Props {
  document?: Documents
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

// Gestion des versions du document
const selectedVersion = ref(3) // Version 3 par défaut

const documentVersions = computed(() => [
  { 
    label: 'Version 1 - 15/07/2025', 
    value: 1 
  },
  { 
    label: 'Version 2 - 22/08/2025', 
    value: 2 
  },
  { 
    label: 'Version 3 - 05/09/2025 (Actuelle)', 
    value: 3 
  }
])

// URL du PDF basée sur la version sélectionnée
const pdfUrl = computed(() => {
  return `/file-pdf-test-${selectedVersion.value}.pdf`
})

// Fonction factice pour importer une nouvelle version
const importNewVersion = () => {
  console.log('Importation d\'une nouvelle version du document:', props.document?.name)
  // TODO: Implémenter la logique d'importation d'une nouvelle version
  // Ici on pourrait ouvrir un modal de téléchargement de fichier
}

const closeViewer = () => {
  isOpen.value = false
}

// Raccourci clavier pour fermer (Échap)
let keydownHandler: ((event: KeyboardEvent) => void) | null = null

watch(isOpen, (newValue) => {
  if (newValue && typeof window !== 'undefined') {
    // Ajouter l'écouteur quand le modal s'ouvre
    keydownHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeViewer()
      }
    }
    document.addEventListener('keydown', keydownHandler)
  } else if (!newValue && keydownHandler && typeof window !== 'undefined') {
    // Supprimer l'écouteur quand le modal se ferme
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
