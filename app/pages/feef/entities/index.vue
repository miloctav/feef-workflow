<script setup lang="ts">
import EntitiesTable from '~/components/tables/EntitiesTable.vue';

definePageMeta({
  layout: "dashboard-feef",
});

</script>

<template>
  <UDashboardPanel id="companies">
    <template #header>
      <NavBar />
    </template> <template #body>
      <EntitiesTable />
    </template>
  </UDashboardPanel>
</template>
