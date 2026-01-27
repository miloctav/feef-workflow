<script setup lang="ts">
interface Oe {
  id: number
  name: string
}

interface Auditor {
  id: number
  firstname: string
  lastname: string
}

interface Audit {
  auditor?: Auditor | null
}

interface Entity {
  id: number
  oe?: Oe | null
}

const props = defineProps<{
  entity: Entity | null
  latestAudit: Audit | null
}>()

const { fetchEntity } = useEntities()

const handleOeUpdated = async () => {
  if (props.entity?.id) {
    await fetchEntity(props.entity.id)
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-briefcase" class="w-5 h-5 text-primary" />
          <h3 class="font-semibold text-gray-900">Mon Organisme Évaluateur</h3>
        </div>
        <SelectOeModal
          v-if="entity"
          :entity-id="entity.id"
          :current-entity-oe="entity.oe"
          @updated="handleOeUpdated"
        />
      </div>
    </template>

    <div class="space-y-3">
      <!-- Nom de l'OE -->
      <div v-if="entity?.oe">
        <p class="text-lg font-semibold text-gray-900">{{ entity.oe.name }}</p>
      </div>
      <div v-else>
        <p class="text-gray-500">Aucun OE assigné</p>
        <p class="text-sm text-gray-400 mt-1">
          Cliquez sur le bouton ci-dessus pour sélectionner un organisme évaluateur
        </p>
      </div>

      <!-- Auditeur assigné -->
      <div v-if="latestAudit?.auditor" class="pt-2 border-t border-gray-200">
        <p class="text-sm text-gray-600">
          <span class="font-medium">Auditeur assigné :</span>
          <span class="ml-1">
            {{ latestAudit.auditor.firstname }} {{ latestAudit.auditor.lastname }}
          </span>
        </p>
      </div>
    </div>
  </UCard>
</template>
