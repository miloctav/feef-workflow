<script setup lang="ts">
import EntityCase from '~/components/entity/EntityCase.vue';


definePageMeta({
  layout: "dashboard-entity",
});

const { currentEntity, fetchEntity, fetchLoading, fetchError, submitCase, submitCaseLoading } = useEntities()
const { user } = useAuth()

const entityId = user.value?.currentEntityId

onMounted(async () => {
  if (!entityId) {
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
      <EntityCase v-if="!fetchLoading && currentEntity" />
    </template>
  </UDashboardPanel>
</template>
