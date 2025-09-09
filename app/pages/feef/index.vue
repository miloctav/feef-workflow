<script setup lang="ts">
definePageMeta({
    layout: 'dashboard-feef'
})
</script>

<template>
  <UDashboardPanel id="dashboard">
    <template #header>
      <UDashboardNavbar title="Dashboard">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div> Dashboard </div>
    </template>
  </UDashboardPanel>
</template>