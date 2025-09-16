<script setup lang="ts">

definePageMeta({
  layout: "dashboard-oe",
});
</script>

<template>
  <UDashboardPanel id="accounts">
    <template #header>
      <NavBar />
    </template>

    <template #body>
      <div class="w-full space-y-4 pb-4">
        <OeAccountTable />
      </div>
    </template>
  </UDashboardPanel>
</template>
