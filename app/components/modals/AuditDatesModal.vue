<template>
  <UModal
    :title="modalTitle"
    :ui="{
      content: 'w-full max-w-lg',
      footer: 'justify-end',
    }"
  >
    <!-- Bouton déclencheur (optionnel) -->
    <UButton
      v-if="props.showTriggerButton"
      size="xs"
      color="neutral"
      variant="outline"
      icon="i-lucide-edit"
      :label="props.mode === 'phase2' ? 'Modifier dates complémentaires' : 'Modifier dates réelles'"
    />

    <template #body>
      <div class="space-y-6">
        <!-- Date prévisionnelle (lecture seule) - uniquement mode phase1 -->
        <div
          v-if="props.mode === 'phase1' && hasPlannedDate"
          class="space-y-4"
        >
          <div class="flex items-center gap-2">
            <h4 class="font-medium text-gray-900">Date prévisionnelle</h4>
            <UBadge
              size="xs"
              color="info"
              >Lecture seule</UBadge
            >
          </div>

          <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div>
              <label class="block text-xs font-medium text-blue-900 mb-1"> Date prévue </label>
              <p class="text-sm text-blue-800 font-semibold">
                {{ formatDisplayDate(props.initialPlannedDate) }}
              </p>
            </div>

            <div
              v-if="props.initialPlannedDate"
              class="mt-3 pt-3 border-t border-blue-200"
            >
              <div class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-info"
                  class="w-4 h-4 text-blue-600 mt-0.5"
                />
                <div class="text-xs text-blue-800">
                  <p class="font-medium">Date limite de dépôt des documents</p>
                  <p>{{ depositDeadline }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-else-if="props.mode === 'phase1'"
          class="p-4 bg-gray-50 border border-gray-200 rounded-lg"
        >
          <div class="flex items-start gap-2">
            <UIcon
              name="i-lucide-alert-circle"
              class="w-4 h-4 text-gray-600 mt-0.5"
            />
            <div class="text-sm text-gray-700">
              <p class="font-medium">Aucune date prévisionnelle définie</p>
              <p class="text-xs text-gray-600 mt-1">
                La date prévisionnelle sera calculée automatiquement lors de la création de l'audit.
              </p>
            </div>
          </div>
        </div>

        <!-- Dates à saisir (modifiables) -->
        <div class="space-y-4">
          <div class="flex items-center gap-2">
            <h4 class="font-medium text-gray-900">
              {{ props.mode === 'phase1' ? "Dates réelles de l'audit" : "Dates de l'audit complémentaire" }}
            </h4>
            <UBadge
              size="xs"
              color="success"
              >Modifiable</UBadge
            >
          </div>

          <UInputDate
            ref="inputDate"
            v-model="dateRange"
            range
            locale="fr-FR"
          >
            <template #trailing>
              <UPopover
                v-if="popoverReference"
                :reference="popoverReference"
              >
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  icon="i-lucide-calendar"
                  aria-label="Sélectionner les dates d'audit"
                  class="px-0"
                />

                <template #content>
                  <UCalendar
                    v-model="dateRange"
                    class="p-2"
                    :number-of-months="2"
                    range
                    locale="fr-FR"
                  />
                </template>
              </UPopover>
            </template>
          </UInputDate>

          <div
            v-if="(props.mode === 'phase1' && form.actualStartDate && form.actualEndDate) || (props.mode === 'phase2' && form.complementaryStartDate && form.complementaryEndDate)"
            class="text-xs text-gray-600 mt-2"
          >
            <p>Durée : {{ auditDuration }} jour{{ auditDuration > 1 ? 's' : '' }}</p>
          </div>
        </div>

        <div
          v-if="dateError"
          class="text-sm text-red-600"
        >
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
        :label="saveButtonLabel"
        icon="i-lucide-save"
        :loading="saving"
        :disabled="!!dateError || saving"
        @click="() => saveDates(close)"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { CalendarDate, parseDate } from '@internationalized/date'

interface Props {
  auditId: number
  // Props existantes pour phase 1
  initialPlannedDate?: string | null
  initialActualStartDate?: string | null
  initialActualEndDate?: string | null
  // NOUVELLES props pour phase 2
  mode?: 'phase1' | 'phase2'
  initialComplementaryStartDate?: string | null
  initialComplementaryEndDate?: string | null
  // Contrôle de l'affichage du bouton déclencheur
  showTriggerButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'phase1',
  initialPlannedDate: null,
  initialActualStartDate: null,
  initialActualEndDate: null,
  initialComplementaryStartDate: null,
  initialComplementaryEndDate: null,
  showTriggerButton: true,
})

const emit = defineEmits<{
  saved: [dates: any]
}>()

// Composables
const { updateAudit } = useAudits()
const { triggerActionRefresh } = useActionRefresh()
const toast = useToast()

// État local
const saving = ref(false)
const inputDate = useTemplateRef<any>('inputDate')

// Référence sûre pour le popover (évite les erreurs de démontage)
const popoverReference = computed(() => {
  return inputDate.value?.inputsRef?.[0]?.$el || null
})

// Computed pour savoir si une date prévisionnelle existe
const hasPlannedDate = computed(() => {
  return !!props.initialPlannedDate
})

// Formulaire pour les deux modes
const form = reactive({
  actualStartDate: '',
  actualEndDate: '',
  complementaryStartDate: '',
  complementaryEndDate: '',
})

// Computed pour le titre du modal
const modalTitle = computed(() => {
  return props.mode === 'phase1' ? "Dates d'audit" : "Dates de l'audit complémentaire"
})

// Computed pour le label du bouton de sauvegarde
const saveButtonLabel = computed(() => {
  return props.mode === 'phase1' ? 'Enregistrer les dates réelles' : 'Enregistrer les dates complémentaires'
})

// Computed pour convertir les dates string en objet CalendarDate range
const dateRange = computed({
  get() {
    if (props.mode === 'phase2') {
      if (!form.complementaryStartDate || !form.complementaryEndDate) {
        return undefined
      }
      return {
        start: parseDate(form.complementaryStartDate),
        end: parseDate(form.complementaryEndDate),
      }
    }

    // Mode phase1 (logique existante)
    if (!form.actualStartDate || !form.actualEndDate) {
      return undefined
    }

    return {
      start: parseDate(form.actualStartDate),
      end: parseDate(form.actualEndDate),
    }
  },
  set(value: { start?: CalendarDate; end?: CalendarDate } | null | undefined) {
    if (props.mode === 'phase2') {
      if (!value || !value.start || !value.end) {
        form.complementaryStartDate = value?.start?.toString() || ''
        form.complementaryEndDate = value?.end?.toString() || ''
        return
      }
      form.complementaryStartDate = value.start.toString()
      form.complementaryEndDate = value.end.toString()
      return
    }

    // Mode phase1 (logique existante)
    if (!value || !value.start || !value.end) {
      form.actualStartDate = value?.start?.toString() || ''
      form.actualEndDate = value?.end?.toString() || ''
      return
    }

    form.actualStartDate = value.start.toString()
    form.actualEndDate = value.end.toString()
  },
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
    day: 'numeric',
  })
})

// Durée de l'audit
const auditDuration = computed(() => {
  if (props.mode === 'phase2') {
    if (!form.complementaryStartDate || !form.complementaryEndDate) return 0
    const start = new Date(form.complementaryStartDate)
    const end = new Date(form.complementaryEndDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays + 1
  }

  // Mode phase1 (logique existante)
  if (!form.actualStartDate || !form.actualEndDate) return 0

  const start = new Date(form.actualStartDate)
  const end = new Date(form.actualEndDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays + 1 // +1 pour inclure le jour de début
})

// Erreur de validation des dates
const dateError = computed(() => {
  if (props.mode === 'phase2') {
    if (form.complementaryStartDate && form.complementaryEndDate) {
      const start = new Date(form.complementaryStartDate)
      const end = new Date(form.complementaryEndDate)

      if (end < start) {
        return "La date de fin de l'audit complémentaire ne peut pas être antérieure à la date de début"
      }
    }
  } else {
    // Vérifier les dates réelles si elles sont toutes deux renseignées
    if (form.actualStartDate && form.actualEndDate) {
      const actualStart = new Date(form.actualStartDate)
      const actualEnd = new Date(form.actualEndDate)

      if (actualEnd < actualStart) {
        return 'La date de fin réelle ne peut pas être antérieure à la date de début réelle'
      }
    }
  }

  return null
})

// Initialiser le formulaire avec les valeurs existantes
const initForm = () => {
  if (props.mode === 'phase2') {
    form.complementaryStartDate = props.initialComplementaryStartDate
      ? new Date(props.initialComplementaryStartDate).toISOString().split('T')[0] || ''
      : ''
    form.complementaryEndDate = props.initialComplementaryEndDate
      ? new Date(props.initialComplementaryEndDate).toISOString().split('T')[0] || ''
      : ''
  } else {
    form.actualStartDate = props.initialActualStartDate
      ? new Date(props.initialActualStartDate).toISOString().split('T')[0] || ''
      : ''
    form.actualEndDate = props.initialActualEndDate
      ? new Date(props.initialActualEndDate).toISOString().split('T')[0] || ''
      : ''
  }
}

// Formater une date pour l'affichage en lecture seule
const formatDisplayDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Non définie'

  const date = new Date(dateString)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

// Initialiser le formulaire au montage
onMounted(() => {
  initForm()
})

// Sauvegarder les dates
const saveDates = async (closeModal?: () => void) => {
  saving.value = true

  try {
    // Construire les données selon le mode
    const updateData: any =
      props.mode === 'phase2'
        ? {
            complementaryStartDate: form.complementaryStartDate || null,
            complementaryEndDate: form.complementaryEndDate || null,
          }
        : {
            actualStartDate: form.actualStartDate || null,
            actualEndDate: form.actualEndDate || null,
          }

    const result = await updateAudit(props.auditId, updateData)

    if (result.success) {
      emit('saved', updateData)

      // Déclencher le rafraîchissement des actions
      // La saisie des dates d'audit peut compléter des actions
      if (result.data) {
        triggerActionRefresh({
          auditId: result.data.id.toString(),
          entityId: result.data.entityId.toString(),
        })
      }

      if (closeModal) {
        closeModal()
      }
      toast.add({
        title: 'Succès',
        description:
          props.mode === 'phase2'
            ? 'Dates complémentaires enregistrées avec succès'
            : 'Dates réelles enregistrées avec succès',
        color: 'success',
      })
    }
  } catch (error) {
    console.error('Erreur sauvegarde dates:', error)
    toast.add({
      title: 'Erreur',
      description:
        props.mode === 'phase2'
          ? "Impossible d'enregistrer les dates complémentaires"
          : "Impossible d'enregistrer les dates réelles",
      color: 'error',
    })
  } finally {
    saving.value = false
  }
}
</script>
