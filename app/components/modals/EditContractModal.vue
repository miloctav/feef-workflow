<template>
  <UModal
    title="Modifier le contrat"
    :ui="{ footer: 'justify-end' }"
  >
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
        <UFormField
          label="Titre"
          required
        >
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

        <!-- Durée de validité (optionnelle) -->
        <div class="space-y-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
          <UFormField label="Durée de validité (optionnelle)">
            <URadioGroup
              v-model="form.validityType"
              :items="validityTypeOptions"
              :disabled="updateLoading"
            />
          </UFormField>

          <UFormField
            v-if="form.validityType === 'months'"
            label="Nombre de mois"
          >
            <UInput
              v-model.number="form.validityMonths"
              type="number"
              min="1"
              placeholder="Ex: 12"
              :disabled="updateLoading"
            />
          </UFormField>

          <UFormField
            v-if="form.validityType === 'years'"
            label="Nombre d'années"
          >
            <UInput
              v-model.number="form.validityYears"
              type="number"
              min="1"
              placeholder="Ex: 2"
              :disabled="updateLoading"
            />
          </UFormField>

          <UFormField
            v-if="form.validityType === 'date'"
            label="Date de fin de validité"
          >
            <UInput
              v-model="form.validityEndDate"
              type="date"
              :disabled="updateLoading"
            />
          </UFormField>
        </div>

        <!-- Informations non modifiables -->
        <div class="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div class="text-xs text-gray-600 space-y-1">
            <div><span class="font-medium">Entité :</span> {{ props.contract.entity.name }}</div>
            <div v-if="props.contract.oe">
              <span class="font-medium">OE :</span> {{ props.contract.oe.name }}
            </div>
            <div v-else>
              <span class="font-medium">OE :</span>
              <span class="text-gray-500">FEEF (non assigné)</span>
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

// Options pour le type de validité
const validityTypeOptions = [
  {
    value: 'none',
    label: 'Aucune',
    description: 'Pas de date de fin de validité',
  },
  {
    value: 'months',
    label: 'En mois',
    description: 'Spécifier la durée en mois',
  },
  {
    value: 'years',
    label: 'En années',
    description: 'Spécifier la durée en années',
  },
  {
    value: 'date',
    label: 'Date directe',
    description: 'Choisir une date de fin',
  },
]

// Formulaire initialisé avec les valeurs du contrat
const form = reactive<{
  title: string
  description: string
  validityType: 'none' | 'months' | 'years' | 'date'
  validityMonths: number | null
  validityYears: number | null
  validityEndDate: string
}>({
  title: props.contract.title,
  description: props.contract.description || '',
  validityType: props.contract.validityEndDate ? 'date' : 'none',
  validityMonths: null,
  validityYears: null,
  validityEndDate: props.contract.validityEndDate || '',
})

// Validation du formulaire
const isFormValid = computed(() => {
  return form.title.trim() !== ''
})

// Vérifier si des changements ont été faits
const hasChanges = computed(() => {
  const titleChanged = form.title !== props.contract.title
  const descriptionChanged = form.description !== (props.contract.description || '')

  // Vérifier si la validité a changé
  const originalHasValidity = !!props.contract.validityEndDate
  const newHasValidity = form.validityType !== 'none'

  // Si on passe de "a une validité" à "pas de validité" ou vice versa
  if (originalHasValidity !== newHasValidity) return true

  // Si on a une validité dans les deux cas, vérifier si la date a changé
  if (
    form.validityType === 'date' &&
    form.validityEndDate !== (props.contract.validityEndDate || '')
  ) {
    return true
  }

  // Si on utilise mois ou années (nouveaux champs), c'est un changement
  if (form.validityType === 'months' && form.validityMonths) return true
  if (form.validityType === 'years' && form.validityYears) return true

  return titleChanged || descriptionChanged
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

  // Gérer les champs de validité
  if (form.validityType === 'none') {
    // Supprimer la validité si elle existait
    if (props.contract.validityEndDate) {
      data.validityEndDate = null
    }
  } else if (form.validityType === 'months' && form.validityMonths) {
    data.validityMonths = form.validityMonths
  } else if (form.validityType === 'years' && form.validityYears) {
    data.validityYears = form.validityYears
  } else if (form.validityType === 'date' && form.validityEndDate) {
    data.validityEndDate = form.validityEndDate
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
