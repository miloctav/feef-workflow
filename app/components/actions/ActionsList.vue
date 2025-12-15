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
</script>

<template>
  <div class="flex justify-center">
    <div class="w-full">
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
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ActionCard
            v-for="(action, index) in safeActions"
            :key="`action-${action.id}-${index}`"
            :action="action"
            :clickable="true"
          />
        </div>
      </div>
    </div>
  </div>
</template>
