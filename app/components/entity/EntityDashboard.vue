<script setup lang="ts">
import type { EntityField } from '~/types/entities'
import { Role } from '~~/shared/types/roles'

const { currentEntity, fetchEntity } = useEntities()
const { user } = useAuth()
const latestAudit = computed(() => currentEntity.value?.audits?.[0] || null)

// Extraire la date de référence depuis les champs de l'entité
const referenceDateField = computed(() => {
  return currentEntity.value?.fields?.find(f => f.key === 'referenceDate') || null
})

const referenceDate = computed(() => {
  return referenceDateField.value?.value as Date | string | null ?? null
})

// Extraire la date de première labellisation
const firstLabelingDateField = computed(() => {
  return currentEntity.value?.fields?.find(f => f.key === 'firstLabelingDate') || null
})

const isFeef = computed(() => user.value?.role === Role.FEEF)

// Gestion des slidesovers d'édition
const isReferenceDateEditorOpen = ref(false)
const isFirstLabelingDateEditorOpen = ref(false)

// Stub du champ pour l'EntityFieldEditor si le champ n'existe pas encore dans fields
const referenceDateFieldForEditor = computed<EntityField[]>(() => {
  if (referenceDateField.value) {
    return [referenceDateField.value]
  }
  return [{
    key: 'referenceDate',
    label: 'Date de référence',
    type: 'date',
    value: null,
  }]
})

const firstLabelingDateFieldForEditor = computed<EntityField[]>(() => {
  if (firstLabelingDateField.value) {
    return [firstLabelingDateField.value]
  }
  return [{
    key: 'firstLabelingDate',
    label: 'Date de première labellisation',
    type: 'date',
    value: null,
  }]
})

const handleEditorUpdated = async () => {
  if (currentEntity.value) {
    await fetchEntity(currentEntity.value.id)
  }
}
</script>

<template>
  <UPage>
    <UPageBody>
      <!-- État de chargement -->
      <div v-if="!currentEntity" class="flex items-center justify-center p-12">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
        <span class="ml-3 text-gray-600">Chargement du dashboard...</span>
      </div>

      <!-- Dashboard -->
      <div v-else class="space-y-6">
        <!-- Première rangée : Date de référence + OE Info -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ReferenceDateCard
            :reference-date="referenceDate"
            :editable="isFeef"
            @edit="isReferenceDateEditorOpen = true"
          />
          <OeInfoCard :entity="currentEntity" :latest-audit="latestAudit" />
        </div>

        <!-- Deuxième rangée : Date de première labellisation -->
        <div v-if="isFeef || firstLabelingDateField" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-award" class="w-5 h-5 text-primary" />
                  <h3 class="font-semibold text-gray-900">Date de première labellisation</h3>
                </div>
                <UButton
                  v-if="isFeef"
                  icon="i-lucide-pencil"
                  variant="ghost"
                  size="xs"
                  color="neutral"
                  @click="isFirstLabelingDateEditorOpen = true"
                />
              </div>
            </template>
            <div v-if="firstLabelingDateField?.value" class="space-y-2">
              <p class="text-2xl font-bold text-primary">
                {{ new Date(firstLabelingDateField.value as string).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }}
              </p>
            </div>
            <div v-else class="text-center py-4">
              <UIcon name="i-lucide-calendar-x" class="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p class="text-sm text-gray-500">Date de première labellisation non définie</p>
            </div>
          </UCard>
        </div>

        <!-- Timeline de labellisation -->
        <AuditTimelineCard :audit="latestAudit" />
      </div>

      <!-- Slideover d'édition de la date de référence -->
      <EntityFieldEditor
        v-if="currentEntity"
        :entity-id="currentEntity.id"
        :fields="referenceDateFieldForEditor"
        initial-field-key="referenceDate"
        :open="isReferenceDateEditorOpen"
        @update:open="isReferenceDateEditorOpen = $event"
        @updated="handleEditorUpdated"
      />

      <!-- Slideover d'édition de la date de première labellisation -->
      <EntityFieldEditor
        v-if="currentEntity && isFeef"
        :entity-id="currentEntity.id"
        :fields="firstLabelingDateFieldForEditor"
        initial-field-key="firstLabelingDate"
        :open="isFirstLabelingDateEditorOpen"
        @update:open="isFirstLabelingDateEditorOpen = $event"
        @updated="handleEditorUpdated"
      />
    </UPageBody>
  </UPage>
</template>
