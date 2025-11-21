<template>
  <UModal
    title="Avis de l'Organisme Évaluateur"
    :ui="{
      content: 'w-full max-w-lg',
      footer: 'justify-end'
    }"
  >
    <!-- Bouton déclencheur -->
    <UButton
      size="xs"
      color="primary"
      variant="outline"
      icon="i-lucide-file-check"
      :label="isEditMode ? 'Modifier l\'avis' : 'Émettre l\'avis'"
    />

    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-gray-600">
          {{ isEditMode ? 'Modifiez votre avis de labellisation.' : 'Émettez votre avis de labellisation suite à l\'audit réalisé.' }}
        </p>

        <!-- Avis -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Avis de labellisation <span class="text-red-500">*</span>
          </label>
          <URadioGroup
            v-model="form.opinion"
            :items="opinionOptions"
          />
        </div>

        <!-- Conditions (affiché uniquement si RESERVED) -->
        <div v-if="form.opinion === 'RESERVED'">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Conditions de réserve (optionnel)
          </label>
          <UTextarea
            v-model="form.conditions"
            placeholder="Listez les conditions à remplir pour obtenir un avis favorable..."
            :rows="4"
            :ui="{ wrapper: 'w-full' }"
          />
        </div>

        <!-- Argumentaire -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Argumentaire <span class="text-red-500">*</span>
          </label>
          <UTextarea
            v-model="form.argumentaire"
            placeholder="Exposez les raisons de votre avis en précisant les points forts et les axes d'amélioration identifiés..."
            :rows="6"
            :ui="{ wrapper: 'w-full' }"
          />
          <p class="text-xs text-gray-500 mt-1">
            Minimum 50 caractères
          </p>
        </div>

        <!-- Document d'avis -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Document d'avis (optionnel)
          </label>

          <!-- Fichier existant -->
          <div v-if="hasExistingDocument && !form.file" class="p-3 bg-gray-50 rounded-lg border border-gray-200 mb-2">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-file-check" class="w-4 h-4 text-green-600" />
              <span class="text-sm text-gray-700">{{ latestDocumentVersion ? formatVersionInfo(latestDocumentVersion) : 'Document existant' }}</span>
            </div>
            <p class="text-xs text-gray-500 mt-1">Sélectionnez un fichier ci-dessous pour ajouter une nouvelle version</p>
          </div>

          <UFileUpload
            v-model="form.file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            :label="hasExistingDocument ? 'Ajouter une nouvelle version' : 'Déposez le document ici ou cliquez pour sélectionner'"
            description="Formats acceptés : PDF, DOC, DOCX"
          />
        </div>

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
        :label="isEditMode ? 'Enregistrer les modifications' : 'Soumettre l\'avis'"
        icon="i-lucide-send"
        :loading="submitting"
        :disabled="!isFormValid || submitting"
        @click="() => submitOpinion(close)"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { AuditDocumentType } from '~~/app/types/auditDocuments'

const props = defineProps<{
  auditId: number
}>()

const emit = defineEmits<{
  'submitted': []
}>()

// Composables
const { currentAudit, fetchAudit } = useAudits()
const { createDocumentVersion } = useDocumentVersions()
const toast = useToast()

// Options pour le select de l'avis
const opinionOptions = [
  {
    value: 'FAVORABLE',
    label: 'Favorable',
    description: 'L\'entité remplit les exigences du référentiel'
  },
  {
    value: 'UNFAVORABLE',
    label: 'Défavorable',
    description: 'L\'entité ne remplit pas les exigences du référentiel'
  },
  {
    value: 'RESERVED',
    label: 'Réservé',
    description: 'Avis sous réserve de certaines conditions'
  }
]

// État local
const form = ref({
  opinion: undefined as string | undefined,
  argumentaire: '',
  conditions: '',
  file: null as File | null
})

const submitting = ref(false)
const validationError = ref<string | null>(null)

// Computed
const isEditMode = computed(() => {
  return currentAudit.value?.oeOpinion !== null && currentAudit.value?.oeOpinion !== undefined
})

// Utiliser lastDocumentVersions de l'audit (pas d'appel API séparé)
const latestDocumentVersion = computed(() => {
  return currentAudit.value?.lastDocumentVersions?.OE_OPINION ?? null
})

const hasExistingDocument = computed(() => {
  return latestDocumentVersion.value !== null
})

const isFormValid = computed(() => {
  const hasOpinion = form.value.opinion !== undefined

  // Le formulaire est valide si on a l'avis
  // L'argumentaire, les conditions et le document sont optionnels
  return hasOpinion
})

function formatVersionInfo(version: any) {
  if (!version) return ''
  const date = new Date(version.uploadAt)
  const formattedDate = date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
  const uploaderName = version.uploadByAccount
    ? `${version.uploadByAccount.firstname} ${version.uploadByAccount.lastname}`
    : 'Inconnu'
  return `Transmis le ${formattedDate} par ${uploaderName}`
}

// Initialiser le formulaire avec les données existantes
function initForm() {
  if (currentAudit.value) {
    form.value.opinion = currentAudit.value.oeOpinion || undefined
    form.value.argumentaire = currentAudit.value.oeOpinionArgumentaire || ''
    form.value.conditions = (currentAudit.value as any).oeOpinionConditions || ''
    form.value.file = null
  }
}

// Watch pour initialiser le formulaire
watch(currentAudit, () => {
  initForm()
}, { immediate: true })

const submitOpinion = async (closeModal?: () => void) => {
  validationError.value = null

  // Validation côté client
  if (!form.value.opinion) {
    validationError.value = 'Veuillez sélectionner un avis'
    return
  }
  submitting.value = true

  try {
    // 1. Upload du document si nouveau fichier
    if (form.value.file) {
      const uploadResult = await createDocumentVersion(
        props.auditId,
        form.value.file,
        'audit',
        AuditDocumentType.OE_OPINION
      )

      if (!uploadResult.success) {
        throw new Error('Erreur lors de l\'upload du document')
      }
    }

    // 2. Mettre à jour l'audit avec l'avis
    await $fetch(`/api/audits/${props.auditId}`, {
      method: 'PUT',
      body: {
        oeOpinion: form.value.opinion,
        oeOpinionArgumentaire: form.value.argumentaire.trim(),
        oeOpinionConditions: form.value.opinion === 'RESERVED' ? form.value.conditions.trim() : null,
      }
    })

    // 3. Rafraîchir l'audit (lastDocumentVersions sera mis à jour)
    await fetchAudit(props.auditId)

    emit('submitted')

    // Fermer le modal
    if (closeModal) {
      closeModal()
    }

    toast.add({
      title: 'Succès',
      description: isEditMode.value ? 'Avis de labellisation modifié avec succès' : 'Avis de labellisation transmis avec succès',
      color: 'success',
    })
  } catch (error: any) {
    console.error('Erreur soumission avis:', error)
    validationError.value = error.message || 'Impossible de soumettre l\'avis'
    toast.add({
      title: 'Erreur',
      description: 'Impossible de soumettre l\'avis de labellisation',
      color: 'error',
    })
  } finally {
    submitting.value = false
  }
}
</script>
