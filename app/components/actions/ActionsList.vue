<script setup lang="ts">
import { computed } from 'vue'
import type { Action } from '~~/server/database/schema'

const props = withDefaults(
  defineProps<{
    actions?: Action[] | null
    loading?: boolean
    error?: string | null
  }>(),
  {
    actions: () => [],
    loading: false,
    error: null,
  }
)

// Create a local computed that ensures we always have a valid array
const safeActions = computed(() => {
  if (!props.actions || !Array.isArray(props.actions)) {
    return []
  }
  return props.actions.filter((action) => action && action.id)
})

const hasActions = computed(() => safeActions.value.length > 0)

// Format date helper function
const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return 'N/A'
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
</script>

<template>
  <div>
    <div
      v-if="props.loading"
      class="mb-4"
    >
      <UAlert
        color="primary"
        icon="i-lucide-loader-2"
        title="Chargement des actions..."
      />
    </div>
    <div
      v-else-if="props.error"
      class="mb-4"
    >
      <UAlert
        color="error"
        icon="i-lucide-alert-triangle"
        :title="props.error"
      />
    </div>
    <div v-else-if="hasActions">
      <div class="space-y-3">
        <UAlert
          v-for="(action, index) in safeActions"
          :key="`action-${action.id}-${index}`"
          :title="action.type"
          :description="action.metadata?.label || ''"
          :color="
            action.status === 'COMPLETED'
              ? 'success'
              : action.status === 'OVERDUE'
              ? 'warning'
              : 'primary'
          "
          :icon="
            action.status === 'COMPLETED'
              ? 'i-lucide-check-circle'
              : action.status === 'OVERDUE'
              ? 'i-lucide-alert-triangle'
              : 'i-lucide-circle'
          "
        >
          <template #description>
            <div class="flex flex-col gap-1">
              <span v-if="action.metadata?.label">{{ action.metadata.label }}</span>
              <span class="text-xs text-gray-500"
                >Échéance : {{ formatDate(action.deadline) }}</span
              >
              <span class="text-xs text-gray-500">Statut : {{ action.status }}</span>
            </div>
          </template>
        </UAlert>
      </div>
    </div>
  </div>
</template>
