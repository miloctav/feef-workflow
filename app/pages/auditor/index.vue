<script setup lang="ts">
definePageMeta({
    layout: 'dashboard-auditor'
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
