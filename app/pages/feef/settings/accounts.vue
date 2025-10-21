<template>
  <UDashboardPanel id="accountsSettings">
    <template #header>
      <NavBar />
    </template>
    <template #body>
      <AccountsTable
        :allow-delete="true"
      />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard-feef' })
</script>
