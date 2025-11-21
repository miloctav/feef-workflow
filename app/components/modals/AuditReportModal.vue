<template>
  <UModal
    :title="props.hasExistingReport ? 'Modifier le rapport d\'audit' : 'Ajouter le rapport d\'audit'"
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
      :icon="props.hasExistingReport ? 'i-lucide-edit' : 'i-lucide-upload'"
      :label="props.hasExistingReport ? 'Modifier le rapport' : 'Ajouter le rapport'"
    />

    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-gray-600">
          {{ props.hasExistingReport
            ? 'Modifiez le rapport d\'audit et/ou le score global de l\'entité.'
            : 'Uploadez le rapport d\'audit et indiquez le score global obtenu par l\'entité.' }}
        </p>

        <!-- Score global -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Score global (%) <span class="text-red-500">*</span>
          </label>
          <UInput
            v-model.number="score"
            type="number"
            min="0"
            max="100"
            placeholder="Ex: 75"
            :ui="{ wrapper: 'w-full' }"
          />
          <p class="text-xs text-gray-500 mt-1">
            Note de performance globale de l'entité (0-100)
          </p>
        </div>

        <!-- Document du rapport -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Document du rapport {{ props.hasExistingReport ? '(optionnel - nouvelle version)' : '' }}
          </label>

          <!-- Document existant -->
          <div v-if="props.hasExistingReport && !selectedFile" class="p-3 bg-gray-50 rounded-lg border border-gray-200 mb-2">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-file-check" class="w-4 h-4 text-green-600" />
              <span class="text-sm text-gray-700">Document existant</span>
              <UBadge color="success" variant="soft" size="xs">Uploadé</UBadge>
            </div>
            <p class="text-xs text-gray-500 mt-1">Sélectionnez un fichier ci-dessous pour ajouter une nouvelle version</p>
          </div>

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
              {{ props.hasExistingReport ? 'Ajouter une nouvelle version' : 'Cliquez pour sélectionner un fichier ou glissez-déposez' }}
            </p>
            <p class="text-xs text-gray-500">
              PDF, DOC, DOCX - Max 10MB
            </p>
          </div>
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
        :label="props.hasExistingReport ? 'Enregistrer les modifications' : 'Uploader le rapport'"
        :icon="props.hasExistingReport ? 'i-lucide-save' : 'i-lucide-upload'"
        :loading="uploading"
        :disabled="!isFormValid || uploading"
        @click="() => uploadReport(close)"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { AuditDocumentType } from '~~/app/types/auditDocuments'

interface Props {
  auditId: number
  hasExistingReport?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  hasExistingReport: false
})

const emit = defineEmits<{
  'uploaded': [data: { version?: any; score: number }]
}>()

// Composables
const { createDocumentVersion } = useDocumentVersions()
const { updateAudit, currentAudit } = useAudits()
const toast = useToast()

// État local
const selectedFile = ref<File | null>(null)
const score = ref<number | null>(null)
const uploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// Initialiser le score avec la valeur existante en mode modification
watch(() => [currentAudit.value, props.hasExistingReport], () => {
  if (props.hasExistingReport && currentAudit.value?.score !== undefined) {
    score.value = currentAudit.value.score
  }
}, { immediate: true })

// Computed
const isFormValid = computed(() => {
  const hasScore = score.value !== null && score.value !== undefined && score.value >= 0 && score.value <= 100
  // Le fichier n'est jamais obligatoire, seul le score peut être requis
  // En mode ajout ou modification: au moins le score OU un fichier
  return hasScore || selectedFile.value !== null
})

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

const uploadReport = async (closeModal?: () => void) => {
  if (!isFormValid.value) return

  uploading.value = true

  try {
    let uploadedVersion: any = null

    // 1. Uploader le fichier si fourni
    if (selectedFile.value) {
      const uploadResult = await createDocumentVersion(
        props.auditId,
        selectedFile.value,
        'audit',
        AuditDocumentType.REPORT
      )

      if (!uploadResult.success) {
        throw new Error('Échec de l\'upload du rapport')
      }
      uploadedVersion = uploadResult.data
    }

    // 2. Mettre à jour le score dans l'audit
    const updateData: Record<string, any> = {
      score: score.value,
    }
    // Transition vers la prochaine phase seulement si c'est le premier rapport
    if (!props.hasExistingReport) {
      updateData.status = 'PENDING_CORRECTIVE_PLAN'
    }

    const updateResult = await updateAudit(props.auditId, updateData)

    if (!updateResult.success) {
      throw new Error('Échec de la mise à jour du score')
    }

    emit('uploaded', {
      version: uploadedVersion,
      score: score.value!,
    })

    // Réinitialiser le formulaire
    selectedFile.value = null
    score.value = null
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }

    // Fermer le modal
    if (closeModal) {
      closeModal()
    }

    toast.add({
      title: 'Succès',
      description: props.hasExistingReport ? 'Rapport d\'audit modifié avec succès' : 'Rapport d\'audit uploadé avec succès',
      color: 'success',
    })
  } catch (error) {
    console.error('Erreur upload rapport:', error)
    toast.add({
      title: 'Erreur',
      description: 'Impossible d\'uploader le rapport d\'audit',
      color: 'error',
    })
  } finally {
    uploading.value = false
  }
}
</script>
