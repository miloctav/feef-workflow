<script setup lang="ts">

definePageMeta({
  layout: "dashboard-entity",
});
</script>

<template>
  <UDashboardPanel id="audits">
    <template #header>
      <NavBar />
    </template>

    <template #body>
      <AuditsTable :has-filters="false" />
    </template>
  </UDashboardPanel>
</template>
