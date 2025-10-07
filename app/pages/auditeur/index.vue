<script setup lang="ts">
definePageMeta({
    layout: 'dashboard-auditeur'
})

</script>

<template>
  <UDashboardPanel id="dashboard">
    <template #header>
      <NavBar />
    </template>

    <template #body>
      <DashboardPage role="auditeur" />
    </template>
  </UDashboardPanel>
</template>
