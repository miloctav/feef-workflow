<template>
  <UModal title="Ajouter le plan d'audit" :ui="{ footer: 'justify-end' }">
    <!-- Bouton trigger du modal -->
    <UButton
      icon="i-lucide-plus"
      size="sm"
      color="primary"
      variant="soft"
    >
      Ajouter le plan d'audit
    </UButton>

    <template #body>
      <div class="space-y-4">
        <UFormField label="Plan d'audit (PDF)">
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

        <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div class="flex items-start gap-2">
            <UIcon name="i-lucide-info" class="w-4 h-4 text-blue-600 mt-0.5" />
            <div class="text-xs text-blue-800">
              <p class="font-medium mb-1">À propos des dates d'audit</p>
              <p>Les dates prévisionnelles seront calculées automatiquement lors de la création de l'audit. Vous pourrez ensuite renseigner les dates réelles une fois l'audit effectué.</p>
            </div>
          </div>
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
}>({
  file: null,
})

// Erreur de validation générale
const validationError = computed(() => {
  // Un fichier doit être fourni
  if (!form.file) {
    return 'Vous devez fournir un plan d\'audit (PDF)'
  }

  return null
})

// Validation du formulaire
const isFormValid = computed(() => {
  // Pas d'erreur de validation
  return !validationError.value
})

// Soumettre le formulaire
const handleSubmit = async (close: () => void) => {
  // Uploader le plan d'audit
  const uploadResult = await createDocumentVersion(
    props.auditId,
    form.file!,
    'audit',
    AuditDocumentType.PLAN
  )

  if (uploadResult.success) {
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
}
</script>
