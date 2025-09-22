<script setup lang="ts">

definePageMeta({
  layout: 'dashboard-feef'
})
</script>

<template>
  <UDashboardPanel id="dashboard">
    <template #header>
      <NavBar />
    </template>
    <template #body>
      <DashboardPage />
    </template>
  </UDashboardPanel>
</template>