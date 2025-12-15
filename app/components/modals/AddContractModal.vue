<template>
  <UModal
    title="Ajouter un contrat"
    :ui="{ footer: 'justify-end' }"
  >
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
        <UFormField
          label="Titre"
          required
        >
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

        <UFormField
          label="Fichier du contrat (PDF)"
          required
        >
          <UFileUpload
            v-model="form.file"
            accept="application/pdf"
            label="Déposez votre fichier PDF ici"
            description="PDF uniquement (max. 10MB)"
            icon="i-lucide-file-text"
            :disabled="createLoading"
            class="min-h-32"
          />
        </UFormField>

        <!-- Durée de validité (optionnelle) -->
        <div class="space-y-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
          <UFormField label="Durée de validité (optionnelle)">
            <URadioGroup
              v-model="form.validityType"
              :items="validityTypeOptions"
              :disabled="createLoading"
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
              :disabled="createLoading"
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
              :disabled="createLoading"
            />
          </UFormField>

          <UFormField
            v-if="form.validityType === 'date'"
            label="Date de fin de validité"
          >
            <UInput
              v-model="form.validityEndDate"
              type="date"
              :disabled="createLoading"
            />
          </UFormField>
        </div>

        <!-- Options de signature (uniquement pour contrats FEEF) -->
        <div
          v-if="forceOeId === null"
          class="space-y-3 pt-2 border-t border-neutral-200 dark:border-neutral-800"
        >
          <UFormField label="Options de signature">
            <UCheckbox
              v-model="form.requiresSignature"
              label="Signature requise"
              :disabled="createLoading"
            />
          </UFormField>

          <UFormField
            v-if="form.requiresSignature"
            label="Qui doit signer ?"
            required
          >
            <URadioGroup
              v-model="form.signatureType"
              :items="signatureTypeOptions"
              :disabled="createLoading"
            />
          </UFormField>
        </div>
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
  forceOeId: undefined,
})
const emit = defineEmits<{
  created: []
}>()

const { createContract, createLoading } = useContracts()

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

// Options pour le type de signature
const signatureTypeOptions = [
  {
    value: 'ENTITY_ONLY',
    label: 'Entity seule',
    description: "Seule l'entité doit signer le contrat",
  },
  {
    value: 'ENTITY_AND_FEEF',
    label: 'Entity + FEEF',
    description: "L'entité puis FEEF doivent signer le contrat",
  },
]

// Formulaire
const form = reactive<{
  title: string
  description: string
  file: File | null
  validityType: 'none' | 'months' | 'years' | 'date'
  validityMonths: number | null
  validityYears: number | null
  validityEndDate: string
  requiresSignature: boolean
  signatureType: 'ENTITY_ONLY' | 'ENTITY_AND_FEEF' | null
}>({
  title: '',
  description: '',
  file: null,
  validityType: 'none',
  validityMonths: null,
  validityYears: null,
  validityEndDate: '',
  requiresSignature: false,
  signatureType: null,
})

// Validation du formulaire
const isFormValid = computed(() => {
  // Titre obligatoire
  if (form.title.trim() === '') return false

  // Fichier obligatoire
  if (!form.file) return false

  // Si signature requise, signatureType doit être défini
  if (form.requiresSignature && !form.signatureType) return false

  return true
})

// Soumettre le formulaire
const handleSubmit = async (close: () => void) => {
  // Créer un FormData pour envoyer les données avec le fichier
  const formData = new FormData()

  formData.append('title', form.title)
  if (form.description) {
    formData.append('description', form.description)
  }
  if (form.file) {
    formData.append('file', form.file)
  }

  // Ajouter entityId uniquement si fourni
  if (props.entityId !== undefined) {
    formData.append('entityId', props.entityId.toString())
  }

  // Ajouter forceOeId si défini
  if (props.forceOeId !== undefined) {
    formData.append('forceOeId', props.forceOeId === null ? '' : props.forceOeId.toString())
  }

  // Ajouter les champs de validité si spécifiés
  if (form.validityType === 'months' && form.validityMonths) {
    formData.append('validityMonths', form.validityMonths.toString())
  } else if (form.validityType === 'years' && form.validityYears) {
    formData.append('validityYears', form.validityYears.toString())
  } else if (form.validityType === 'date' && form.validityEndDate) {
    formData.append('validityEndDate', form.validityEndDate)
  }

  // Ajouter les champs de signature si requis et si c'est un contrat FEEF
  if (props.forceOeId === null && form.requiresSignature) {
    formData.append('requiresSignature', 'true')
    if (form.signatureType) {
      formData.append('signatureType', form.signatureType)
    }
  }

  const result = await createContract(formData)

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
  form.file = null
  form.validityType = 'none'
  form.validityMonths = null
  form.validityYears = null
  form.validityEndDate = ''
  form.requiresSignature = false
  form.signatureType = null
}

// Réinitialiser signatureType quand requiresSignature passe à false
watch(
  () => form.requiresSignature,
  (newValue) => {
    if (!newValue) {
      form.signatureType = null
    } else {
      // Par défaut, sélectionner ENTITY_ONLY
      form.signatureType = 'ENTITY_ONLY'
    }
  }
)
</script>
