<template>
  <UModal 
    title="Plan d'audit"
    :ui="{ 
      content: 'w-full max-w-md',
      footer: 'justify-end' 
    }"
  >
    <!-- Bouton déclencheur -->
    <UButton
      size="xs"
      color="primary"
      variant="outline"
      icon="i-lucide-upload"
      label="Uploader le plan"
    />

    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-gray-600">
          Uploadez le plan d'audit pour cette entité. Ce document sera accessible aux autres parties prenantes.
        </p>

        <!-- Input file caché -->
        <input
          ref="fileInputRef"
          type="file"
          class="hidden"
          accept=".pdf,.doc,.docx"
          @change="handleFileSelect"
        />

        <!-- Zone de drop ou bouton d'upload -->
        <div 
          class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
          @click="triggerFileInput"
          @dragover.prevent
          @drop.prevent="handleFileDrop"
        >
          <UIcon name="i-lucide-upload-cloud" class="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p class="text-sm text-gray-600 mb-2">
            Cliquez pour sélectionner un fichier ou glissez-déposez
          </p>
          <p class="text-xs text-gray-500">
            PDF, DOC, DOCX - Max 10MB
          </p>
        </div>

        <!-- Fichier sélectionné -->
        <div v-if="selectedFile" class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <UIcon name="i-lucide-file" class="w-4 h-4 text-gray-600" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">{{ selectedFile.name }}</p>
            <p class="text-xs text-gray-500">{{ formatFileSize(selectedFile.size) }}</p>
          </div>
          <UButton
            @click="removeSelectedFile"
            icon="i-lucide-x"
            size="xs"
            color="neutral"
            variant="ghost"
          />
        </div>
      </div>
    </template>

    <template #footer="{ close }">
      <UButton
        label="Annuler"
        color="neutral"
        variant="outline"
        @click="close"
      />
      <UButton
        label="Uploader le plan"
        icon="i-lucide-upload"
        :loading="uploading"
        :disabled="!selectedFile || uploading"
        @click="() => uploadPlan(close)"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { AuditDocumentType } from '~~/app/types/auditDocuments'

interface Props {
  auditId: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'uploaded': [version: any]
}>()

// Composables
const { createDocumentVersion } = useDocumentVersions()
const toast = useToast()

// État local
const selectedFile = ref<File | null>(null)
const uploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// Méthodes
const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    selectedFile.value = file
  }
}

const handleFileDrop = (event: DragEvent) => {
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    selectedFile.value = files[0] || null
  }
}

const removeSelectedFile = () => {
  selectedFile.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const uploadPlan = async (closeModal?: () => void) => {
  if (!selectedFile.value) return

  uploading.value = true

  try {
    const result = await createDocumentVersion(
      props.auditId,
      selectedFile.value,
      'audit',
      AuditDocumentType.PLAN
    )

    if (result.success) {
      emit('uploaded', result.data)
      // Réinitialiser le formulaire
      selectedFile.value = null
      if (fileInputRef.value) {
        fileInputRef.value.value = ''
      }
      // Fermer le modal
      if (closeModal) {
        closeModal()
      }
      toast.add({
        title: 'Succès',
        description: 'Plan d\'audit uploadé avec succès',
        color: 'success',
      })
    }
  } catch (error) {
    console.error('Erreur upload plan:', error)
    toast.add({
      title: 'Erreur',
      description: 'Impossible d\'uploader le plan d\'audit',
      color: 'error',
    })
  } finally {
    uploading.value = false
  }
}
</script>