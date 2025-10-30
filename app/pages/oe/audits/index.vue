<script setup lang="ts">

definePageMeta({
  layout: "dashboard-oe",
});
</script>

<template>
  <UDashboardPanel id="audits">
    <template #header>
      <NavBar />
    </template>

    <template #body>
      <AuditsTable />
    </template>
  </UDashboardPanel>
</template>
