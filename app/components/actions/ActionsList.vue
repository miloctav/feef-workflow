<script setup lang="ts">
import { computed } from 'vue'
import type { Action } from '~~/server/database/schema'

const props = defineProps<{
  actions: Action[] | null | undefined
  loading?: boolean
  error?: string | null
}>()

const hasActions = computed(() => Array.isArray(props.actions) && props.actions.length > 0)

</script>

<template>
  <div>
    <div v-if="props.loading" class="mb-4">
      <UAlert color="primary" icon="i-lucide-loader-2" title="Chargement des actions..." />
    </div>
    <div v-else-if="props.error" class="mb-4">
      <UAlert color="error" icon="i-lucide-alert-triangle" :title="props.error" />
    </div>
    <div v-else-if="hasActions">
      <div class="space-y-3">
        <UAlert
          v-for="action in props.actions"
          :key="action.id"
          :title="action.type"
          :description="action.metadata?.label || ''"
          :color="action.status === 'COMPLETED' ? 'success' : action.status === 'OVERDUE' ? 'warning' : 'primary'"
          :icon="action.status === 'COMPLETED' ? 'i-lucide-check-circle' : action.status === 'OVERDUE' ? 'i-lucide-alert-triangle' : 'i-lucide-circle'"
        >
          <template #description>
            <div class="flex flex-col gap-1">
              <span v-if="action.metadata?.label">{{ action.metadata.label }}</span>
              <span class="text-xs text-gray-500">Échéance : {{ action.deadline ? $dayjs(action.deadline).format('DD/MM/YYYY') : 'N/A' }}</span>
              <span class="text-xs text-gray-500">Statut : {{ action.status }}</span>
            </div>
          </template>
        </UAlert>
      </div>
    </div>
  </div>
</template>
