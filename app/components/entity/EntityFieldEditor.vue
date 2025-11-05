<template>
  <USlideover
    v-model:open="isOpen"
    :title="currentField?.label || 'Champ'"
    side="right"
    class="w-full max-w-2xl"
    close-icon="i-lucide-arrow-right"
  >
    <!-- Header avec navigation -->
    <template #header>
      <div class="flex flex-col space-y-3">
        <div class="flex items-start gap-12">
          <div class="flex-1 pr-16 max-w-2xl">
            <h2 class="text-lg font-semibold text-gray-900">
              {{ currentField?.label }}
              <span v-if="currentField?.unit" class="text-gray-500 text-base font-normal">
                ({{ currentField.unit }})
              </span>
            </h2>
            <p v-if="currentFieldDefinition?.description" class="text-sm text-gray-600 mt-1">
              {{ currentFieldDefinition.description }}
            </p>
          </div>

          <!-- Boutons de navigation -->
          <div class="flex items-center gap-2 min-w-0 flex-shrink-0 ml-auto mr-4">
            <UButton
              icon="i-lucide-chevron-left"
              color="neutral"
              variant="ghost"
              size="sm"
              :disabled="!hasPreviousField"
              @click="navigateToPrevious"
              title="Champ précédent"
            />
            <span class="text-xs text-gray-500 font-medium w-14 text-center">
              {{ currentFieldIndex + 1 }} / {{ fields.length }}
            </span>
            <UButton
              icon="i-lucide-chevron-right"
              color="neutral"
              variant="ghost"
              size="sm"
              :disabled="!hasNextField"
              @click="navigateToNext"
              title="Champ suivant"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- Corps avec input et timeline -->
    <template #body>
      <div class="flex flex-col h-full space-y-8">
        <!-- Zone d'édition mise en évidence -->
        <div class="bg-primary-50 border-2 border-primary-200 rounded-lg p-6">
          <!-- Valeur actuelle EN HAUT -->
          <div v-if="currentField?.value !== null && currentField?.value !== undefined" class="mb-4 pb-4 border-b border-primary-200">
            <div class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Valeur actuelle</div>
            <div class="text-xl font-bold text-gray-900">
              {{ formatFieldValue(currentField.value, currentField.type) }}
            </div>
          </div>

          <label class="block space-y-3">
            <span class="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              {{ currentField?.value !== null && currentField?.value !== undefined ? 'Modifier la valeur' : 'Définir la valeur' }}
            </span>

            <!-- Input selon le type -->
            <div>
              <!-- String -->
              <UInput
                v-if="currentField?.type === 'string'"
                v-model="editValue"
                type="text"
                size="lg"
                :placeholder="`Entrer ${currentField.label.toLowerCase()}`"
                class="text-lg"
              />

              <!-- Text (textarea pour texte long) -->
              <UTextarea
                v-else-if="currentField?.type === 'text'"
                v-model="editValue"
                :rows="5"
                :placeholder="`Entrer ${currentField.label.toLowerCase()}`"
                size="lg"
                resize
                class="w-full"
              />

              <!-- Number -->
              <UInput
                v-else-if="currentField?.type === 'number'"
                v-model="editValue"
                type="number"
                size="lg"
                :placeholder="`Entrer ${currentField.label.toLowerCase()}`"
                class="text-lg"
              />

              <!-- Boolean -->
              <div v-else-if="currentField?.type === 'boolean'" class="flex items-center gap-3">
                <UToggle
                  v-model="editValue"
                  size="lg"
                />
                <span class="text-lg font-medium text-gray-700">
                  {{ editValue ? 'Oui' : 'Non' }}
                </span>
              </div>

              <!-- Date -->
              <UInput
                v-else-if="currentField?.type === 'date'"
                v-model="editValue"
                type="date"
                size="lg"
                class="text-lg"
              />
            </div>
          </label>

          <!-- Bouton Enregistrer -->
          <UButton
            color="primary"
            variant="solid"
            size="lg"
            icon="i-lucide-save"
            label="Enregistrer"
            class="mt-4 w-full"
            :loading="updateFieldLoading || fetchHistoryLoading"
            :disabled="!hasChanges"
            @click="handleSave"
          />
        </div>

        <!-- Timeline de l'historique -->
        <div class="flex-1">
          <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Historique des modifications
          </h3>

          <!-- État de chargement -->
          <div v-if="fetchHistoryLoading" class="flex items-center justify-center py-12">
            <div class="text-center">
              <UIcon name="i-heroicons-arrow-path" class="animate-spin w-8 h-8 mx-auto mb-4 text-primary" />
              <p class="text-gray-600">Chargement de l'historique...</p>
            </div>
          </div>

          <!-- Historique vide -->
          <div v-else-if="fieldHistory.length === 0" class="text-center py-12">
            <UIcon name="i-lucide-clock" class="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p class="text-gray-600">Aucune modification enregistrée</p>
          </div>

          <!-- Timeline -->
          <UTimeline v-else :items="timelineItems">
            <!-- Slot title : la VALEUR du champ -->
            <template #title="{ item }">
              <div class="flex items-center gap-3">
                <div :class="[
                  'font-bold',
                  currentField?.type === 'text' ? 'text-sm' : 'text-lg',
                  item.isCurrent ? 'text-primary-600' : 'text-gray-900'
                ]">
                  <div v-if="!item.isTruncated">{{ item.displayValue }}</div>
                  <div v-else>
                    <div v-if="!expandedItems.has(item.index)" class="flex items-center gap-2">
                      <span>{{ item.displayValue }}</span>
                      <button
                        @click.stop="toggleTextExpansion(item.index)"
                        class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                        title="Cliquer pour voir le texte complet"
                      >
                        <UIcon name="i-lucide-chevron-down" class="w-3 h-3" />
                        Voir plus
                      </button>
                    </div>
                    <div v-else>
                      <div class="whitespace-pre-wrap">{{ item.fullValue }}</div>
                      <button
                        @click.stop="toggleTextExpansion(item.index)"
                        class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors cursor-pointer mt-2"
                        title="Cliquer pour réduire le texte"
                      >
                        <UIcon name="i-lucide-chevron-up" class="w-3 h-3" />
                        Voir moins
                      </button>
                    </div>
                  </div>
                </div>
                <UBadge v-if="item.isCurrent" color="primary" variant="soft" size="xs">
                  Actuelle
                </UBadge>
              </div>
            </template>

            <!-- Slot description : date + auteur -->
            <template #description="{ item }">
              <div class="text-sm text-gray-500">
                {{ item.dateAuthor }}
              </div>
            </template>
          </UTimeline>
        </div>
      </div>
    </template>
  </USlideover>


</template>

<script setup lang="ts">
import type { EntityField } from '~/types/entities'
import { entityFieldsConfig, type EntityFieldKey } from '~~/server/database/entity-fields-config'

interface Props {
  entityId?: number
  fields?: EntityField[]
  initialFieldKey?: string
  open?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  fields: () => [],
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'updated': []
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const { currentEntity, fetchEntity } = useEntities()
const { updateEntityField, updateFieldLoading, fetchEntityFieldHistory, fetchHistoryLoading, fieldHistory } = useEntityFields()

// Index du champ actuellement affiché
const currentFieldIndex = ref(0)

// Gestion de l'expansion des textes dans l'historique
const expandedItems = ref(new Set<number>())

// Champ actuel basé sur l'index
const currentField = computed(() => props.fields[currentFieldIndex.value] || null)

// Définition du champ depuis la config
const currentFieldDefinition = computed(() => {
  if (!currentField.value) return null
  return entityFieldsConfig.find(f => f.key === currentField.value!.key)
})

// Valeur en cours d'édition
const editValue = ref<any>(null)

// Navigation
const hasPreviousField = computed(() => currentFieldIndex.value > 0)
const hasNextField = computed(() => currentFieldIndex.value < props.fields.length - 1)

const navigateToPrevious = () => {
  if (hasPreviousField.value) {
    currentFieldIndex.value--
  }
}

const navigateToNext = () => {
  if (hasNextField.value) {
    currentFieldIndex.value++
  }
}

// Détecter si la valeur a changé
const hasChanges = computed(() => {
  if (!currentField.value) return false

  const current = currentField.value.value
  const edited = editValue.value

  // Normaliser les valeurs pour la comparaison
  let normalizedCurrent = current
  let normalizedEdited = edited

  // Convertir les valeurs vides en null
  if (edited === '' || edited === undefined) {
    normalizedEdited = null
  }

  // Pour les dates, comparer les strings ISO
  if (currentField.value.type === 'date') {
    if (current instanceof Date) {
      normalizedCurrent = current.toISOString().split('T')[0]
    }
  }

  // Pour les nombres, convertir en number
  if (currentField.value.type === 'number' && edited !== null && edited !== '') {
    normalizedEdited = Number(edited)
  }

  return normalizedCurrent !== normalizedEdited
})

// Initialiser la valeur d'édition quand le champ change
watch([currentField, isOpen], () => {
  if (!currentField.value || !isOpen.value) return

  // Convertir Date en string pour les inputs de type date
  if (currentField.value.type === 'date' && currentField.value.value instanceof Date) {
    editValue.value = currentField.value.value.toISOString().split('T')[0]
  } else {
    editValue.value = currentField.value.value ?? ''
  }
}, { immediate: true })

// Charger l'historique quand le champ change
watch([currentField, isOpen], async () => {
  if (!currentField.value || !isOpen.value || !props.entityId) return

  await fetchEntityFieldHistory(props.entityId, currentField.value.key)
}, { immediate: true })

// Initialiser l'index du champ au départ
watch([() => props.initialFieldKey, () => props.fields, isOpen], () => {
  if (!isOpen.value || !props.initialFieldKey || props.fields.length === 0) return

  const index = props.fields.findIndex(f => f.key === props.initialFieldKey)
  if (index !== -1) {
    currentFieldIndex.value = index
  }
}, { immediate: true })

// Fonction pour toggle l'expansion du texte
const toggleTextExpansion = (itemIndex: number) => {
  if (expandedItems.value.has(itemIndex)) {
    expandedItems.value.delete(itemIndex)
  } else {
    expandedItems.value.add(itemIndex)
  }
}

// Formater une valeur pour l'affichage simple (valeur actuelle)
const formatFieldValue = (value: any, type: string) => {
  if (value === null || value === undefined) return 'Non défini'

  switch (type) {
    case 'date':
      return new Date(value).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    case 'boolean':
      return value ? 'Oui' : 'Non'
    case 'text':
      return String(value)
    default:
      return String(value)
  }
}

// Formater une valeur pour l'historique avec troncature
const formatFieldValueForHistory = (value: any, type: string) => {
  if (value === null || value === undefined) {
    return {
      displayValue: 'Non défini',
      isTruncated: false,
      fullValue: 'Non défini'
    }
  }

  switch (type) {
    case 'date':
      const dateValue = new Date(value).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
      return {
        displayValue: dateValue,
        isTruncated: false,
        fullValue: dateValue
      }
    case 'boolean':
      const boolValue = value ? 'Oui' : 'Non'
      return {
        displayValue: boolValue,
        isTruncated: false,
        fullValue: boolValue
      }
    case 'text':
      const textValue = String(value)
      const limit = 150 // Limite plus petite pour les textes dans l'historique
      return {
        displayValue: textValue.length > limit ? textValue.substring(0, limit) + '...' : textValue,
        isTruncated: textValue.length > limit,
        fullValue: textValue
      }
    default:
      const stringValue = String(value)
      return {
        displayValue: stringValue,
        isTruncated: false,
        fullValue: stringValue
      }
  }
}

// Items pour la timeline
const timelineItems = computed(() => {
  if (!currentField.value) return []

  return fieldHistory.value.map((entry, index) => {
    const isCurrent = index === 0

    // Formater la date
    const date = new Date(entry.createdAt)
    const formattedDate = date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    // Formater la valeur pour l'historique
    const valueFormatted = formatFieldValueForHistory(entry.value, currentField.value!.type)

    return {
      icon: isCurrent ? 'i-lucide-check-circle' : 'i-lucide-circle',
      color: isCurrent ? 'primary' : 'gray',
      displayValue: valueFormatted.displayValue,
      isTruncated: valueFormatted.isTruncated,
      fullValue: valueFormatted.fullValue,
      dateAuthor: `${formattedDate} par ${entry.createdByAccount?.firstname} ${entry.createdByAccount?.lastname}`,
      isCurrent,
      index,
    }
  })
})

// Enregistrer la nouvelle valeur
const handleSave = async () => {
  if (!currentField.value || !props.entityId || !hasChanges.value) return

  // Préparer la valeur finale
  let finalValue = editValue.value

  if (editValue.value === '' || editValue.value === undefined) {
    finalValue = null
  }

  if (currentField.value.type === 'date' && finalValue !== null) {
    finalValue = new Date(finalValue)
  }

  if (currentField.value.type === 'number' && finalValue !== null && finalValue !== '') {
    finalValue = Number(finalValue)
  }

  // Sauvegarder la clé du champ actuel pour garder la position après refresh
  const currentKey = currentField.value.key

  const result = await updateEntityField(props.entityId, currentField.value.key, finalValue)

  if (result.success) {
    // Rafraîchir l'entité pour mettre à jour la liste des champs
    await fetchEntity(props.entityId)

    // Retrouver l'index du champ actuel dans les fields rafraîchis
    // pour éviter de revenir au premier champ
    await nextTick()
    const newIndex = props.fields.findIndex(f => f.key === currentKey)
    if (newIndex !== -1) {
      currentFieldIndex.value = newIndex
    }

    // Rafraîchir l'historique
    await fetchEntityFieldHistory(props.entityId, currentKey)

    // Émettre l'événement de mise à jour
    emit('updated')
  }
}
</script>
