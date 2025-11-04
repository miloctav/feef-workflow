<template>
  <UModal
    title="Modifier les informations de l'entité"
    :ui="{ width: 'sm:max-w-3xl' }"
  >
    <!-- Bouton trigger du modal -->
    <UButton
      v-if="user?.role === Role.FEEF || user?.role === Role.ENTITY"
      color="primary"
      variant="outline"
      size="md"
      icon="i-lucide-edit"
      label="Modifier les informations"
    />

    <template #body>
      <div v-if="currentEntity?.fields" class="space-y-6">
        <div
          v-for="field in currentEntity.fields"
          :key="field.key"
          class="space-y-2"
        >
          <label class="block">
            <span class="text-sm font-medium text-gray-700">
              {{ field.label }}
              <span v-if="field.unit" class="text-gray-500">({{ field.unit }})</span>
            </span>

            <!-- Input selon le type de champ -->
            <div class="mt-1">
              <!-- String -->
              <UInput
                v-if="field.type === 'string'"
                v-model="formFields[field.key]"
                type="text"
                :placeholder="`Entrer ${field.label.toLowerCase()}`"
              />

              <!-- Number -->
              <UInput
                v-else-if="field.type === 'number'"
                v-model="formFields[field.key]"
                type="number"
                :placeholder="`Entrer ${field.label.toLowerCase()}`"
              />

              <!-- Boolean -->
              <UToggle
                v-else-if="field.type === 'boolean'"
                v-model="formFields[field.key]"
                :ui="{ base: 'mt-1' }"
              />

              <!-- Date -->
              <UInput
                v-else-if="field.type === 'date'"
                v-model="formFields[field.key]"
                type="date"
              />
            </div>

            <!-- Dernière modification -->
            <p
              v-if="field.lastUpdatedAt"
              class="text-xs text-gray-500 mt-1"
            >
              {{ formatLastUpdate(field) }}
            </p>
          </label>
        </div>
      </div>
    </template>

    <template #footer="{ close }">
      <UButton
        label="Annuler"
        color="gray"
        variant="outline"
        :disabled="updateFieldsLoading"
        @click="close"
      />
      <UButton
        label="Enregistrer"
        color="primary"
        icon="i-lucide-save"
        :loading="updateFieldsLoading"
        @click="handleSave(close)"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { EntityField } from '~/types/entities'

const { currentEntity, fetchEntity } = useEntities()
const { updateEntityFields, updateFieldsLoading } = useEntityFields()
const { user } = useAuth()

// Valeurs du formulaire (copie locale des champs)
const formFields = ref<Record<string, any>>({})

// Initialiser le formulaire avec les valeurs actuelles de l'entité
const initializeForm = () => {
  if (!currentEntity.value?.fields) return

  formFields.value = {}
  currentEntity.value.fields.forEach(field => {
    // Convertir Date en string pour les inputs de type date
    if (field.type === 'date' && field.value instanceof Date) {
      formFields.value[field.key] = field.value.toISOString().split('T')[0]
    } else {
      formFields.value[field.key] = field.value ?? ''
    }
  })
}

// Initialiser au montage et quand l'entité change
watch(() => currentEntity.value, () => {
  initializeForm()
}, { immediate: true })

// Détecter les champs modifiés
const getModifiedFields = (): Map<string, any> => {
  const modified = new Map<string, any>()

  if (!currentEntity.value?.fields) return modified

  currentEntity.value.fields.forEach(field => {
    const currentValue = field.value
    const formValue = formFields.value[field.key]

    // Normaliser les valeurs pour la comparaison
    let normalizedCurrent = currentValue
    let normalizedForm = formValue

    // Convertir les valeurs vides en null
    if (formValue === '' || formValue === undefined) {
      normalizedForm = null
    }

    // Pour les dates, comparer les strings ISO
    if (field.type === 'date') {
      if (currentValue instanceof Date) {
        normalizedCurrent = currentValue.toISOString().split('T')[0]
      }
    }

    // Pour les nombres, convertir en number
    if (field.type === 'number' && formValue !== null && formValue !== '') {
      normalizedForm = Number(formValue)
    }

    // Comparer les valeurs
    if (normalizedCurrent !== normalizedForm) {
      // Stocker la valeur finale (convertie si nécessaire)
      let finalValue = normalizedForm

      if (field.type === 'date' && normalizedForm !== null) {
        finalValue = new Date(normalizedForm)
      }

      modified.set(field.key, finalValue)
    }
  })

  return modified
}

// Enregistrer les modifications
const handleSave = async (close: () => void) => {
  if (!currentEntity.value) return

  const modifiedFields = getModifiedFields()

  if (modifiedFields.size === 0) {
    close()
    return
  }

  const result = await updateEntityFields(currentEntity.value.id, modifiedFields)

  if (result.success) {
    // Rafraîchir l'entité pour récupérer les nouvelles valeurs
    await fetchEntity(currentEntity.value.id)
    close()
  }
}

// Helper pour afficher la dernière modification
const formatLastUpdate = (field: EntityField) => {
  if (!field.lastUpdatedAt) return null

  const date = new Date(field.lastUpdatedAt)
  return `Dernière modification: ${date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`
}
</script>
