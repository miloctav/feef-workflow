<script setup lang="ts">
const { isActionsSlideoverOpen } = useDashboard()
const route = useRoute()

// Detect current role from route
const currentRole = computed(() => {
  const path = route.path
  if (path.startsWith('/feef')) return 'FEEF'
  if (path.startsWith('/oe')) return 'OE'
  if (path.startsWith('/entity')) return 'ENTITY'
  if (path.startsWith('/auditor')) return 'AUDITOR'
  return null
})

// Composable pour récupérer les actions
const { actions, fetchActions, loading: fetchLoading, error: fetchError } = useSimpleActions({
  filters: {
    limit: 25,
    sort: 'deadline:asc',
  },
})

// Charger les actions à l'ouverture du slideover
watch(isActionsSlideoverOpen, async (isOpen) => {
  if (isOpen) {
    const additionalFilters: Record<string, any> = {}

    // Pour FEEF, filtrer uniquement les actions assignées au rôle FEEF
    if (currentRole.value === 'FEEF') {
      additionalFilters.assignedRoles = 'FEEF'
    }

    await fetchActions(additionalFilters)
  }
})

// Fermer automatiquement au changement de route
watch(() => route.fullPath, () => {
  isActionsSlideoverOpen.value = false
})
</script>

<template>
  <USlideover
    v-model:open="isActionsSlideoverOpen"
    title="Mes actions"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <h2 class="text-lg font-semibold text-gray-900">
          Mes actions
        </h2>
      </div>
    </template>

    <template #body>
      <!-- État de chargement -->
      <div
        v-if="fetchLoading"
        class="flex items-center justify-center p-8"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="animate-spin w-6 h-6 text-primary"
        />
        <span class="ml-2 text-sm text-gray-600">Chargement des actions...</span>
      </div>

      <!-- État d'erreur -->
      <div
        v-else-if="fetchError"
        class="p-4"
      >
        <UAlert
          color="error"
          icon="i-lucide-alert-triangle"
          :title="fetchError"
        />
      </div>

      <!-- État vide -->
      <div
        v-else-if="!actions || actions.length === 0"
        class="flex flex-col items-center justify-center p-8 text-center"
      >
        <UIcon
          name="i-lucide-check-circle-2"
          class="w-12 h-12 text-gray-400 mb-3"
        />
        <p class="text-sm font-medium text-gray-900">
          Aucune action en cours
        </p>
        <p class="text-xs text-gray-500 mt-1">
          Vous êtes à jour !
        </p>
      </div>

      <!-- Liste des actions -->
      <div
        v-else
        class="space-y-3 px-2 py-2"
      >
        <ActionCard
          v-for="action in actions"
          :key="action.id"
          :action="action"
          :clickable="true"
          :compact="true"
          @click="isActionsSlideoverOpen = false"
        />
      </div>
    </template>
  </USlideover>
</template>
