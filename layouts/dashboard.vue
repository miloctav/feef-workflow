<template>
  <UDashboardGroup>
    <UDashboardSidebar collapsible resizable>
      <template #default>
        <UNavigationMenu
          :items="items"
          orientation="vertical"
        />
      </template>
    </UDashboardSidebar>
    <slot />
  </UDashboardGroup>
</template>

<script setup lang="ts">
const items = [
  { label: 'Dashboard', icon: 'i-lucide-home', to: '/feef' },
  { label: 'Entreprises', icon: 'i-lucide-users', to: '/feef/companies' },
  { label: 'Dossiers de labellisation', icon: 'i-lucide-folder', to: '/feef/labeling-cases' }
]
</script>