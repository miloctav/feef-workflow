<script setup lang="ts">
import { computed } from 'vue'
import type { Action } from '~~/server/database/schema'
import { ACTION_TYPE_REGISTRY } from '~~/shared/types/actions'

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

// Get the French label for an action type
const getActionLabel = (actionType: string) => {
  const actionDef = ACTION_TYPE_REGISTRY[actionType as keyof typeof ACTION_TYPE_REGISTRY]
  return actionDef?.titleFr || actionType
}

// Get the description for an action type
const getActionDescription = (actionType: string) => {
  const actionDef = ACTION_TYPE_REGISTRY[actionType as keyof typeof ACTION_TYPE_REGISTRY]
  return actionDef?.descriptionFr || ''
}

// Calculate deadline urgency and return color class
const getDeadlineColor = (deadline: Date | string | null | undefined) => {
  if (!deadline) return 'blue'

  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diffTime = deadlineDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'red' // Overdue
  if (diffDays <= 7) return 'orange' // Within 7 days
  return 'blue' // Normal
}

// Get border and background classes based on color
const getColorClasses = (color: string) => {
  switch (color) {
    case 'red':
      return {
        border: 'border-red-500',
        bg: 'bg-red-50 dark:bg-red-950/20',
        text: 'text-red-700 dark:text-red-400',
      }
    case 'orange':
      return {
        border: 'border-orange-500',
        bg: 'bg-orange-50 dark:bg-orange-950/20',
        text: 'text-orange-700 dark:text-orange-400',
      }
    default: // blue
      return {
        border: 'border-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-950/20',
        text: 'text-blue-700 dark:text-blue-400',
      }
  }
}
</script>

<template>
  <div class="flex justify-center">
    <div class="w-full max-w-3xl">
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
          <div
            v-for="(action, index) in safeActions"
            :key="`action-${action.id}-${index}`"
            :class="[
              'rounded-lg border-l-4 p-4 transition-all hover:shadow-md',
              getColorClasses(getDeadlineColor(action.deadline)).border,
              getColorClasses(getDeadlineColor(action.deadline)).bg,
            ]"
          >
            <div class="flex flex-col gap-2">
              <div class="text-gray-900 dark:text-gray-100">
                <span class="font-semibold">{{ getActionLabel(action.type) }}</span>
                <span
                  v-if="getActionDescription(action.type)"
                  class="text-sm text-gray-600 dark:text-gray-400"
                >
                  — {{ getActionDescription(action.type) }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span
                  :class="[
                    'text-sm font-medium',
                    getColorClasses(getDeadlineColor(action.deadline)).text,
                  ]"
                >
                  Échéance : {{ formatDate(action.deadline) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
