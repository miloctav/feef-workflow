<template>
  <div class="flex-1 flex items-center justify-center bg-gray-50 rounded-lg">
    <div class="text-center p-8 max-w-md">
      <UIcon
        name="i-lucide-file-x"
        class="w-20 h-20 mx-auto mb-6 text-gray-400"
      />
      <h3 class="text-xl font-medium text-gray-900 mb-3">Aucune version disponible</h3>
      <p class="text-gray-600 mb-6 leading-relaxed">
        Ce document n'a pas encore été uploadé. Cliquez sur "Importer première version" pour ajouter
        la première version du document.
      </p>

      <UButton
        v-if="canUploadDocument"
        @click="$emit('trigger-file-input')"
        color="primary"
        variant="solid"
        icon="i-lucide-upload"
        label="Importer première version"
        :loading="createLoading"
        :disabled="createLoading"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  canUploadDocument: boolean
  createLoading: boolean
}

defineProps<Props>()

defineEmits<{
  'trigger-file-input': []
}>()
</script>
