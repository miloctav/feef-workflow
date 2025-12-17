<template>
  <USlideover
    v-model:open="isOpen"
    :title="currentGroup?.label || 'Groupe de champs'"
    :description="currentGroup?.description"
    class="w-full max-w-3xl"
    close-icon="i-lucide-x"
    :dismissible="isReadOnly"
  >
    <template #body>
      <div class="flex flex-col h-full space-y-8">
        <!-- Formulaire multi-champs (seulement si pas en lecture seule) -->
        <div
          v-if="!isReadOnly"
          class="bg-primary-50 border-2 border-primary-200 rounded-lg p-6"
        >
          <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-6">
            Modifier les informations
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              v-for="field in currentGroupFields"
              :key="field.key"
              :class="['space-y-2', field.type === 'text' ? 'md:col-span-2' : '']"
            >
              <label class="block">
                <span class="text-sm font-medium text-gray-700">
                  {{ field.label }}
                  <span
                    v-if="field.required"
                    class="text-red-500"
                    >*</span
                  >
                  <span
                    v-if="field.unit"
                    class="text-gray-500 font-normal"
                    >({{ field.unit }})</span
                  >
                </span>

                <!-- Input basé sur le type -->
                <div class="mt-2">
                  <!-- String -->
                  <UInput
                    v-if="field.type === 'string'"
                    v-model="editValues[field.key]"
                    type="text"
                    size="md"
                    :placeholder="`Entrer ${field.label.toLowerCase()}`"
                  />

                  <!-- Text (textarea) -->
                  <UTextarea
                    v-else-if="field.type === 'text'"
                    v-model="editValues[field.key]"
                    :rows="4"
                    :placeholder="`Entrer ${field.label.toLowerCase()}`"
                    size="md"
                    resize
                    class="w-full"
                  />

                  <!-- Number -->
                  <UInput
                    v-else-if="field.type === 'number'"
                    v-model.number="editValues[field.key]"
                    type="number"
                    size="md"
                    :placeholder="`Entrer ${field.label.toLowerCase()}`"
                  />

                  <!-- Boolean -->
                  <USwitch
                    v-else-if="field.type === 'boolean'"
                    v-model="editValues[field.key]"
                  />

                  <!-- Date -->
                  <UInput
                    v-else-if="field.type === 'date'"
                    v-model="editValues[field.key]"
                    type="date"
                    size="md"
                  />
                </div>

                <!-- Description du champ -->
                <p
                  v-if="field.description"
                  class="text-xs text-gray-500 mt-1"
                >
                  {{ field.description }}
                </p>
              </label>
            </div>
          </div>

          <!-- Bouton de sauvegarde -->
          <UButton
            color="primary"
            variant="solid"
            size="lg"
            icon="i-lucide-save"
            :label="`Enregistrer (${changedFieldsCount} champ${changedFieldsCount > 1 ? 's' : ''})`"
            class="mt-6 w-full"
            :loading="isSaving"
            :disabled="!hasChanges"
            @click="handleSave"
          />
        </div>

        <!-- Section Valeurs actuelles (seulement en mode lecture seule) -->
        <div
          v-if="isReadOnly"
          class="bg-gray-50 border-2 border-gray-200 rounded-lg p-6"
        >
          <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-6">
            Valeurs actuelles
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              v-for="field in currentGroupFields"
              :key="field.key"
              :class="['space-y-2', field.type === 'text' ? 'md:col-span-2' : '']"
            >
              <label class="block">
                <span class="text-sm font-medium text-gray-700">
                  {{ field.label }}
                  <span
                    v-if="field.unit"
                    class="text-gray-500 font-normal"
                    >({{ field.unit }})</span
                  >
                </span>
                <div class="mt-2 text-gray-900 font-semibold">
                  {{ formatFieldValue(field.value, field.type, field.unit) }}
                </div>
              </label>
            </div>
          </div>
        </div>

        <!-- Historique des champs du groupe -->
        <div class="flex-1">
          <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Historique des modifications
          </h3>

          <div class="space-y-6">
            <div
              v-for="field in currentGroupFields"
              :key="field.key"
              class="border-b border-gray-200 pb-4 last:border-b-0"
            >
              <div class="flex items-center justify-between mb-3">
                <h4 class="font-medium text-gray-900">{{ field.label }}</h4>
              </div>

              <!-- Historique du champ -->
              <div
                v-if="!fieldHistories[field.key] || fieldHistories[field.key].length === 0"
                class="text-sm text-gray-500 italic"
              >
                Aucune modification enregistrée
              </div>
              <div
                v-else
                class="space-y-2"
              >
                <div
                  v-for="(version, idx) in fieldHistories[field.key].slice(0, 3)"
                  :key="version.id"
                  class="text-sm"
                >
                  <div class="flex items-start gap-2">
                    <UBadge
                      v-if="idx === 0"
                      color="primary"
                      variant="soft"
                      size="xs"
                    >
                      Actuelle
                    </UBadge>
                    <span class="text-gray-700">{{
                      formatFieldValue(version.value, field.type, field.unit)
                    }}</span>
                  </div>
                  <div class="text-xs text-gray-500 ml-0 mt-0.5">
                    {{
                      new Date(version.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    }}
                    par {{ version.createdByAccount?.firstname }}
                    {{ version.createdByAccount?.lastname }}
                  </div>
                </div>
                <UButton
                  v-if="fieldHistories[field.key].length > 3"
                  variant="ghost"
                  size="xs"
                  :label="`Voir ${fieldHistories[field.key].length - 3} version${
                    fieldHistories[field.key].length - 3 > 1 ? 's' : ''
                  } de plus`"
                  @click="openFullHistory(field.key)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import type { EntityFieldGroupKey, EntityField } from '~/types/entities'
import { entityFieldGroups, getFieldsByGroup } from '~~/server/database/entity-fields-config'
import { Role } from '~~/shared/types/roles'

interface Props {
  entityId?: number
  groupKey?: EntityFieldGroupKey
  fields?: EntityField[]
  open?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  fields: () => [],
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  updated: []
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const { updateFieldGroup } = useEntityFieldGroups()
const { fetchMultipleFieldHistories } = useEntityFields()
const { user } = useAuth()

// Computed: est-ce que l'utilisateur est en mode lecture seule ?
const isReadOnly = computed(() => {
  return user.value?.role === Role.OE || user.value?.role === Role.AUDITOR
})

// Groupe actuel
const currentGroup = computed(() => {
  if (!props.groupKey) return null
  return entityFieldGroups.find((g) => g.key === props.groupKey)
})

// Champs du groupe actuel avec leurs métadonnées
const currentGroupFields = computed(() => {
  if (!currentGroup.value) return []
  const fieldDefs = getFieldsByGroup(currentGroup.value.key)

  return fieldDefs.map((fieldDef) => {
    const fieldValue = props.fields?.find((f) => f.key === fieldDef.key)
    return {
      ...fieldDef,
      value: fieldValue?.value ?? null,
    }
  })
})

// Valeurs d'édition
const editValues = ref<Record<string, any>>({})

// Initialiser les valeurs d'édition
watch(
  [currentGroupFields, isOpen],
  () => {
    if (!isOpen.value || currentGroupFields.value.length === 0) return

    const values: Record<string, any> = {}
    for (const field of currentGroupFields.value) {
      // Convertir Date en string pour inputs date
      if (field.type === 'date' && field.value instanceof Date) {
        values[field.key] = field.value.toISOString().split('T')[0]
      } else {
        values[field.key] = field.value ?? (field.type === 'boolean' ? false : '')
      }
    }
    editValues.value = values
  },
  { immediate: true }
)

// Détection des changements
const changedFields = computed(() => {
  const changes = new Map<string, any>()

  for (const field of currentGroupFields.value) {
    const currentValue = field.value
    const editedValue = editValues.value[field.key]

    // Normalisation pour comparaison
    let normalizedCurrent = currentValue
    let normalizedEdited = editedValue

    if (editedValue === '' || editedValue === undefined) {
      normalizedEdited = null
    }

    if (field.type === 'date' && currentValue instanceof Date) {
      normalizedCurrent = currentValue.toISOString().split('T')[0]
    }

    if (field.type === 'number' && editedValue !== null && editedValue !== '') {
      normalizedEdited = Number(editedValue)
    }

    if (normalizedCurrent !== normalizedEdited) {
      changes.set(field.key, normalizedEdited)
    }
  }

  return changes
})

const hasChanges = computed(() => changedFields.value.size > 0)
const changedFieldsCount = computed(() => changedFields.value.size)

// Historiques des champs
const fieldHistories = ref<Record<string, any[]>>({})

// Charger tous les historiques au montage
watch(
  [currentGroupFields, isOpen],
  async () => {
    if (!isOpen.value || !props.entityId || currentGroupFields.value.length === 0) return

    // Réinitialiser tous les historiques
    fieldHistories.value = {}

    // Charger tous les historiques en une passe
    const fieldKeys = currentGroupFields.value.map((f) => f.key)
    const histories = await fetchMultipleFieldHistories(props.entityId, fieldKeys)

    fieldHistories.value = histories
  },
  { immediate: true }
)

// Format valeur pour affichage
const formatFieldValue = (value: any, type: string, unit?: string) => {
  if (value === null || value === undefined) return 'Non défini'

  switch (type) {
    case 'date':
      return new Date(value).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    case 'boolean':
      return value ? 'Oui' : 'Non'
    case 'number':
      return unit ? `${value} ${unit}` : String(value)
    case 'text':
      return String(value).substring(0, 50) + (String(value).length > 50 ? '...' : '')
    default:
      return String(value)
  }
}

// État de sauvegarde
const isSaving = ref(false)

// Sauvegarde
const handleSave = async () => {
  if (!props.entityId || !currentGroup.value || !hasChanges.value) return

  // Validation des champs requis
  for (const field of currentGroupFields.value) {
    if (field.required) {
      const value = changedFields.value.has(field.key)
        ? changedFields.value.get(field.key)
        : field.value

      if (value === null || value === '' || value === undefined) {
        useToast().add({
          title: 'Champ requis manquant',
          description: `Le champ "${field.label}" est obligatoire`,
          color: 'error',
        })
        return
      }
    }
  }

  isSaving.value = true

  try {
    // Convertir les dates si nécessaire
    const updates = new Map<string, any>()
    for (const [key, value] of changedFields.value.entries()) {
      const fieldDef = currentGroupFields.value.find((f) => f.key === key)

      if (fieldDef?.type === 'date' && value !== null) {
        updates.set(key, new Date(value))
      } else {
        updates.set(key, value)
      }
    }

    const result = await updateFieldGroup(props.entityId, currentGroup.value.key, updates)

    if (result.success) {
      // Recharger les historiques des champs modifiés
      const updatedKeys = Array.from(updates.keys())
      const newHistories = await fetchMultipleFieldHistories(props.entityId, updatedKeys)

      // Mettre à jour seulement les champs modifiés
      for (const key of updatedKeys) {
        fieldHistories.value[key] = newHistories[key] || []
      }

      emit('updated')

      // Fermer le slideover après la sauvegarde
      isOpen.value = false
    }
  } finally {
    isSaving.value = false
  }
}

// Ouvrir historique complet (future feature)
const openFullHistory = (fieldKey: string) => {
  // TODO: Ouvrir un modal avec l'historique complet du champ
  console.log('Open full history for', fieldKey)
}
</script>
