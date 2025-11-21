<template>
  <div 
    :class="[
      'text-center p-4 rounded-lg border transition-all duration-200',
      cardClasses,
      {
        'cursor-pointer hover:shadow-md group': clickable,
        'opacity-50': disabled
      }
    ]"
    @click="clickable && !disabled ? $emit('click') : null"
  >
    <!-- Icône -->
    <UIcon
      :name="currentIcon"
      :class="[
        'w-6 h-6 mx-auto mb-2',
        iconClasses,
        {
          'transition-transform group-hover:scale-110': clickable && !disabled
        }
      ]"
    />

    <!-- Titre -->
    <h5 class="text-sm font-medium text-gray-900 mb-1">{{ title }}</h5>

    <!-- Contenu -->
    <div class="space-y-2">
      <!-- Badge de statut -->
      <UBadge
        :color="badgeColor"
        variant="solid"
        size="xs"
      >
        {{ badgeLabel }}
      </UBadge>

      <!-- Slot pour le contenu personnalisé -->
      <slot name="content" />

      <!-- Slot pour les actions -->
      <slot name="actions" />

      <!-- Indicateur cliquable si applicable -->
      <div v-if="clickable && !disabled" class="flex items-center justify-center gap-1 text-xs text-gray-600">
        <span>{{ clickableText || 'Cliquer pour consulter' }}</span>
        <UIcon name="i-lucide-external-link" class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string
  state: 'disabled' | 'pending' | 'success' | 'warning' | 'error'

  // Icônes pour chaque état
  iconDisabled?: string
  iconPending?: string
  iconSuccess?: string
  iconWarning?: string
  iconError?: string

  // Labels pour les badges
  labelDisabled?: string
  labelPending?: string
  labelSuccess?: string
  labelWarning?: string
  labelError?: string

  // Couleurs personnalisées (optionnel)
  colorScheme?: 'green' | 'blue' | 'orange' | 'yellow' | 'gray'

  // Comportement
  clickable?: boolean
  clickableText?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  iconDisabled: 'i-lucide-lock',
  iconPending: 'i-lucide-clock',
  iconSuccess: 'i-lucide-check-circle',
  iconWarning: 'i-lucide-alert-circle',
  iconError: 'i-lucide-x-circle',

  labelDisabled: 'En attente',
  labelPending: 'En cours',
  labelSuccess: 'Terminé',
  labelWarning: 'À faire',
  labelError: 'Erreur',

  colorScheme: 'blue',
  clickable: false,
  disabled: false
})

defineEmits<{
  click: []
}>()

// Mapping des couleurs selon l'état
const stateColorMap = {
  green: {
    disabled: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-400' },
    pending: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' },
    success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' },
    warning: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600' },
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600' }
  },
  blue: {
    disabled: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-400' },
    pending: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-600' },
    success: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
    warning: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600' },
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600' }
  },
  orange: {
    disabled: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-400' },
    pending: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600' },
    success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' },
    warning: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600' },
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600' }
  },
  yellow: {
    disabled: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-400' },
    pending: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-600' },
    success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' },
    warning: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600' },
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600' }
  },
  gray: {
    disabled: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-400' },
    pending: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600' },
    success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600' },
    warning: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600' },
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600' }
  }
}

// Mapping des couleurs de badge
const badgeColorMap = {
  disabled: 'neutral',
  pending: 'warning',
  success: 'success',
  warning: 'warning',
  error: 'error'
}

// Computed pour l'icône courante
const currentIcon = computed(() => {
  const actualState = props.disabled ? 'disabled' : props.state
  switch (actualState) {
    case 'disabled': return props.iconDisabled
    case 'pending': return props.iconPending
    case 'success': return props.iconSuccess
    case 'warning': return props.iconWarning
    case 'error': return props.iconError
    default: return props.iconPending
  }
})

// Computed pour les classes de la card
const cardClasses = computed(() => {
  const actualState = props.disabled ? 'disabled' : props.state
  const colors = stateColorMap[props.colorScheme][actualState]
  let classes = `${colors.bg} ${colors.border}`
  
  // Ajouter hover effect si cliquable
  if (props.clickable && actualState === 'success') {
    classes += ' hover:bg-blue-100'
  }
  
  return classes
})

// Computed pour les classes de l'icône
const iconClasses = computed(() => {
  const actualState = props.disabled ? 'disabled' : props.state
  const colors = stateColorMap[props.colorScheme][actualState]
  return colors.text
})

// Computed pour la couleur du badge
const badgeColor = computed(() => {
  const actualState = props.disabled ? 'disabled' : props.state
  return badgeColorMap[actualState] as 'success' | 'warning' | 'neutral' | 'error'
})

// Computed pour le label du badge
const badgeLabel = computed(() => {
  const actualState = props.disabled ? 'disabled' : props.state
  switch (actualState) {
    case 'disabled': return props.labelDisabled
    case 'pending': return props.labelPending
    case 'success': return props.labelSuccess
    case 'warning': return props.labelWarning
    case 'error': return props.labelError
    default: return props.labelPending
  }
})
</script>