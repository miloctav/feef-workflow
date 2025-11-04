<script setup lang="ts">
import EntityCase from '~/components/entity/EntityCase.vue';


definePageMeta({
  layout: "dashboard-entity",
});

const { currentEntity, fetchEntity, fetchLoading, fetchError, submitCase, submitCaseLoading } = useEntities()
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
