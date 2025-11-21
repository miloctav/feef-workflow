<template>
  <!-- Bouton désactivé avec tooltip si disabled -->
  <UTooltip v-if="disabled" :text="disabledReason">
    <span class="inline-block">
      <UButton
        :icon="currentEntityOe ? 'i-lucide-edit' : 'i-lucide-plus'"
        size="xs"
        color="primary"
        variant="outline"
        :label="currentEntityOe ? 'Modifier OE' : 'Choisir OE'"
        disabled
        class="pointer-events-none"
      />
    </span>
  </UTooltip>

  <!-- Modal normal si pas disabled -->
  <UModal
    v-else
    :title="currentEntityOe ? 'Modifier l\'Organisme Évaluateur' : 'Sélectionner un Organisme Évaluateur'"
    :ui="{ footer: 'justify-end' }"
  >
    <!-- Bouton trigger du modal -->
    <UButton
      :icon="currentEntityOe ? 'i-lucide-edit' : 'i-lucide-plus'"
      size="xs"
      color="primary"
      variant="outline"
      :label="currentEntityOe ? 'Modifier OE' : 'Choisir OE'"
    />

    <template #body>
      <div class="space-y-4">
        <div v-if="currentEntityOe" class="p-4 bg-blue-50 rounded-lg">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-info" class="w-4 h-4 text-blue-500" />
            <span class="text-sm text-blue-700">
              OE actuel : <strong>{{ currentEntityOe.name }}</strong>
            </span>
          </div>
        </div>

        <UFormField :label="currentEntityOe ? 'Nouvel Organisme Évaluateur' : 'Organisme Évaluateur'" required>
          <USelect
            v-model="selectedOeId"
            :loading="oesLoading"
            :items="oeItems"
            placeholder="Sélectionner un OE"
            :disabled="assignOeLoading"
            icon="i-lucide-briefcase"
          />
        </UFormField>

        <p v-if="oesError" class="text-sm text-red-600">
          {{ oesError }}
        </p>

        <div v-if="selectedOeId" class="p-4 bg-green-50 rounded-lg">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-check-circle" class="w-4 h-4 text-green-500" />
            <span class="text-sm text-green-700">
              {{ getSelectedOeName() }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <template #footer="{ close }">
      <UButton
        v-if="currentEntityOe"
        label="Passer en appel d'offre"
        color="warning"
        variant="soft"
        icon="i-lucide-megaphone"
        :loading="assignOeLoading"
        @click="handleTenderMode(close)"
      />
      <div class="flex-1" />
      <UButton
        label="Annuler"
        color="neutral"
        variant="outline"
        :disabled="assignOeLoading"
        @click="close"
      />
      <UButton
        :label="currentEntityOe ? 'Modifier' : 'Sélectionner'"
        color="primary"
        :loading="assignOeLoading"
        :disabled="!selectedOeId"
        @click="handleConfirm(close)"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { OEWithRelations } from '~~/app/types/oes'

interface Props {
  entityId?: number
  currentEntityOe?: { id: number; name: string } | null
  disabled?: boolean
  disabledReason?: string
}

interface Emits {
  (e: 'updated'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Composables
const { fetchOesForSelect } = useOes()
const { assignOe, assignOeLoading } = useEntities()
const toast = useToast()

// État local
const selectedOeId = ref<number | undefined>(undefined)
const oesLoading = ref(false)
const oesError = ref<string | null>(null)
const oeItems = ref<Array<{ label: string; value: number }>>([])

// Charger la liste des OEs au montage du modal
const loadOes = async () => {
  oesLoading.value = true
  oesError.value = null

  try {
    const oes = await fetchOesForSelect({ includeAll: false })
    // Filtrer pour ne garder que les OEs avec une valeur numérique (pas null)
    oeItems.value = oes.filter(oe => oe.value !== null) as Array<{ label: string; value: number }>
  } catch (error: any) {
    oesError.value = error.message || 'Erreur lors du chargement des OEs'
  } finally {
    oesLoading.value = false
  }
}

// Charger les OEs au montage du composant
onMounted(() => {
  loadOes()
  // Pré-sélectionner l'OE actuel s'il existe
  selectedOeId.value = props.currentEntityOe?.id || undefined
})

// Obtenir le nom de l'OE sélectionné
const getSelectedOeName = () => {
  const selectedOe = oeItems.value.find(oe => oe.value === selectedOeId.value)
  return selectedOe?.label || ''
}

// Gérer la confirmation
const handleConfirm = async (close: () => void) => {
  if (!props.entityId || !selectedOeId.value) {
    return
  }

  try {
    const result = await assignOe(props.entityId, selectedOeId.value)

    if (result.success) {
      emit('updated')

      // Réinitialiser le formulaire
      selectedOeId.value = props.currentEntityOe?.id || undefined

      // Fermer le modal
      close()
    }
    // Les messages d'erreur et de succès sont gérés dans assignOe via toast
  } catch (error: any) {
    // Gestion d'erreur de fallback (normalement géré dans assignOe)
    toast.add({
      title: 'Erreur',
      description: error.message || 'Erreur inattendue lors de l\'assignation de l\'OE',
      color: 'error',
    })
  }
}

// Gérer le passage en mode appel d'offre
const handleTenderMode = async (close: () => void) => {
  if (!props.entityId) {
    return
  }

  try {
    const result = await assignOe(props.entityId, null)

    if (result.success) {
      emit('updated')
      selectedOeId.value = undefined
      close()
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.message || 'Erreur inattendue lors du passage en mode appel d\'offre',
      color: 'error',
    })
  }
}
</script>