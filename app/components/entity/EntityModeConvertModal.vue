<script setup lang="ts">
import { EntityMode } from '#shared/types/enums'
import type { AdminChangeBody, AdminPreviewResult } from '~~/app/composables/useEntityAdmin'

/**
 * Cas particulier : conversion d'une FOLLOWER en MASTER alors qu'elle a déjà
 * un parentGroupId. L'utilisateur doit choisir entre :
 *   - détacher : couper le lien, l'entité devient MASTER indépendant
 *   - inverser : conserver le lien, le parent actuel devient FOLLOWER
 */

const props = defineProps<{
  entity: {
    id: number
    name: string
    parentGroupId?: number | null
    parentGroup?: { id: number; name: string } | null
  }
  onApplied?: () => void | Promise<void>
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const { previewChange, applyChange, loading } = useEntityAdmin()

type Choice = 'detach' | 'swap'
const selectedChoice = ref<Choice>('detach')
const preview = ref<AdminPreviewResult | null>(null)
const previewLoading = ref(false)
const previewError = ref<string | null>(null)

const buildBody = (choice: Choice): AdminChangeBody => {
  if (choice === 'swap') {
    return { swapWithParent: true }
  }
  return {
    mode: EntityMode.MASTER,
    parentGroupId: null,
  }
}

const loadPreview = async () => {
  previewLoading.value = true
  previewError.value = null
  preview.value = null
  const body = buildBody(selectedChoice.value)
  const result = await previewChange(props.entity.id, body)
  if (result.success && result.data) {
    preview.value = result.data
  } else {
    previewError.value = result.error ?? 'Erreur lors du calcul des impacts'
  }
  previewLoading.value = false
}

watch(isOpen, (open) => {
  if (open) {
    selectedChoice.value = 'detach'
    loadPreview()
  }
})

watch(selectedChoice, () => {
  if (isOpen.value) loadPreview()
})

const handleConfirm = async () => {
  if (!preview.value || preview.value.blocked) return
  const body = buildBody(selectedChoice.value)
  const result = await applyChange(props.entity.id, body)
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

const parentName = computed(() => props.entity.parentGroup?.name ?? `Parent #${props.entity.parentGroupId}`)

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
          <h3 class="text-lg font-semibold">
            Convertir « {{ entity.name }} » en Maître
          </h3>
          <p class="text-sm text-gray-500 mt-1">
            Cette entité est actuellement liée à « {{ parentName }} ». Choisissez comment gérer ce lien.
          </p>
        </template>

        <div class="space-y-4">
          <!-- Choix entre détacher et inverser -->
          <div class="space-y-2">
            <label
              class="flex items-start gap-3 p-4 border rounded-md cursor-pointer transition-colors"
              :class="selectedChoice === 'detach' ? 'border-primary bg-primary-50' : 'border-gray-200 hover:border-gray-300'"
            >
              <input
                v-model="selectedChoice"
                type="radio"
                value="detach"
                class="mt-1"
              />
              <div class="flex-1">
                <div class="font-medium text-gray-900">Détacher du parent</div>
                <p class="text-sm text-gray-600 mt-1">
                  Le lien avec « {{ parentName }} » est coupé. L'entité devient Maître indépendant. Le parent conserve son rôle.
                </p>
              </div>
            </label>

            <label
              class="flex items-start gap-3 p-4 border rounded-md cursor-pointer transition-colors"
              :class="selectedChoice === 'swap' ? 'border-primary bg-primary-50' : 'border-gray-200 hover:border-gray-300'"
            >
              <input
                v-model="selectedChoice"
                type="radio"
                value="swap"
                class="mt-1"
              />
              <div class="flex-1">
                <div class="font-medium text-gray-900">Inverser les rôles</div>
                <p class="text-sm text-gray-600 mt-1">
                  Le lien est conservé mais inversé : « {{ entity.name }} » devient Maître, « {{ parentName }} » devient Suiveuse.
                </p>
              </div>
            </label>
          </div>

          <!-- Récap -->
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
              :disabled="!preview || !!preview?.blocked || previewLoading"
              @click="handleConfirm"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
