<script setup lang="ts">

definePageMeta({
  layout: "dashboard-entity",
});

const { currentEntity, fetchEntity, fetchLoading, fetchError } = useEntities()
const { user } = useAuth()

const entityId = user.value?.currentEntityId

onMounted(async () => {
  if(!entityId) {
    throw createError({ statusCode: 404, message: 'Entité non trouvée' })
  }
  const result = await fetchEntity(entityId)

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
      <!-- Container principal avec 80% de largeur -->
      <div class="w-4/5 mx-auto">
        <EntityPage />
      </div>
    </template>
  </UDashboardPanel>
</template>
