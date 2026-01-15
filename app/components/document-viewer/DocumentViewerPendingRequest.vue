<template>
  <div class="flex-1 flex items-center justify-center bg-gray-50 rounded-lg">
    <div class="text-center p-8 max-w-md">
      <UIcon
        name="i-lucide-alert-circle"
        class="w-16 h-16 mx-auto mb-4 text-orange-500"
      />
      <h3 class="text-lg font-semibold text-gray-900 mb-2">Demande de mise à jour en attente</h3>

      <div
        v-if="selectedVersionData?.askedByAccount"
        class="mb-4 text-sm text-gray-600"
      >
        <p class="mb-2">
          Demandée par
          <span class="font-medium"
            >{{ selectedVersionData.askedByAccount.firstname }}
            {{ selectedVersionData.askedByAccount.lastname }}</span
          >
        </p>
        <p class="text-xs text-gray-500">Le {{ formatDate(selectedVersionData.uploadAt) }}</p>
      </div>

      <div
        v-if="selectedVersionData?.comment"
        class="bg-white rounded-lg p-4 mb-6 text-left border border-gray-200"
      >
        <p class="text-xs font-semibold text-gray-700 mb-2">Commentaire :</p>
        <p class="text-sm text-gray-800 whitespace-pre-wrap">
          {{ selectedVersionData.comment }}
        </p>
      </div>

      <p class="text-gray-600 mb-6">
        Ce document est en attente de mise à jour. L'entité doit uploader une nouvelle version pour
        répondre à cette demande.
      </p>

      <div class="flex flex-col gap-3">
        <!-- Bouton pour ENTITY : Upload le document demandé -->
        <UButton
          v-if="canUploadDocument"
          @click="$emit('trigger-file-input')"
          color="primary"
          variant="solid"
          icon="i-lucide-upload"
          label="Importer le document mis à jour"
          size="lg"
          :loading="createLoading"
          :disabled="createLoading"
        />

        <!-- Bouton pour annuler (celui qui a demandé) -->
        <UButton
          v-if="canCancelRequest"
          @click="$emit('cancel-request')"
          color="error"
          variant="outline"
          icon="i-lucide-x"
          label="Annuler cette demande"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  selectedVersionData: any
  canUploadDocument: boolean
  canCancelRequest: boolean
  createLoading: boolean
}

defineProps<Props>()

defineEmits<{
  'trigger-file-input': []
  'cancel-request': []
}>()

function formatDate(date: Date | string): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
</script>
