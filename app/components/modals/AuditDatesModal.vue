<template>
  <UModal 
    title="Dates d'audit"
    :ui="{ 
      content: 'w-full max-w-lg',
      footer: 'justify-end' 
    }"
  >
    <!-- Bouton déclencheur -->
    <UButton
      v-if="!hasPlannedDates"
      size="xs"
      color="primary"
      variant="outline"
      icon="i-lucide-calendar"
      label="Programmer les dates"
    />
    <UButton
      v-else
      size="xs"
      color="neutral"
      variant="outline"
      icon="i-lucide-edit"
      label="Modifier"
    />

    <template #body>
      <div class="space-y-6">
        <!-- Dates prévisionnelles -->
        <div class="space-y-4">
          <h4 class="font-medium text-gray-900">Dates prévisionnelles</h4>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Date de début prévue
              </label>
              <UInput
                v-model="form.plannedStartDate"
                type="date"
                required
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Date de fin prévue
              </label>
              <UInput
                v-model="form.plannedEndDate"
                type="date"
                :min="form.plannedStartDate"
                required
              />
            </div>
          </div>

          <div v-if="form.plannedStartDate" class="p-3 bg-blue-50 rounded-lg">
            <div class="flex items-start gap-2">
              <UIcon name="i-lucide-info" class="w-4 h-4 text-blue-600 mt-0.5" />
              <div class="text-sm text-blue-800">
                <p class="font-medium mb-1">Date limite de dépôt des documents</p>
                <p>{{ depositDeadline }}</p>
                <p class="text-xs text-blue-600 mt-1">
                  (15 jours avant le début de l'audit)
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Dates réelles (optionnel si l'audit a déjà eu lieu) -->
        <div v-if="showActualDates" class="space-y-4">
          <div class="flex items-center gap-2">
            <h4 class="font-medium text-gray-900">Dates réelles</h4>
            <UBadge size="xs" color="neutral">Optionnel</UBadge>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Date de début réelle
              </label>
              <UInput
                v-model="form.actualStartDate"
                type="date"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Date de fin réelle
              </label>
              <UInput
                v-model="form.actualEndDate"
                type="date"
                :min="form.actualStartDate"
              />
            </div>
          </div>

          <div v-if="form.actualStartDate && form.actualEndDate" class="p-3 bg-green-50 rounded-lg">
            <div class="flex items-start gap-2">
              <UIcon name="i-lucide-check-circle" class="w-4 h-4 text-green-600 mt-0.5" />
              <div class="text-sm text-green-800">
                <p class="font-medium">Audit terminé</p>
                <p>Durée : {{ auditDuration }} jours</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Toggle pour afficher les dates réelles -->
        <div class="flex items-center gap-3">
          <UToggle
            v-model="showActualDates"
            :ui="{ active: 'bg-primary-500' }"
          />
          <label class="text-sm font-medium text-gray-700">
            L'audit a déjà eu lieu (renseigner les dates réelles)
          </label>
        </div>

        <div v-if="dateError" class="text-sm text-red-600">
          {{ dateError }}
        </div>
      </div>
    </template>

    <template #footer="{ close }">
      <UButton
        label="Annuler"
        color="neutral"
        variant="outline"
        @click="close"
      />
      <UButton
        label="Enregistrer les dates"
        icon="i-lucide-save"
        :loading="saving"
        :disabled="!form.plannedStartDate || !form.plannedEndDate || !!dateError || saving"
        @click="() => saveDates(close)"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
interface Props {
  auditId: number
  initialPlannedStartDate?: string | null
  initialPlannedEndDate?: string | null
  initialActualStartDate?: string | null
  initialActualEndDate?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  initialPlannedStartDate: null,
  initialPlannedEndDate: null,
  initialActualStartDate: null,
  initialActualEndDate: null,
})

const emit = defineEmits<{
  'saved': [dates: any]
}>()

// Composables
const { updateAudit } = useAudits()
const toast = useToast()

// État local
const saving = ref(false)
const showActualDates = ref(false)

// Computed pour savoir si des dates sont déjà renseignées
const hasPlannedDates = computed(() => {
  return !!(props.initialPlannedStartDate && props.initialPlannedEndDate)
})

// Formulaire
const form = reactive({
  plannedStartDate: '',
  plannedEndDate: '',
  actualStartDate: '',
  actualEndDate: '',
})

// Dates minimum et maximum
const minDate = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

const todayDate = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

// Date limite de dépôt (15 jours avant le début)
const depositDeadline = computed(() => {
  if (!form.plannedStartDate) return ''
  
  const startDate = new Date(form.plannedStartDate)
  const deadline = new Date(startDate)
  deadline.setDate(deadline.getDate() - 15)
  
  return deadline.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

// Durée de l'audit réel
const auditDuration = computed(() => {
  if (!form.actualStartDate || !form.actualEndDate) return 0
  
  const start = new Date(form.actualStartDate)
  const end = new Date(form.actualEndDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays + 1 // +1 pour inclure le jour de début
})

// Erreur de validation des dates
const dateError = computed(() => {
  // Vérifier les dates prévisionnelles
  if (form.plannedStartDate && form.plannedEndDate) {
    const plannedStart = new Date(form.plannedStartDate)
    const plannedEnd = new Date(form.plannedEndDate)
    
    if (plannedEnd <= plannedStart) {
      return 'La date de fin prévue doit être postérieure à la date de début prévue'
    }
  }

  // Vérifier les dates réelles si elles sont renseignées
  if (showActualDates.value && form.actualStartDate && form.actualEndDate) {
    const actualStart = new Date(form.actualStartDate)
    const actualEnd = new Date(form.actualEndDate)
    
    if (actualEnd <= actualStart) {
      return 'La date de fin réelle doit être postérieure à la date de début réelle'
    }
  }

  return null
})

// Initialiser le formulaire avec les valeurs existantes
const initForm = () => {
  form.plannedStartDate = props.initialPlannedStartDate ? 
    new Date(props.initialPlannedStartDate).toISOString().split('T')[0] || '' : ''
  form.plannedEndDate = props.initialPlannedEndDate ? 
    new Date(props.initialPlannedEndDate).toISOString().split('T')[0] || '' : ''
  form.actualStartDate = props.initialActualStartDate ? 
    new Date(props.initialActualStartDate).toISOString().split('T')[0] || '' : ''
  form.actualEndDate = props.initialActualEndDate ? 
    new Date(props.initialActualEndDate).toISOString().split('T')[0] || '' : ''
  
  // Afficher les dates réelles si elles existent déjà
  showActualDates.value = !!(props.initialActualStartDate && props.initialActualEndDate)
}

// Initialiser le formulaire au montage
onMounted(() => {
  initForm()
})

// Sauvegarder les dates
const saveDates = async (closeModal?: () => void) => {
  saving.value = true

  try {
    const updateData: any = {
      plannedStartDate: form.plannedStartDate,
      plannedEndDate: form.plannedEndDate,
    }

    // Ajouter les dates réelles si elles sont renseignées
    if (showActualDates.value && form.actualStartDate && form.actualEndDate) {
      updateData.actualStartDate = form.actualStartDate
      updateData.actualEndDate = form.actualEndDate
    } else {
      // Réinitialiser les dates réelles si le toggle est désactivé
      updateData.actualStartDate = null
      updateData.actualEndDate = null
    }

    const result = await updateAudit(props.auditId, updateData)

    if (result.success) {
      emit('saved', updateData)
      if (closeModal) {
        closeModal()
      }
      toast.add({
        title: 'Succès',
        description: 'Dates d\'audit enregistrées avec succès',
        color: 'success',
      })
    }
  } catch (error) {
    console.error('Erreur sauvegarde dates:', error)
    toast.add({
      title: 'Erreur',
      description: 'Impossible d\'enregistrer les dates',
      color: 'error',
    })
  } finally {
    saving.value = false
  }
}
</script>
