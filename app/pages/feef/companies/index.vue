<script setup lang="ts">
definePageMeta({
  layout: "dashboard-feef",
});

</script>

<template>
  <UDashboardPanel id="companies">
    <template #header>
      <NavBar />
    </template> <template #body>
      <CompaniesTable />
    </template>
  </UDashboardPanel>
</template>
