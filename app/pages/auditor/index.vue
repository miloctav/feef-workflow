<script setup lang="ts">
import AuditsTable from '~/components/tables/AuditsTable.vue'

definePageMeta({
  layout: 'dashboard-auditor',
})
</script>

<template>
  <UDashboardPanel id="audits">
    <template #header>
      <NavBar />
    </template>

    <template #body>
      <AuditsTable />
    </template>
  </UDashboardPanel>
</template>
