<template>
  <UModal
    :title="hasAttestation ? 'Régénérer l\'attestation' : 'Générer l\'attestation'"
    :ui="{ content: 'w-full max-w-2xl' }"
  >
    <!-- Bouton déclencheur -->
    <UButton
      :label="hasAttestation ? 'Régénérer l\'attestation' : 'Générer l\'attestation'"
      :icon="hasAttestation ? 'i-lucide-refresh-cw' : 'i-lucide-file-badge-2'"
      :color="hasAttestation ? 'orange' : 'primary'"
      size="xs"
      variant="outline"
    />

    <template #body>
      <div class="space-y-4">
        <!-- Message informatif -->
        <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p class="text-sm text-blue-800">
            {{ hasAttestation
              ? 'Vous pouvez modifier les informations ci-dessous avant de régénérer l\'attestation.'
              : 'Complétez les informations ci-dessous pour générer l\'attestation de labellisation.'
            }}
          </p>
        </div>

        <!-- Champs personnalisés -->
        <AttestationCustomFields
          v-if="currentAudit"
          :audit="currentAudit"
          @update:scope="customScope = $event"
          @update:exclusions="customExclusions = $event"
          @update:companies="customCompanies = $event"
        />

        <!-- Erreur de validation -->
        <div
          v-if="validationError"
          class="p-3 bg-red-50 border border-red-200 rounded-lg"
        >
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
        :label="hasAttestation ? 'Régénérer' : 'Générer'"
        icon="i-lucide-check"
        color="primary"
        :loading="generating"
        :disabled="generating"
        @click="() => handleGenerate(close)"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { AuditWithRelations } from '~~/app/types/audits'

interface Props {
  auditId: number
  hasAttestation: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  generated: [data: any]
}>()

// Composables
const { currentAudit, fetchAudit } = useAudits()
const toast = useToast()

// État local
const generating = ref(false)
const validationError = ref<string | null>(null)

// États pour les champs personnalisés
const customScope = ref('')
const customExclusions = ref('')
const customCompanies = ref('')

// Méthode de génération/régénération
const handleGenerate = async (closeModal?: () => void) => {
  validationError.value = null
  generating.value = true

  try {
    await $fetch(`/api/audits/${props.auditId}/regenerate-attestation`, {
      method: 'POST',
      body: {
        customScope: customScope.value,
        customExclusions: customExclusions.value,
        customCompanies: customCompanies.value,
      },
    })

    // Recharger l'audit pour avoir la nouvelle attestation
    await fetchAudit(props.auditId)

    emit('generated', { auditId: props.auditId })

    if (closeModal) {
      closeModal()
    }

    toast.add({
      title: 'Succès',
      description: props.hasAttestation
        ? 'Attestation régénérée avec succès'
        : 'Attestation générée avec succès',
      color: 'success',
    })
  } catch (error: any) {
    console.error('Erreur génération:', error)
    validationError.value = error.data?.message || 'Impossible de générer l\'attestation'
    toast.add({
      title: 'Erreur',
      description: validationError.value,
      color: 'error',
    })
  } finally {
    generating.value = false
  }
}
</script>
