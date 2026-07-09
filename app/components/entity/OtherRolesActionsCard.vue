<script setup lang="ts">
const props = defineProps<{
  entityId: number | undefined
}>()

const entityIdRef = computed(() => props.entityId)

const { actions, loading, error } = useSimpleActions({
  entityId: entityIdRef,
  filters: {
    includeOtherRoles: true,
    sort: 'deadline:asc',
    limit: 50,
  },
})

// Les actions de l'entreprise sont déjà présentées ailleurs : on ne garde ici
// que celles attendues des autres intervenants (FEEF, OE, auditeur).
const otherRolesActions = computed(() =>
  actions.value.filter(action => !action.assignedRoles.includes('ENTITY')),
)
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-users" class="w-5 h-5 text-primary" />
        <h3 class="font-semibold text-gray-900">Actions attendues des autres intervenants</h3>
        <UBadge v-if="otherRolesActions.length" color="neutral" variant="soft" size="xs">
          {{ otherRolesActions.length }}
        </UBadge>
      </div>
    </template>

    <div v-if="loading" class="flex items-center justify-center py-8 text-gray-500">
      <UIcon name="i-lucide-loader-2" class="w-5 h-5 animate-spin" />
      <span class="ml-2 text-sm">Chargement des actions...</span>
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      icon="i-lucide-alert-triangle"
      :title="error"
    />

    <div
      v-else-if="otherRolesActions.length"
      class="grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      <ActionCard
        v-for="action in otherRolesActions"
        :key="action.id"
        :action="action"
        :clickable="!!action.auditId"
        :hide-description="true"
      />
    </div>

    <div v-else class="text-center py-6">
      <UIcon name="i-lucide-check-circle-2" class="w-8 h-8 mx-auto mb-2 text-gray-400" />
      <p class="text-sm text-gray-500">
        Aucune action n'est en attente du côté de la FEEF, de l'organisme évaluateur ou de l'auditeur.
      </p>
    </div>
  </UCard>
</template>
