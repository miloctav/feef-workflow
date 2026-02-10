<script setup lang="ts">
import type { EntityField } from '~/types/entities'
import { Role } from '~~/shared/types/roles'

const { currentEntity, fetchEntity } = useEntities()
const { user } = useAuth()
const latestAudit = computed(() => currentEntity.value?.audits?.[0] || null)

// Extraire la date anniversaire depuis les champs de l'entité
const anniversaryField = computed(() => {
  return currentEntity.value?.fields?.find(f => f.key === 'anniversaryDate') || null
})

const anniversaryDate = computed(() => {
  return anniversaryField.value?.value as Date | string | null ?? null
})

const isFeef = computed(() => user.value?.role === Role.FEEF)

// Gestion du slideover d'édition
const isEditorOpen = ref(false)

// Stub du champ pour l'EntityFieldEditor si le champ n'existe pas encore dans fields
const anniversaryFieldForEditor = computed<EntityField[]>(() => {
  if (anniversaryField.value) {
    return [anniversaryField.value]
  }
  return [{
    key: 'anniversaryDate',
    label: 'Date anniversaire de labellisation',
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
        <!-- Première rangée : Anniversaire + OE Info -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnniversaryCard
            :anniversary-date="anniversaryDate"
            :editable="isFeef"
            @edit="isEditorOpen = true"
          />
          <OeInfoCard :entity="currentEntity" :latest-audit="latestAudit" />
        </div>

        <!-- Timeline de labellisation -->
        <AuditTimelineCard :audit="latestAudit" />
      </div>

      <!-- Slideover d'édition de la date anniversaire -->
      <EntityFieldEditor
        v-if="currentEntity"
        :entity-id="currentEntity.id"
        :fields="anniversaryFieldForEditor"
        initial-field-key="anniversaryDate"
        :open="isEditorOpen"
        @update:open="isEditorOpen = $event"
        @updated="handleEditorUpdated"
      />
    </UPageBody>
  </UPage>
</template>
