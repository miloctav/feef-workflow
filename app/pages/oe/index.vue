<script setup lang="ts">
definePageMeta({
    layout: 'dashboard-oe'
})

</script>

<template>
  <UDashboardPanel id="dashboard">
    <template #header>
      <NavBar />
    </template>

    <template #body>
      <DashboardPage role="oe" />
    </template>
  </UDashboardPanel>
</template>