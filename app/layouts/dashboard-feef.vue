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
    
    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar />
      </template>
      <slot />
    </UDashboardPanel>
  </UDashboardGroup>
</template>

<script setup lang="ts">
const items = [
  { label: 'Dashboard', icon: 'i-lucide-home', to: '/feef' },
  { label: 'Entreprises', icon: 'i-lucide-users', to: '/feef/companies' },
  { label: 'Dossiers de labellisation', icon: 'i-lucide-folder', to: '/feef/labeling-cases' },
  { label: 'Organismes Évaluateurs', icon: 'i-lucide-shield-check', to: '/feef/oe' },
  { label: 'Configuration des documents', icon: 'i-lucide-file-text', to: '/feef/settings' },
  { label: 'Notifications', icon: 'i-lucide-bell', to: '/feef/notifications' }
]
</script>