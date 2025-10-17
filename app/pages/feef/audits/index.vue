<script setup lang="ts">
import AuditsTable from '~/components/tables/AuditsTable.vue';




definePageMeta({
  layout: "dashboard-feef",
});


</script>

<template>
  <UDashboardPanel id="labeling-cases">
    <template #header>
      <NavBar />
    </template>
    <template #body>
      <AuditsTable />
    </template>
  </UDashboardPanel>
</template>
