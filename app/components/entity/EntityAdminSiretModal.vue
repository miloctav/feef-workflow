<script setup lang="ts">
import type { AdminPreviewResult } from '~~/app/composables/useEntityAdmin'

/**
 * Modale FEEF de modification du SIRET d'une entité.
 *
 * Affiche un input pour le nouveau SIRET (14 chiffres), interroge en debounce
 * l'endpoint preview pour valider unicité + garde-fous (audit en cours), puis
 * applique le changement après confirmation.
 */

const props = defineProps<{
  entity: {
    id: number
    name: string
    siret: string
  }
  onApplied?: () => void | Promise<void>
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const { previewChange, applyChange, loading } = useEntityAdmin()

const inputValue = ref('')
const preview = ref<AdminPreviewResult | null>(null)
const previewLoading = ref(false)
const previewError = ref<string | null>(null)

// SIRET normalisé pour comparaison (chiffres uniquement)
const normalizedInput = computed(() => inputValue.value.replace(/\s+/g, ''))

const isValidFormat = computed(() => /^\d{14}$/.test(normalizedInput.value))
const isUnchanged = computed(() => normalizedInput.value === props.entity.siret)

const runPreview = async () => {
  if (!isValidFormat.value || isUnchanged.value) {
    preview.value = null
    previewError.value = null
    return
  }
  previewLoading.value = true
  previewError.value = null
  preview.value = null
  const result = await previewChange(props.entity.id, { siret: normalizedInput.value })
  if (result.success && result.data) {
    preview.value = result.data
  } else {
    previewError.value = result.error ?? 'Erreur lors du calcul des impacts'
  }
  previewLoading.value = false
}

let debounceHandle: ReturnType<typeof setTimeout> | null = null
const debouncedPreview = () => {
  if (debounceHandle) clearTimeout(debounceHandle)
  debounceHandle = setTimeout(() => {
    debounceHandle = null
    runPreview()
  }, 350)
}

watch(isOpen, (open) => {
  if (open) {
    inputValue.value = props.entity.siret
    preview.value = null
    previewError.value = null
  } else if (debounceHandle) {
    clearTimeout(debounceHandle)
    debounceHandle = null
  }
})

watch(normalizedInput, () => {
  if (!isOpen.value) return
  debouncedPreview()
})

const handleConfirm = async () => {
  if (!isValidFormat.value || isUnchanged.value) return
  if (!preview.value || preview.value.blocked) return
  const result = await applyChange(props.entity.id, { siret: normalizedInput.value })
  if (result.success) {
    isOpen.value = false
    if (props.onApplied) {
      await props.onApplied()
    }
  }
}

const handleCancel = () => {
  isOpen.value = false
}

const formatSiretDisplay = (siret: string) => {
  if (siret.length !== 14) return siret
  return `${siret.slice(0, 3)} ${siret.slice(3, 6)} ${siret.slice(6, 9)} ${siret.slice(9)}`
}

const fieldLabel = (field: 'mode' | 'type' | 'parentGroupId' | 'siret' | 'oeId') => {
  if (field === 'mode') return 'Mode'
  if (field === 'type') return 'Type'
  if (field === 'siret') return 'SIRET'
  if (field === 'oeId') return 'OE rattaché'
  return 'Lien parent'
}

const canConfirm = computed(() => {
  if (!isValidFormat.value || isUnchanged.value) return false
  if (previewLoading.value) return false
  if (!preview.value) return false
  if (preview.value.blocked) return false
  return preview.value.changes.length > 0
})
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Modifier le SIRET de « {{ entity.name }} »</h3>
        </template>

        <div class="space-y-4">
          <UAlert
            color="info"
            variant="soft"
            icon="i-lucide-info"
            title="Garde-fous"
            description="Le SIRET ne peut être modifié que si aucun audit n'est en cours. Les audits déjà terminés conserveront l'ancien SIRET sur leurs attestations et rapports."
          />

          <UFormField
            label="Nouveau SIRET"
            help="14 chiffres exactement, sans espaces."
            required
          >
            <UInput
              v-model="inputValue"
              placeholder="12345678901234"
              icon="i-lucide-hash"
              :ui="{ base: 'font-mono' }"
            />
          </UFormField>

          <p
            v-if="!isValidFormat && inputValue.length > 0"
            class="text-xs text-red-600"
          >
            Le SIRET doit contenir exactement 14 chiffres.
          </p>

          <p
            v-else-if="isUnchanged"
            class="text-xs text-gray-500"
          >
            Saisissez un SIRET différent du SIRET actuel.
          </p>

          <div v-if="previewLoading" class="py-6 text-center text-gray-500">
            <UIcon name="i-lucide-loader" class="w-5 h-5 animate-spin mx-auto mb-2" />
            Calcul des impacts...
          </div>

          <UAlert
            v-else-if="previewError"
            color="error"
            variant="soft"
            icon="i-lucide-circle-x"
            :title="previewError"
          />

          <div v-else-if="preview" class="space-y-3">
            <UAlert
              v-if="preview.blocked"
              color="error"
              variant="soft"
              icon="i-lucide-circle-x"
              title="Opération impossible"
              :description="preview.blocked.reason"
            />

            <div v-if="preview.changes.length > 0">
              <h4 class="text-sm font-semibold text-gray-700 mb-2">Modifications</h4>
              <ul class="space-y-2">
                <li
                  v-for="(change, idx) in preview.changes"
                  :key="`${change.entityId}-${change.field}-${idx}`"
                  class="flex items-start gap-3 p-3 bg-gray-50 rounded-md border border-gray-200"
                >
                  <UIcon name="i-lucide-arrow-right" class="w-4 h-4 mt-1 text-primary flex-shrink-0" />
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-900">{{ change.entityName }}</div>
                    <div class="text-xs text-gray-600 mt-0.5">
                      {{ fieldLabel(change.field) }} :
                      <span class="line-through text-gray-400 font-mono">{{ formatSiretDisplay(String(change.from ?? '')) }}</span>
                      <UIcon name="i-lucide-arrow-right" class="w-3 h-3 inline mx-1 text-gray-400" />
                      <span class="font-semibold text-primary font-mono">{{ formatSiretDisplay(String(change.to ?? '')) }}</span>
                    </div>
                  </div>
                </li>
              </ul>
            </div>

            <UAlert
              v-for="(warning, idx) in preview.warnings"
              :key="`w-${idx}`"
              color="warning"
              variant="soft"
              icon="i-lucide-triangle-alert"
              :description="warning"
            />
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton label="Annuler" color="neutral" variant="outline" @click="handleCancel" />
            <UButton
              label="Modifier le SIRET"
              color="primary"
              :loading="loading"
              :disabled="!canConfirm"
              @click="handleConfirm"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
