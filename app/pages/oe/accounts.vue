<script setup lang="ts">

definePageMeta({
  layout: "dashboard-oe",
});

const { user } = useAuth()
</script>

<template>
  <UDashboardPanel id="accounts">
    <template #header>
      <NavBar />
    </template>

    <template #body>
        <AccountsTable v-if="user?.oeId" :oe-id="user?.oeId" />
    </template>
  </UDashboardPanel>
</template>
