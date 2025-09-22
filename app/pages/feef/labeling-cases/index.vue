<script setup lang="ts">


definePageMeta({
  layout: "dashboard-feef",
});


</script>

<template>
  <UDashboardPanel id="labeling-cases">
    <template #header>
      <NavBar />
    </template>
    <template #body>
      <LabelingCasesTable />
    </template>
  </UDashboardPanel>
</template>
