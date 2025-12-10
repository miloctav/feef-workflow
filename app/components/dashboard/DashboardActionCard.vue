<script setup lang="ts">
import type { Action } from '~~/server/database/schema'
import { ACTION_TYPE_REGISTRY } from '~~/shared/types/actions'

const props = defineProps<{
  action: Action
}>()

const router = useRouter()

// Format date helper
const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return 'N/A'
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Get action title from registry
const actionTitle = computed(() => {
  const actionDef = ACTION_TYPE_REGISTRY[props.action.type as keyof typeof ACTION_TYPE_REGISTRY]
  return actionDef?.titleFr || props.action.type
})

// Calculate deadline color
const getDeadlineColor = (deadline: Date | string | null | undefined) => {
  if (!deadline) return 'green'

  const now = new Date()
  const deadlineDate = new Date(deadline)
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  if (deadlineDate < now) return 'red' // Overdue
  if (deadlineDate <= sevenDaysFromNow) return 'orange' // Upcoming (within 7 days)
  return 'green' // Normal
}

const deadlineColor = computed(() => getDeadlineColor(props.action.deadline))

// Get color classes based on deadline
const colorClasses = computed(() => {
  switch (deadlineColor.value) {
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
    default: // green
      return {
        border: 'border-green-500',
        bg: 'bg-green-50 dark:bg-green-950/20',
        text: 'text-green-700 dark:text-green-400',
      }
  }
})

// Handle card click - navigate to audit or entity
const handleClick = () => {
  if (props.action.audit?.id) {
    // Navigate to audit page
    router.push(`/feef/audits/${props.action.audit.id}`)
  }
  else if (props.action.entity?.id) {
    // Navigate to entity page
    router.push(`/feef/entities/${props.action.entity.id}`)
  }
}
</script>

<template>
  <div
    :class="[
      'rounded-lg border-l-4 p-3 transition-all hover:shadow-md cursor-pointer',
      colorClasses.border,
      colorClasses.bg,
    ]"
    @click="handleClick"
  >
    <div class="flex flex-col gap-2">
      <!-- Action title -->
      <div class="font-semibold text-gray-900 dark:text-gray-100 text-sm">
        {{ actionTitle }}
      </div>

      <!-- Linked to entity -->
      <div
        v-if="action.entity"
        class="text-xs text-gray-600 dark:text-gray-400"
      >
        <span class="font-medium">Entité :</span>
        {{ action.entity.name }}
      </div>

      <!-- Deadline -->
      <div class="flex items-center gap-2 mt-1">
        <span
          :class="[
            'text-xs font-medium',
            colorClasses.text,
          ]"
        >
          Échéance : {{ formatDate(action.deadline) }}
        </span>
      </div>
    </div>
  </div>
</template>
