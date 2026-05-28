<script setup lang="ts">
import { EntityType, EntityMode } from '#shared/types/enums'
import type { EntityTypeType } from '#shared/types/enums'
import type { AdminPreviewResult } from '~~/app/composables/useEntityAdmin'

/**
 * Modale combinée : sélection d'un parent MASTER + récap des impacts + confirmation.
 * Utilisée pour les actions « Lier » et « Transférer » d'une entité FOLLOWER.
 */

const props = defineProps<{
  entity: {
    id: number
    name: string
    type: EntityTypeType
    parentGroupId?: number | null
  }
  // Type des parents proposés (l'inverse du type de l'entité courante)
  parentType: EntityTypeType
  title: string
  onApplied?: () => void | Promise<void>
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const { previewChange, applyChange, loading } = useEntityAdmin()

const availableParents = ref<Array<{ id: number; name: string }>>([])
const loadingParents = ref(false)
const selectedParentId = ref<number | undefined>(undefined)

const preview = ref<AdminPreviewResult | null>(null)
const previewLoading = ref(false)
const previewError = ref<string | null>(null)

const loadAvailableParents = async () => {
  loadingParents.value = true
  try {
    const params = new URLSearchParams({
      mode: EntityMode.MASTER,
      type: props.parentType,
      limit: '100',
    })
    const response = await $fetch<{ data: Array<{ id: number; name: string }> }>(
      `/api/entities?${params.toString()}`,
    )
    // Exclure l'entité courante elle-même (cas peu probable mais sécurité)
    availableParents.value = response.data.filter((e) => e.id !== props.entity.id)
  } catch {
    availableParents.value = []
  } finally {
    loadingParents.value = false
  }
}

const parentItems = computed(() =>
  availableParents.value.map((e) => ({ label: e.name, value: e.id })),
)

const loadPreview = async () => {
  if (!selectedParentId.value) {
    preview.value = null
    return
  }
  previewLoading.value = true
  previewError.value = null
  preview.value = null
  const result = await previewChange(props.entity.id, {
    parentGroupId: selectedParentId.value,
  })
  if (result.success && result.data) {
    preview.value = result.data
  } else {
    previewError.value = result.error ?? 'Erreur lors du calcul des impacts'
  }
  previewLoading.value = false
}

watch(isOpen, (open) => {
  if (open) {
    selectedParentId.value = undefined
    preview.value = null
    previewError.value = null
    loadAvailableParents()
  }
})

watch(selectedParentId, () => {
  if (isOpen.value) loadPreview()
})

const handleConfirm = async () => {
  if (!selectedParentId.value || !preview.value || preview.value.blocked) return
  const result = await applyChange(props.entity.id, {
    parentGroupId: selectedParentId.value,
  })
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

const selectLabel = computed(() =>
  props.parentType === EntityType.GROUP ? 'Groupe maître' : 'Entreprise maître',
)

const fieldLabel = (field: 'mode' | 'type' | 'parentGroupId') => {
  if (field === 'mode') return 'Mode'
  if (field === 'type') return 'Type'
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

        <div class="space-y-4">
          <UFormField :label="selectLabel">
            <USelectMenu
              v-model="selectedParentId"
              :items="parentItems"
              :loading="loadingParents"
              value-key="value"
              placeholder="Sélectionner un maître..."
              searchable
              class="w-full"
            />
          </UFormField>

          <p v-if="parentItems.length === 0 && !loadingParents" class="text-sm text-gray-500">
            Aucun maître compatible disponible.
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

            <div v-else-if="preview.changes.length > 0">
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
                      <span class="line-through text-gray-400">{{ change.fromLabel }}</span>
                      <UIcon name="i-lucide-arrow-right" class="w-3 h-3 inline mx-1 text-gray-400" />
                      <span class="font-semibold text-primary">{{ change.toLabel }}</span>
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
              label="Confirmer"
              color="primary"
              :loading="loading"
              :disabled="!selectedParentId || !preview || !!preview?.blocked || previewLoading"
              @click="handleConfirm"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
