<template>
  <UModal title="Ajouter le plan d'audit et/ou les dates" :ui="{ footer: 'justify-end' }">
    <!-- Bouton trigger du modal -->
    <UButton
      icon="i-lucide-plus"
      size="sm"
      color="primary"
      variant="soft"
    >
      Ajouter le plan et les dates d'audit
    </UButton>

    <template #body>
      <div class="space-y-4">
        <UFormField label="Plan d'audit (PDF)" description="Optionnel - Vous pouvez déposer le plan plus tard">
          <UFileUpload
            v-model="form.file"
            accept="application/pdf"
            label="Déposez le plan d'audit ici"
            description="PDF uniquement (max. 10MB)"
            icon="i-lucide-file-text"
            :disabled="createLoading"
            class="min-h-32"
          />
        </UFormField>

        <div class="border-t pt-4">
          <p class="text-sm text-gray-600 mb-3">Dates prévisionnelles de l'audit (optionnelles)</p>

          <div class="space-y-3">
            <UFormField label="Date de début prévisionnelle">
              <UInput
                v-model="form.plannedStartDate"
                type="date"
                :disabled="createLoading"
              />
            </UFormField>

            <UFormField label="Date de fin prévisionnelle">
              <UInput
                v-model="form.plannedEndDate"
                type="date"
                :disabled="createLoading"
              />
            </UFormField>
          </div>
        </div>

        <div v-if="dateError" class="text-sm text-red-600">
          {{ dateError }}
        </div>

        <div v-if="validationError" class="text-sm text-red-600">
          {{ validationError }}
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
        label="Enregistrer"
        color="primary"
        :loading="createLoading"
        :disabled="!isFormValid"
        @click="handleSubmit(close)"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { AuditDocumentType } from '~~/app/types/auditDocuments'

interface Props {
  auditId: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  created: []
}>()

const { updateAudit, updateLoading } = useAudits()
const { createDocumentVersion, createLoading: createDocLoading } = useDocumentVersions()

// Loading composite
const createLoading = computed(() => updateLoading.value || createDocLoading.value)

// Formulaire
const form = reactive<{
  file: File | null
  plannedStartDate: string
  plannedEndDate: string
}>({
  file: null,
  plannedStartDate: '',
  plannedEndDate: '',
})

// Erreur de validation des dates
const dateError = computed(() => {
  // Si les deux dates sont vides, pas d'erreur
  if (!form.plannedStartDate && !form.plannedEndDate) {
    return null
  }

  // Si une seule date est renseignée, erreur
  if (!form.plannedStartDate || !form.plannedEndDate) {
    return 'Les deux dates doivent être renseignées ensemble'
  }

  const startDate = new Date(form.plannedStartDate)
  const endDate = new Date(form.plannedEndDate)

  if (endDate <= startDate) {
    return 'La date de fin doit être postérieure à la date de début'
  }

  return null
})

// Erreur de validation générale
const validationError = computed(() => {
  // Au moins un élément doit être fourni
  const hasFile = !!form.file
  const hasDates = !!(form.plannedStartDate && form.plannedEndDate)

  if (!hasFile && !hasDates) {
    return 'Vous devez fournir au moins le plan d\'audit ou les dates prévisionnelles'
  }

  return null
})

// Validation du formulaire
const isFormValid = computed(() => {
  // Pas d'erreur de validation des dates
  if (dateError.value) return false

  // Pas d'erreur de validation générale
  if (validationError.value) return false

  return true
})

// Soumettre le formulaire
const handleSubmit = async (close: () => void) => {
  let uploadSuccess = true
  let updateSuccess = true

  // 1. Uploader le plan d'audit si un fichier est fourni
  if (form.file) {
    const uploadResult = await createDocumentVersion(
      props.auditId,
      form.file,
      'audit',
      AuditDocumentType.PLAN
    )

    uploadSuccess = uploadResult.success

    if (!uploadSuccess) {
      return
    }
  }

  // 2. Mettre à jour les dates prévisionnelles si elles sont fournies
  if (form.plannedStartDate && form.plannedEndDate) {
    const updateResult = await updateAudit(props.auditId, {
      plannedStartDate: form.plannedStartDate,
      plannedEndDate: form.plannedEndDate,
      // Initialiser les dates réelles avec les dates prévisionnelles
      actualStartDate: form.plannedStartDate,
      actualEndDate: form.plannedEndDate,
    })

    updateSuccess = updateResult.success

    if (!updateSuccess) {
      return
    }
  }

  // 3. Succès : émettre l'événement et fermer
  if (uploadSuccess && updateSuccess) {
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
  form.file = null
  form.plannedStartDate = ''
  form.plannedEndDate = ''
}
</script>
