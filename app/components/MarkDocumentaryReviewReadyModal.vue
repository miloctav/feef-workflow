<template>
  <UModal
    v-model:open="isOpen"
    title="Confirmer la revue documentaire"
    description="Confirmez que votre revue documentaire est à jour et conforme"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <div class="space-y-4">
        <p class="text-gray-700">
          Vous êtes sur le point de marquer votre revue documentaire comme prête. Cette action
          signifie que vous confirmez que tous vos documents sont à jour et conformes pour le
          processus de labellisation.
        </p>

        <!-- Warning card -->
        <div class="p-4 bg-orange-50 rounded-lg border border-orange-200">
          <div class="flex items-start gap-3">
            <UIcon
              name="i-lucide-alert-triangle"
              class="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0"
            />
            <div class="flex-1">
              <h5 class="font-medium text-orange-800 mb-1">Important</h5>
              <p class="text-sm text-orange-700">
                Une fois confirmée, cette action sera enregistrée avec votre nom et la date.
                Assurez-vous que tous les documents nécessaires ont bien été déposés.
              </p>
            </div>
          </div>
        </div>

        <!-- Confirmation visual -->
        <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-info"
              class="w-4 h-4 text-blue-600"
            />
            <span class="text-sm text-blue-700">
              Votre revue documentaire sera marquée comme prête le {{ formatCurrentDate() }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <template #footer="{ close }">
      <UButton
        label="Annuler"
        color="neutral"
        variant="outline"
        :disabled="markDocumentaryReviewReadyLoading"
        @click="close"
      />
      <UButton
        label="Confirmer"
        color="primary"
        icon="i-lucide-check"
        :loading="markDocumentaryReviewReadyLoading"
        @click="handleConfirm(close)"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  entityId: number
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  updated: []
}>()

const toast = useToast()
const { markDocumentaryReviewReady, markDocumentaryReviewReadyLoading } = useEntities()

const formatCurrentDate = () => {
  return new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const handleConfirm = async (close: () => void) => {
  const result = await markDocumentaryReviewReady(props.entityId)

  if (result.success) {
    toast.add({
      title: 'Succès',
      description: 'Votre revue documentaire a été marquée comme prête',
      color: 'success',
    })

    emit('updated')
    close()
  } else {
    toast.add({
      title: 'Erreur',
      description: result.error || 'Une erreur est survenue lors de la confirmation',
      color: 'error',
    })
  }
}
</script>
