<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Action } from '~~/server/database/schema'
import { ACTION_TYPE_REGISTRY } from '~~/shared/types/actions'

// Define a more flexible type for the action prop that includes relations and allows readonly arrays
interface ActionProp {
  id: number
  type: string
  status: string
  deadline: Date | string | null
  assignedRoles: string[] | readonly string[]
  entityId: number
  auditId?: number | null
  deletedAt?: Date | null
  metadata?: any
  entity?: {
    id: number
    name: string
  } | null
  audit?: {
    id: number
    oe?: {
      id: number
      name: string
    } | null
  } | null
  [key: string]: any
}

const props = withDefaults(
  defineProps<{
    action: ActionProp
    clickable?: boolean
    compact?: boolean
    hideRoles?: boolean
    showContext?: boolean
    hideDescription?: boolean
  }>(),
  {
    clickable: true,
    compact: false,
    hideRoles: false,
    showContext: false,
    hideDescription: false,
  }
)

const emit = defineEmits<{
  'action-completed': [action: Action]
}>()

// Get current user from session
const { user } = useUserSession()

// Completion state
const isCompleting = ref(false)

// Check if user can manually complete (FEEF only)
const canManualComplete = computed(() => {
  return (
    user.value?.role === 'FEEF' &&
    props.action.status === 'PENDING' &&
    !props.action.deletedAt &&
    !props.compact
  )
})

const route = useRoute()

// Detect role from current route
const rolePrefix = computed(() => {
  const path = route.path
  if (path.startsWith('/feef')) return '/feef'
  if (path.startsWith('/oe')) return '/oe'
  if (path.startsWith('/entity')) return '/entity'
  if (path.startsWith('/auditor')) return '/auditor'
  return '/feef' // fallback
})

// Build navigation URL based on action context
const navigationUrl = computed(() => {
  if (!props.action) return null

  // Cas spécial : rediriger vers la page des contrats pour choisir l'OE
  if (props.action.type === 'ENTITY_CHOOSE_OE' && rolePrefix.value === '/entity') {
    return '/entity/contracts'
  }

  // If action has auditId: navigate to audit detail
  if (props.action.auditId) {
    return `${rolePrefix.value}/audits/${props.action.auditId}`
  }

  // If action has no auditId: navigate to entity detail
  if (props.action.entityId) {
    // Special case for ENTITY role: they have only one entity (their own)
    if (rolePrefix.value === '/entity') {
      return '/entity/index'
    }
    return `${rolePrefix.value}/entities/${props.action.entityId}`
  }

  return null
})

const handleClick = () => {
  if (props.clickable && navigationUrl.value) {
    navigateTo(navigationUrl.value)
  }
}

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
  const baseTitle = actionDef?.titleFr || actionType

  // Cas spécial : afficher le type de plan pour ENTITY_UPLOAD_CORRECTIVE_PLAN
  if (actionType === 'ENTITY_UPLOAD_CORRECTIVE_PLAN' && props.action.metadata?.actionPlanType) {
    const planTypeLabel =
      props.action.metadata.actionPlanType === 'SHORT' ? 'COURT TERME' : 'LONG TERME'
    return `${baseTitle} (${planTypeLabel})`
  }

  return baseTitle
}

// Get the description for an action type
const getActionDescription = (actionType: string) => {
  const actionDef = ACTION_TYPE_REGISTRY[actionType as keyof typeof ACTION_TYPE_REGISTRY]
  const baseDescription = actionDef?.descriptionFr || ''

  // Cas spécial : ajouter des détails sur le type de plan pour ENTITY_UPLOAD_CORRECTIVE_PLAN
  if (actionType === 'ENTITY_UPLOAD_CORRECTIVE_PLAN' && props.action.metadata?.actionPlanType) {
    const planTypeDetails =
      props.action.metadata.actionPlanType === 'SHORT'
        ? "Plan d'action court terme (15 jours) requis suite à des non-conformités mineures."
        : "Plan d'action long terme (6 mois) requis suite à un score global inférieur à 65."
    return `${baseDescription}. ${planTypeDetails}`
  }

  return baseDescription
}

// Calculate deadline urgency and return color class
const getDeadlineColor = (deadline: Date | string | null | undefined) => {
  if (!deadline) return 'green'

  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diffTime = deadlineDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'red' // Overdue
  if (diffDays <= 7) return 'orange' // Within 7 days
  return 'green' // Normal
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
    default: // green
      return {
        border: 'border-green-500',
        bg: 'bg-green-50 dark:bg-green-950/20',
        text: 'text-green-700 dark:text-green-400',
      }
  }
}

// Get French label for a role
const getRoleLabel = (role: string) => {
  switch (role) {
    case 'FEEF':
      return 'FEEF'
    case 'OE':
      return 'OE'
    case 'AUDITOR':
      return 'Auditeur'
    case 'ENTITY':
      return 'Entreprise'
    default:
      return role
  }
}

// Get badge color for a role
const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'FEEF':
      return 'primary'
    case 'OE':
      return 'info'
    case 'AUDITOR':
      return 'secondary'
    case 'ENTITY':
      return 'success'
    default:
      return 'neutral'
  }
}

// Computed card classes
const cardClasses = computed(() => [
  'rounded-lg border-l-4 transition-all relative',
  props.compact ? 'p-3' : 'p-4',
  props.clickable && navigationUrl.value
    ? 'hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer'
    : '',
  getColorClasses(getDeadlineColor(props.action.deadline)).border,
  getColorClasses(getDeadlineColor(props.action.deadline)).bg,
])

// Handle manual completion
const handleManualComplete = async (close: () => void) => {
  isCompleting.value = true

  try {
    const result = await $fetch(`/api/actions/${props.action.id}/complete`, {
      method: 'PUT',
    })

    const toast = useToast()
    toast.add({
      title: 'Action complétée',
      description: result.data.transitioned
        ? `Action complétée et audit transitionné vers ${result.data.newStatus}`
        : 'Action complétée avec succès',
      color: 'success',
    })

    emit('action-completed', result.data.action)
    close()
  } catch (error: any) {
    const toast = useToast()
    toast.add({
      title: 'Erreur',
      description: error.data?.message || "Erreur lors de la complétion de l'action",
      color: 'error',
    })
  } finally {
    isCompleting.value = false
  }
}
</script>

<template>
  <div
    :class="cardClasses"
    @click="handleClick"
  >
    <div class="flex flex-col gap-3">
      <!-- Role badges -->
      <div
        v-if="!hideRoles"
        class="flex flex-wrap gap-2"
      >
        <UBadge
          v-for="role in action.assignedRoles"
          :key="role"
          :color="getRoleBadgeColor(role)"
          variant="soft"
          size="xs"
        >
          {{ getRoleLabel(role) }}
        </UBadge>
      </div>

      <!-- Action title and description -->
      <div class="text-gray-900 dark:text-gray-100">
        <div class="font-semibold mb-1">
          {{ getActionLabel(action.type) }}
        </div>
        <div
          v-if="!hideDescription && getActionDescription(action.type)"
          class="text-sm text-gray-600 dark:text-gray-400"
        >
          {{ getActionDescription(action.type) }}
        </div>
      </div>

      <!-- Footer: Deadline + Context -->
      <div class="flex items-end justify-between mt-1">
        <!-- Deadline -->
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-clock"
            :class="['w-4 h-4', getColorClasses(getDeadlineColor(action.deadline)).text]"
          />
          <span
            :class="[
              'text-sm font-medium',
              getColorClasses(getDeadlineColor(action.deadline)).text,
            ]"
          >
            {{ formatDate(action.deadline) }}
          </span>
        </div>

        <!-- Context (Entity/OE) available via showContext prop -->
        <div
          v-if="showContext"
          class="flex flex-col items-end text-xs text-gray-600 dark:text-gray-400 text-right ml-2"
        >
          <div v-if="action.entity">
            <span class="font-medium">Entité :</span> {{ action.entity.name }}
          </div>
          <div v-if="action.audit?.oe">
            <span class="font-medium">OE :</span> {{ action.audit.oe.name }}
          </div>
        </div>
      </div>
    </div>

    <!-- Manual completion button with modal (top-right corner) -->
    <UModal
      v-if="canManualComplete"
      title="Compléter manuellement cette action ?"
      :ui="{ footer: 'justify-end' }"
    >
      <!-- Button trigger in absolute position -->
      <div
        class="absolute top-2 right-2"
        @click.stop
      >
        <UTooltip text="Compléter manuellement">
          <UButton
            icon="i-lucide-check-circle"
            size="xs"
            color="primary"
            variant="ghost"
            :disabled="isCompleting"
          />
        </UTooltip>
      </div>

      <template #body>
        <div class="space-y-4">
          <!-- Warning message -->
          <div
            class="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800"
          >
            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-alert-triangle"
                class="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5"
              />
              <div class="text-sm text-orange-700 dark:text-orange-400">
                <p class="font-medium mb-1">Attention : Complétion manuelle</p>
                <p>
                  Cette action sera marquée comme complétée en contournant le système automatique.
                  Cette opération est irréversible.
                </p>
              </div>
            </div>
          </div>

          <!-- Action details -->
          <div class="space-y-2">
            <div>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Action :</span>
              <p class="text-sm text-gray-900 dark:text-gray-100">
                {{ getActionLabel(action.type) }}
              </p>
            </div>

            <div v-if="getActionDescription(action.type)">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300"
                >Description :</span
              >
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ getActionDescription(action.type) }}
              </p>
            </div>

            <div>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Échéance :</span>
              <p class="text-sm text-gray-900 dark:text-gray-100">
                {{ formatDate(action.deadline) }}
              </p>
            </div>
          </div>
        </div>
      </template>

      <template #footer="{ close }">
        <UButton
          label="Annuler"
          color="neutral"
          variant="outline"
          :disabled="isCompleting"
          @click="close"
        />
        <UButton
          label="Compléter"
          color="primary"
          icon="i-lucide-check"
          :loading="isCompleting"
          @click="handleManualComplete(close)"
        />
      </template>
    </UModal>
  </div>
</template>
