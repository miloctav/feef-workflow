<script setup lang="ts">
definePageMeta({
  layout: "dashboard-entity",
})
</script>

<template>
  <UDashboardPanel id="dashboard">
    <template #header>
      <NavBar />
    </template>
    <template #body>
      <EntityDashboard />
    </template>
  </UDashboardPanel>
</template>
