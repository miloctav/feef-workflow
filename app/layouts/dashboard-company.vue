<template>
  <UDashboardGroup>
    <UDashboardSidebar collapsible resizable :ui="{ footer: 'lg:border-t lg:border-default' }">
      <template #header="{ collapsed }">
        <NuxtLink to="/">
          <img 
            v-if="!collapsed"
            class="w-[150px] h-auto cursor-pointer" 
            alt="Fédération des Entreprises et Entrepreneurs de France" 
            src="https://www.feef.org/wp-content/uploads/2025/01/logo_feef.svg"
          >
          <img 
            v-else
            class="h-8 w-8 mx-auto cursor-pointer" 
            alt="FEEF" 
            src="https://www.feef.org/wp-content/uploads/2025/01/logo_feef.svg"
          >
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
  <SwitchCompanyMenu :collapsed="collapsed" @update:id="selectedCompanyId = $event" />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="items.slice(0,2)"
          orientation="vertical"
        />
        <USeparator label="Dossiers de labellisation" class="my-3" />
        <UNavigationMenu
          :collapsed="collapsed"
          :items="items.slice(3)"
          orientation="vertical"
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>
    
    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar />
      </template>
      <slot />
    </UDashboardPanel>
    <NotificationsSlideover />
  </UDashboardGroup>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { COMPANIES } from '../components/../utils/data'

const selectedCompanyId = ref(COMPANIES.length > 0 ? COMPANIES[0].id : '')

const items = computed(() => [
  { label: 'Mon entreprise', icon: 'i-lucide-home', to: `/company/${selectedCompanyId.value}` },
  { label: 'Notifications', icon: 'i-lucide-bell', to: `/company/notifications` },
  { type: 'label' as const, label: '' },
  { label: 'Renouvellement (2025)', icon: 'i-lucide-folder', to: `/company/labeling-cases/${selectedCompanyId.value}` },
  { label: 'Initial (2024)', icon: 'i-lucide-folder', to: `/company/labeling-cases/${selectedCompanyId.value}` }
])
</script>
