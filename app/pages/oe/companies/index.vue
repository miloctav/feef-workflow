<script setup lang="ts">

definePageMeta({
  layout: "dashboard-oe",
});


</script>

<template>
  <UDashboardPanel id="companies">
    <template #header>
      <NavBar />
    </template> <template #body>
      <CompaniesTable role="oe" />
    </template>
  </UDashboardPanel>
</template>
