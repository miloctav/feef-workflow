<template>
  <UModal title="Modifier le contrat" :ui="{ footer: 'justify-end' }">
    <UButton
      icon="i-lucide-pen"
      size="sm"
      color="primary"
      variant="soft"
      @click.stop
    >
      Modifier
    </UButton>

    <template #body>
      <div class="space-y-4">
        <UFormField label="Titre" required>
          <UInput
            v-model="form.title"
            placeholder="Titre du contrat"
            :disabled="updateLoading"
          />
        </UFormField>

        <UFormField label="Description">
          <UTextarea
            v-model="form.description"
            placeholder="Description du contrat"
            :rows="3"
            :disabled="updateLoading"
          />
        </UFormField>

        <!-- Informations non modifiables -->
        <div class="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div class="text-xs text-gray-600 space-y-1">
            <div><span class="font-medium">Entité :</span> {{ props.contract.entity.name }}</div>
            <div v-if="props.contract.oe">
              <span class="font-medium">OE :</span> {{ props.contract.oe.name }}
            </div>
            <div v-else>
              <span class="font-medium">OE :</span> <span class="text-gray-500">FEEF (non assigné)</span>
            </div>
            <div class="text-xs text-gray-500 mt-2">
              Ces informations ne peuvent pas être modifiées
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer="{ close }">
      <UButton
        label="Annuler"
        color="neutral"
        variant="outline"
        @click="close"
        :disabled="updateLoading"
      />
      <UButton
        label="Enregistrer"
        color="primary"
        :loading="updateLoading"
        :disabled="!isFormValid || !hasChanges"
        @click="handleSubmit(close)"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ContractWithRelations, UpdateContractData } from '~~/app/types/contracts'

interface Props {
  contract: ContractWithRelations
}

const props = defineProps<Props>()
const emit = defineEmits<{
  updated: []
}>()

const { updateContract, updateLoading } = useContracts()

// Formulaire initialisé avec les valeurs du contrat
const form = reactive<{
  title: string
  description: string
}>({
  title: props.contract.title,
  description: props.contract.description || '',
})

// Validation du formulaire
const isFormValid = computed(() => {
  return form.title.trim() !== ''
})

// Vérifier si des changements ont été faits
const hasChanges = computed(() => {
  return form.title !== props.contract.title ||
    form.description !== (props.contract.description || '')
})

// Soumettre le formulaire
const handleSubmit = async (close: () => void) => {
  const data: UpdateContractData = {}

  // Ajouter uniquement les champs modifiés
  if (form.title !== props.contract.title) {
    data.title = form.title
  }

  if (form.description !== (props.contract.description || '')) {
    data.description = form.description || null
  }

  const result = await updateContract(props.contract.id, data)

  if (result.success) {
    // Émettre l'événement de mise à jour
    emit('updated')

    // Fermer le modal
    close()
  }
}
</script>
