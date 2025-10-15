<script setup lang="ts">
import EntitiesTable from '~/components/tables/EntitiesTable.vue';


definePageMeta({
  layout: "dashboard-oe",
});


</script>

<template>
  <UDashboardPanel id="companies">
    <template #header>
      <NavBar />
    </template> <template #body>
      <EntitiesTable role="oe" />
    </template>
  </UDashboardPanel>
</template>
