<script setup lang="ts">
import type { AdminChangeBody, AdminPreviewResult } from '~~/app/composables/useEntityAdmin'

const props = defineProps<{
  entityId: number
  body: AdminChangeBody | null
  title: string
  confirmLabel?: string
  onApplied?: () => void | Promise<void>
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const { previewChange, applyChange, loading } = useEntityAdmin()

const preview = ref<AdminPreviewResult | null>(null)
const previewLoading = ref(false)
const previewError = ref<string | null>(null)

const loadPreview = async () => {
  if (!props.body) return
  previewLoading.value = true
  previewError.value = null
  preview.value = null
  const result = await previewChange(props.entityId, props.body)
  if (result.success && result.data) {
    preview.value = result.data
  } else {
    previewError.value = result.error ?? 'Erreur lors du calcul des impacts'
  }
  previewLoading.value = false
}

watch(
  () => [isOpen.value, props.body],
  ([open]) => {
    if (open && props.body) {
      loadPreview()
    }
  },
)

const handleConfirm = async () => {
  if (!props.body || !preview.value || preview.value.blocked) return
  const result = await applyChange(props.entityId, props.body)
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

const isBlocked = computed(() => !!preview.value?.blocked)
const hasChanges = computed(() => (preview.value?.changes.length ?? 0) > 0)

const fieldLabel = (field: 'mode' | 'type' | 'parentGroupId' | 'siret' | 'oeId') => {
  if (field === 'mode') return 'Mode'
  if (field === 'type') return 'Type'
  if (field === 'siret') return 'SIRET'
  if (field === 'oeId') return 'OE rattaché'
  return 'Lien parent'
}
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">{{ title }}</h3>
        </template>

        <div v-if="previewLoading" class="py-8 text-center text-gray-500">
          <UIcon name="i-lucide-loader" class="w-6 h-6 animate-spin mx-auto mb-2" />
          Calcul des impacts...
        </div>

        <div v-else-if="previewError" class="py-4">
          <UAlert
            color="error"
            variant="soft"
            icon="i-lucide-circle-x"
            :title="previewError"
          />
        </div>

        <div v-else-if="preview" class="space-y-4">
          <!-- Blocage -->
          <UAlert
            v-if="preview.blocked"
            color="error"
            variant="soft"
            icon="i-lucide-circle-x"
            title="Opération impossible"
            :description="preview.blocked.reason"
          />

          <!-- Récap des changements -->
          <div v-if="hasChanges">
            <h4 class="text-sm font-semibold text-gray-700 mb-2">
              Modifications à appliquer
            </h4>
            <ul class="space-y-2">
              <li
                v-for="(change, idx) in preview.changes"
                :key="`${change.entityId}-${change.field}-${idx}`"
                class="flex items-start gap-3 p-3 bg-gray-50 rounded-md border border-gray-200"
              >
                <UIcon
                  name="i-lucide-arrow-right"
                  class="w-4 h-4 mt-1 text-primary flex-shrink-0"
                />
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-gray-900">
                    {{ change.entityName }}
                  </div>
                  <div class="text-xs text-gray-600 mt-0.5">
                    {{ fieldLabel(change.field) }} :
                    <span class="line-through text-gray-400">{{ change.fromLabel }}</span>
                    <UIcon name="i-lucide-arrow-right" class="w-3 h-3 inline mx-1 text-gray-400" />
                    <span class="font-semibold text-primary">{{ change.toLabel }}</span>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <!-- Avertissements -->
          <div v-if="preview.warnings.length > 0" class="space-y-2">
            <UAlert
              v-for="(warning, idx) in preview.warnings"
              :key="idx"
              color="warning"
              variant="soft"
              icon="i-lucide-triangle-alert"
              :description="warning"
            />
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              label="Annuler"
              color="neutral"
              variant="outline"
              @click="handleCancel"
            />
            <UButton
              :label="confirmLabel ?? 'Confirmer'"
              color="primary"
              :loading="loading"
              :disabled="isBlocked || !hasChanges || previewLoading"
              @click="handleConfirm"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
