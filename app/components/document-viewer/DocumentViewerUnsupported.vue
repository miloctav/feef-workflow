<template>
  <div class="flex-1 flex items-center justify-center bg-gray-50 p-8">
    <div class="text-center max-w-md">
      <UIcon
        :name="getFileTypeIcon(selectedVersionData.mimeType)"
        class="w-20 h-20 mx-auto mb-6 text-gray-400"
      />
      <h3 class="text-lg font-medium text-gray-900 mb-2">
        {{ getFileTypeLabel(selectedVersionData.mimeType) }}
      </h3>
      <p class="text-sm text-gray-600 mb-6">
        Ce type de fichier ne peut pas être prévisualisé dans le navigateur. Téléchargez le fichier
        pour le consulter.
      </p>

      <!-- File info badges -->
      <div class="flex justify-center gap-2 mb-6">
        <UBadge
          color="neutral"
          variant="soft"
          size="sm"
        >
          {{ getFileTypeLabel(selectedVersionData.mimeType) }}
        </UBadge>
      </div>

      <div class="flex justify-center gap-3">
        <UButton
          @click="$emit('download')"
          color="primary"
          variant="solid"
          icon="i-lucide-download"
          label="Télécharger"
          size="lg"
        />
        <UButton
          :href="currentSignedUrl"
          target="_blank"
          color="secondary"
          variant="outline"
          icon="i-lucide-external-link"
          label="Ouvrir"
          size="lg"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getFileTypeIcon, getFileTypeLabel } from '~~/app/utils/documentMimeTypes'

interface Props {
  selectedVersionData: any
  currentSignedUrl: string
}

defineProps<Props>()

defineEmits<{
  download: []
}>()
</script>
