<template>
  <UModal v-model:open="isOpen">
    <UButton
          color="secondary"
          variant="outline"
          icon="i-lucide-alert-circle"
          :label="buttonLabel"
          :size="buttonSize"
        />
    <template #content>
      <div class="p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">
          Demander une mise à jour du document
        </h3>

        <p class="text-sm text-gray-600 mb-4">
          {{ documentTitle }}
        </p>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Champ commentaire (optionnel) -->
          <div>
            <label for="comment" class="block text-sm font-medium text-gray-700 mb-2">
              Commentaire (optionnel)
            </label>
            <UTextarea
              id="comment"
              v-model="comment"
              placeholder="Précisez les modifications attendues..."
              :rows="4"
              :disabled="loading"
            />
          </div>

          <!-- Boutons d'action -->
          <div class="flex justify-end gap-3 pt-4">
            <UButton
              type="button"
              color="secondary"
              variant="outline"
              @click="isOpen = false"
              :disabled="loading"
            >
              Annuler
            </UButton>
            <UButton
              type="submit"
              color="primary"
              variant="solid"
              :loading="loading"
              :disabled="loading"
            >
              Demander la mise à jour
            </UButton>
          </div>
        </form>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
interface Props {
  documentaryReviewId?: number
  contractId?: number
  documentTitle: string
  buttonLabel?: string
  buttonSize?: 'xs' | 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  buttonLabel: 'Demander une mise à jour',
  buttonSize: 'sm',
})

const emit = defineEmits<{
  'update-requested': []
}>()

const isOpen = ref(false)
const comment = ref('')

// Déterminer le type de document
const documentType = computed(() => {
  if (props.documentaryReviewId) return 'documentaryReview'
  if (props.contractId) return 'contract'
  return null
})

const documentId = computed(() => {
  return props.documentaryReviewId || props.contractId || 0
})

// Composable pour gérer les demandes
const { requestDocumentUpdate, requestUpdateLoading } = useDocumentVersions()

const loading = computed(() => requestUpdateLoading.value)

// Soumettre la demande
const handleSubmit = async () => {
  if (!documentType.value || !documentId.value) {
    return
  }

  const result = await requestDocumentUpdate(
    documentId.value,
    documentType.value,
    comment.value || undefined
  )

  if (result.success) {
    // Fermer le modal et réinitialiser
    isOpen.value = false
    comment.value = ''

    // Émettre l'événement
    emit('update-requested')
  }
}

// Réinitialiser le commentaire quand on ferme le modal
watch(isOpen, (newValue) => {
  if (!newValue) {
    comment.value = ''
  }
})
</script>
