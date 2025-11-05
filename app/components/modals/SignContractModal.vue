<template>
  <UModal
    v-model:open="isOpen"
    :title="`Signer le contrat: ${contract.title}`"
    :ui="{ width: 'max-w-2xl', footer: 'justify-end' }"
  >
    <template #body>
      <div class="space-y-6">
        <!-- Instructions -->
        <UAlert
          color="blue"
          variant="soft"
          title="Comment signer ce contrat ?"
          description="Suivez les étapes ci-dessous pour signer le contrat"
        />

        <div class="space-y-4">
          <!-- Étape 1 -->
          <div class="flex gap-4">
            <div class="flex-shrink-0">
              <div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold">
                1
              </div>
            </div>
            <div class="flex-1">
              <h4 class="font-semibold text-gray-900 mb-2">Téléchargez le contrat</h4>
              <p class="text-sm text-gray-600 mb-3">
                Téléchargez la dernière version du contrat à signer.
              </p>
              <UButton
                icon="i-lucide-download"
                size="sm"
                color="primary"
                variant="outline"
                :loading="downloadLoading"
                :disabled="!latestVersion"
                @click="handleDownload"
              >
                Télécharger le contrat
              </UButton>
              <p v-if="!latestVersion" class="text-xs text-amber-600 mt-2">
                Aucune version disponible. Un contrat doit être uploadé avant de pouvoir être signé.
              </p>
            </div>
          </div>

          <!-- Étape 2 -->
          <div class="flex gap-4">
            <div class="flex-shrink-0">
              <div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold">
                2
              </div>
            </div>
            <div class="flex-1">
              <h4 class="font-semibold text-gray-900 mb-2">Signez le contrat manuellement</h4>
              <p class="text-sm text-gray-600">
                Imprimez le document ou utilisez un outil de signature électronique pour apposer votre signature.
              </p>
            </div>
          </div>

          <!-- Étape 3 -->
          <div class="flex gap-4">
            <div class="flex-shrink-0">
              <div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold">
                3
              </div>
            </div>
            <div class="flex-1">
              <h4 class="font-semibold text-gray-900 mb-2">Importez le contrat signé</h4>
              <p class="text-sm text-gray-600 mb-3">
                Scannez ou convertissez le document signé en PDF et importez-le ici.
              </p>

              <!-- Input file -->
              <div class="space-y-3">
                <input
                  ref="fileInput"
                  type="file"
                  accept=".pdf,application/pdf"
                  class="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    cursor-pointer"
                  @change="handleFileSelect"
                />
                <p v-if="selectedFile" class="text-sm text-green-600 flex items-center gap-2">
                  <UIcon name="i-lucide-check-circle" class="w-4 h-4" />
                  Fichier sélectionné: {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Message d'erreur -->
        <UAlert
          v-if="errorMessage"
          color="red"
          variant="soft"
          :title="errorMessage"
          :close-button="{ icon: 'i-lucide-x', color: 'red', variant: 'link' }"
          @close="errorMessage = ''"
        />

        <!-- Message de succès -->
        <UAlert
          v-if="successMessage"
          color="green"
          variant="soft"
          :title="successMessage"
          :close-button="{ icon: 'i-lucide-x', color: 'green', variant: 'link' }"
          @close="successMessage = ''"
        />
      </div>
    </template>

    <template #footer="{ close }">
      <UButton
        label="Annuler"
        color="neutral"
        variant="outline"
        :disabled="uploadLoading"
        @click="close"
      />
      <UButton
        label="Importer le contrat signé"
        icon="i-lucide-upload"
        color="primary"
        :loading="uploadLoading"
        :disabled="!selectedFile || !latestVersion"
        @click="handleUploadSignedContract"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ContractWithRelations } from '~~/app/types/contracts'

interface Props {
  contract: ContractWithRelations
  open?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  signed: []
  'update:open': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.open ?? false,
  set: (value) => emit('update:open', value)
})

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const downloadLoading = ref(false)
const uploadLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Récupérer la dernière version du contrat
const latestVersion = computed(() => {
  if (!props.contract.documentVersions || props.contract.documentVersions.length === 0) {
    return null
  }
  // Les versions sont triées par date (plus récente en premier normalement)
  return props.contract.documentVersions[0]
})

// Gérer la sélection de fichier
function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0]
    errorMessage.value = ''
  }
}

// Télécharger le contrat
async function handleDownload() {
  if (!latestVersion.value) return

  downloadLoading.value = true
  errorMessage.value = ''

  try {
    const data = await $fetch<{ data: { url: string } }>(`/api/documents-versions/${latestVersion.value.id}/download`)

    if (data?.data?.url) {
      // Ouvrir l'URL signée dans un nouvel onglet
      window.open(data.data.url, '_blank')
    } else {
      throw new Error('URL de téléchargement non disponible')
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'Erreur lors du téléchargement du contrat'
  } finally {
    downloadLoading.value = false
  }
}

// Uploader le contrat signé
async function handleUploadSignedContract() {
  if (!selectedFile.value) return

  uploadLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    // Créer le FormData
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    // Appeler l'endpoint de signature
    const data = await $fetch(`/api/contracts/${props.contract.id}/sign`, {
      method: 'POST',
      body: formData,
    })

    successMessage.value = 'Contrat signé avec succès !'

    // Émettre l'événement de signature réussie
    setTimeout(() => {
      emit('signed')
    }, 1500)
  } catch (err: any) {
    errorMessage.value = err.data?.message || err.message || 'Erreur lors de l\'upload du contrat signé'
  } finally {
    uploadLoading.value = false
  }
}

// Formater la taille du fichier
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
</script>
