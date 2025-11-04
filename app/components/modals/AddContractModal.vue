<template>
  <UModal title="Ajouter un contrat" :ui="{ footer: 'justify-end' }">
    <!-- Bouton trigger du modal -->
    <UButton
      v-if="compact"
      icon="i-lucide-plus"
      size="sm"
      color="primary"
      variant="soft"
      square
    />
    <UButton
      v-else
      icon="i-lucide-plus"
      size="sm"
      color="primary"
      variant="soft"
    >
      Ajouter un contrat
    </UButton>

    <template #body>
      <div class="space-y-4">
        <UFormField label="Titre" required>
          <UInput
            v-model="form.title"
            placeholder="Titre du contrat"
            :disabled="createLoading"
          />
        </UFormField>

        <UFormField label="Description">
          <UTextarea
            v-model="form.description"
            placeholder="Description du contrat"
            :rows="3"
            :disabled="createLoading"
          />
        </UFormField>
      </div>
    </template>

    <template #footer="{ close }">
      <UButton
        label="Annuler"
        color="neutral"
        variant="outline"
        @click="close"
        :disabled="createLoading"
      />
      <UButton
        label="Créer le contrat"
        color="primary"
        :loading="createLoading"
        :disabled="!isFormValid"
        @click="handleSubmit(close)"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { CreateContractData } from '~~/app/types/contracts'

interface Props {
  entityId?: number // Optionnel pour les utilisateurs ENTITY
  compact?: boolean
  forceOeId?: number | null // null pour forcer FEEF, number pour forcer un OE, undefined pour auto
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  entityId: undefined,
  forceOeId: undefined
})
const emit = defineEmits<{
  created: []
}>()

const { createContract, createLoading } = useContracts()

// Formulaire
const form = reactive<{
  title: string
  description: string
}>({
  title: '',
  description: '',
})

// Validation du formulaire
const isFormValid = computed(() => {
  return form.title.trim() !== ''
})

// Soumettre le formulaire
const handleSubmit = async (close: () => void) => {
  const data: CreateContractData = {
    title: form.title,
    description: form.description || undefined,
    forceOeId: props.forceOeId,
  }

  // Ajouter entityId uniquement si fourni
  if (props.entityId !== undefined) {
    data.entityId = props.entityId
  }

  const result = await createContract(data)

  if (result.success) {
    // Émettre l'événement de création
    emit('created')

    // Réinitialiser le formulaire
    resetForm()

    // Fermer le modal
    close()
  }
}

// Réinitialiser le formulaire
const resetForm = () => {
  form.title = ''
  form.description = ''
}
</script>
