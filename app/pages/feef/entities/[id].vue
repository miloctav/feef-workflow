<script setup lang="ts">
import EntityPage from '~/components/pages/EntityPage.vue'

definePageMeta({
  layout: "dashboard-feef",
})

const route = useRoute()
const { currentEntity, fetchEntity, fetchLoading, fetchError } = useEntities()

// Récupérer l'ID depuis la route
const entityId = computed(() => Number(route.params.id))

// Récupérer l'entité au montage du composant
onMounted(async () => {
  const result = await fetchEntity(entityId.value)

  if (!result.success) {
    throw createError({ statusCode: 404, message: 'Entité non trouvée' })
  }
})
</script>

<template>
  <UDashboardPanel id="companies">
    <template #header>
      <NavBar />
    </template>
    <template #body>
      <div v-if="fetchLoading" class="flex items-center justify-center p-8">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-primary" />
        <span class="ml-2">Chargement...</span>
      </div>
      <div v-else-if="fetchError" class="flex items-center justify-center p-8">
        <p class="text-error">{{ fetchError }}</p>
      </div>
      <EntityPage v-else-if="currentEntity" role="feef" />
    </template>
  </UDashboardPanel>
</template>
