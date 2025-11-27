<template>
  <UModal
    title="Valider la labellisation"
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
      icon="i-lucide-stamp"
      label="Valider la labellisation"
    />

    <template #body>
      <div class="space-y-4">
        <div class="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-award" class="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p class="text-sm font-medium text-green-800 mb-1">
                Attribution du label FEEF
              </p>
              <p class="text-sm text-green-700">
                Vous êtes sur le point de valider la labellisation de cette entité pour une durée de 1 an.
              </p>
            </div>
          </div>
        </div>

        <p class="text-sm text-gray-600">
          Cette action confirmera définitivement l'attribution du label FEEF à l'entité auditée.
        </p>

        <!-- Validation -->
        <div v-if="validationError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-sm text-red-700">{{ validationError }}</p>
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
        label="Confirmer la labellisation"
        icon="i-lucide-check"
        color="success"
        :loading="submitting"
        :disabled="submitting"
        @click="() => submitDecision(close)"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
interface Props {
  auditId: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'submitted': [data: any]
}>()

// Composables
const { updateAudit } = useAudits()
const toast = useToast()

// État local
const submitting = ref(false)
const validationError = ref<string | null>(null)

// Méthodes
const submitDecision = async (closeModal?: () => void) => {
  validationError.value = null
  submitting.value = true

  try {
    // La date d'expiration sera calculée automatiquement par le backend
    const result = await updateAudit(props.auditId, {
      feefDecision: 'ACCEPTED',
      status: 'COMPLETED',
    })

    if (!result.success) {
      throw new Error(result.error || 'Échec de la validation')
    }

    emit('submitted', result.data)

    // Fermer le modal
    if (closeModal) {
      closeModal()
    }

    toast.add({
      title: 'Succès',
      description: 'Labellisation validée avec succès',
      color: 'success',
    })
  } catch (error: any) {
    console.error('Erreur validation:', error)
    validationError.value = error.message || 'Impossible de valider la labellisation'
    toast.add({
      title: 'Erreur',
      description: 'Impossible de valider la labellisation',
      color: 'error',
    })
  } finally {
    submitting.value = false
  }
}
</script>
