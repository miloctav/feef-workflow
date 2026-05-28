<script setup lang="ts">
import type { AdminPreviewResult } from '~~/app/composables/useEntityAdmin'

/**
 * Modale FEEF de modification de l'OE rattaché à une entité.
 *
 * Permet de basculer entre un OE actif et un autre, ou de repasser en mode
 * appel d'offre (oeId = null). Reproduit les garde-fous de assign-oe.post.ts :
 * pas de changement possible si un audit est en cours, sauf si le dernier audit
 * est en PENDING_OE_CHOICE / PENDING_CASE_APPROVAL ou s'il s'agit d'un suivi
 * terminé.
 */

const props = defineProps<{
  entity: {
    id: number
    name: string
    oeId?: number | null
    oe?: { id: number; name: string } | null
    allowOeDocumentsAccess?: boolean
  }
  onApplied?: () => void | Promise<void>
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const { fetchOesForSelect } = useOes()
const { previewChange, applyChange, loading } = useEntityAdmin()

// État local
const availableOes = ref<Array<{ id: number; name: string }>>([])
const loadingOes = ref(false)
// undefined = rien sélectionné, null = appel d'offre, number = OE choisi
const selectedOeId = ref<number | null | undefined>(undefined)
const allowOeAccess = ref(true)

const preview = ref<AdminPreviewResult | null>(null)
const previewLoading = ref(false)
const previewError = ref<string | null>(null)

const loadOes = async () => {
  loadingOes.value = true
  try {
    const list = await fetchOesForSelect({ includeAll: false })
    availableOes.value = list
      .filter((oe) => oe.value !== null)
      .map((oe) => ({ id: oe.value as number, name: oe.label }))
  } catch {
    availableOes.value = []
  } finally {
    loadingOes.value = false
  }
}

const oeItems = computed(() => {
  return [
    { label: 'Appel d\'offre (aucun OE)', value: null as number | null },
    ...availableOes.value.map((oe) => ({ label: oe.name, value: oe.id as number | null })),
  ]
})

const isSelectionChanged = computed(() => {
  if (selectedOeId.value === undefined) return false
  return selectedOeId.value !== (props.entity.oeId ?? null)
})

const runPreview = async () => {
  if (!isSelectionChanged.value) {
    preview.value = null
    previewError.value = null
    return
  }
  previewLoading.value = true
  previewError.value = null
  preview.value = null
  const body: { oeId: number | null; allowOeDocumentsAccess?: boolean } = {
    oeId: selectedOeId.value === undefined ? null : selectedOeId.value,
  }
  if (body.oeId !== null) {
    body.allowOeDocumentsAccess = allowOeAccess.value
  }
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
    selectedOeId.value = props.entity.oeId ?? null
    allowOeAccess.value = props.entity.allowOeDocumentsAccess ?? true
    preview.value = null
    previewError.value = null
    loadOes()
  }
})

watch([selectedOeId, allowOeAccess], () => {
  if (!isOpen.value) return
  runPreview()
})

const handleConfirm = async () => {
  if (!isSelectionChanged.value) return
  if (!preview.value || preview.value.blocked) return
  const body: { oeId: number | null; allowOeDocumentsAccess?: boolean } = {
    oeId: selectedOeId.value === undefined ? null : selectedOeId.value,
  }
  if (body.oeId !== null) {
    body.allowOeDocumentsAccess = allowOeAccess.value
  }
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

const fieldLabel = (field: 'mode' | 'type' | 'parentGroupId' | 'siret' | 'oeId') => {
  if (field === 'mode') return 'Mode'
  if (field === 'type') return 'Type'
  if (field === 'siret') return 'SIRET'
  if (field === 'oeId') return 'OE rattaché'
  return 'Lien parent'
}

const canConfirm = computed(() => {
  if (!isSelectionChanged.value) return false
  if (previewLoading.value) return false
  if (!preview.value) return false
  if (preview.value.blocked) return false
  return preview.value.changes.length > 0
})

const showAccessCheckbox = computed(() => selectedOeId.value !== null && selectedOeId.value !== undefined)
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Modifier l'OE rattaché à « {{ entity.name }} »</h3>
        </template>

        <div class="space-y-4">
          <UAlert
            color="info"
            variant="soft"
            icon="i-lucide-info"
            title="Garde-fous"
            description="Le changement d'OE n'est possible que si aucun audit n'est en cours, ou si le dernier audit est en attente de choix d'OE / d'approbation du dossier, ou s'il s'agit d'un audit de suivi terminé."
          />

          <UFormField label="Organisme évaluateur" required>
            <USelectMenu
              v-model="selectedOeId"
              :items="oeItems"
              :loading="loadingOes"
              value-key="value"
              placeholder="Sélectionner un OE..."
              searchable
              class="w-full"
            />
          </UFormField>

          <UFormField
            v-if="showAccessCheckbox"
            label="Accès aux documents"
          >
            <UCheckbox
              v-model="allowOeAccess"
              label="Autoriser le nouvel OE à consulter les documents de l'entité"
            />
          </UFormField>

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
              label="Modifier l'OE"
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
