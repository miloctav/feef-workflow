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
      size="xs"
      color="neutral"
      variant="outline"
      icon="i-lucide-edit"
      label="Modifier dates réelles"
    />

    <template #body>
      <div class="space-y-6">
        <!-- Date prévisionnelle (lecture seule) -->
        <div v-if="hasPlannedDate" class="space-y-4">
          <div class="flex items-center gap-2">
            <h4 class="font-medium text-gray-900">Date prévisionnelle</h4>
            <UBadge size="xs" color="info">Lecture seule</UBadge>
          </div>

          <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div>
              <label class="block text-xs font-medium text-blue-900 mb-1">
                Date prévue
              </label>
              <p class="text-sm text-blue-800 font-semibold">
                {{ formatDisplayDate(props.initialPlannedDate) }}
              </p>
            </div>

            <div v-if="props.initialPlannedDate" class="mt-3 pt-3 border-t border-blue-200">
              <div class="flex items-start gap-2">
                <UIcon name="i-lucide-info" class="w-4 h-4 text-blue-600 mt-0.5" />
                <div class="text-xs text-blue-800">
                  <p class="font-medium">Date limite de dépôt des documents</p>
                  <p>{{ depositDeadline }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div class="flex items-start gap-2">
            <UIcon name="i-lucide-alert-circle" class="w-4 h-4 text-gray-600 mt-0.5" />
            <div class="text-sm text-gray-700">
              <p class="font-medium">Aucune date prévisionnelle définie</p>
              <p class="text-xs text-gray-600 mt-1">La date prévisionnelle sera calculée automatiquement lors de la création de l'audit.</p>
            </div>
          </div>
        </div>

        <!-- Dates réelles (modifiables) -->
        <div class="space-y-4">
          <div class="flex items-center gap-2">
            <h4 class="font-medium text-gray-900">Dates réelles de l'audit</h4>
            <UBadge size="xs" color="success">Modifiable</UBadge>
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

          <div v-if="form.actualStartDate && form.actualEndDate" class="text-xs text-gray-600 mt-2">
            <p>Durée : {{ auditDuration }} jours</p>
          </div>
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
        label="Enregistrer les dates réelles"
        icon="i-lucide-save"
        :loading="saving"
        :disabled="!!dateError || saving"
        @click="() => saveDates(close)"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
interface Props {
  auditId: number
  initialPlannedDate?: string | null
  initialActualStartDate?: string | null
  initialActualEndDate?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  initialPlannedDate: null,
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

// Computed pour savoir si une date prévisionnelle existe
const hasPlannedDate = computed(() => {
  return !!props.initialPlannedDate
})

// Formulaire (uniquement les dates réelles)
const form = reactive({
  actualStartDate: '',
  actualEndDate: '',
})

// Date limite de dépôt (15 jours avant la date prévue)
const depositDeadline = computed(() => {
  if (!props.initialPlannedDate) return ''

  const plannedDate = new Date(props.initialPlannedDate)
  const deadline = new Date(plannedDate)
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

// Erreur de validation des dates réelles
const dateError = computed(() => {
  // Vérifier les dates réelles si elles sont toutes deux renseignées
  if (form.actualStartDate && form.actualEndDate) {
    const actualStart = new Date(form.actualStartDate)
    const actualEnd = new Date(form.actualEndDate)

    if (actualEnd < actualStart) {
      return 'La date de fin réelle ne peut pas être antérieure à la date de début réelle'
    }
  }

  return null
})

// Initialiser le formulaire avec les valeurs existantes (uniquement dates réelles)
const initForm = () => {
  form.actualStartDate = props.initialActualStartDate ?
    new Date(props.initialActualStartDate).toISOString().split('T')[0] || '' : ''
  form.actualEndDate = props.initialActualEndDate ?
    new Date(props.initialActualEndDate).toISOString().split('T')[0] || '' : ''
}

// Formater une date pour l'affichage en lecture seule
const formatDisplayDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Non définie'

  const date = new Date(dateString)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

// Initialiser le formulaire au montage
onMounted(() => {
  initForm()
})

// Sauvegarder les dates réelles
const saveDates = async (closeModal?: () => void) => {
  saving.value = true

  try {
    // Envoyer uniquement les dates réelles (peuvent être null)
    const updateData: any = {
      actualStartDate: form.actualStartDate || null,
      actualEndDate: form.actualEndDate || null,
    }

    const result = await updateAudit(props.auditId, updateData)

    if (result.success) {
      emit('saved', updateData)
      if (closeModal) {
        closeModal()
      }
      toast.add({
        title: 'Succès',
        description: 'Dates réelles enregistrées avec succès',
        color: 'success',
      })
    }
  } catch (error) {
    console.error('Erreur sauvegarde dates réelles:', error)
    toast.add({
      title: 'Erreur',
      description: 'Impossible d\'enregistrer les dates réelles',
      color: 'error',
    })
  } finally {
    saving.value = false
  }
}
</script>
