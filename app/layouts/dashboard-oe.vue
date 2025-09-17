<template>
  <UDashboardGroup>
    <UDashboardSidebar collapsible resizable :ui="{ footer: 'lg:border-t lg:border-default' }">
      <template #header="{ collapsed }">
        <NuxtLink to="/">
          <img v-if="!collapsed" class="w-[150px] h-auto cursor-pointer"
            alt="Fédération des Entreprises et Entrepreneurs de France"
            src="https://www.feef.org/wp-content/uploads/2025/01/logo_feef.svg">
          <img v-else class="h-8 w-8 mx-auto cursor-pointer" alt="FEEF"
            src="https://www.feef.org/wp-content/uploads/2025/01/logo_feef.svg">
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UButton :label="collapsed ? undefined : 'Rechercher...'" icon="i-lucide-search" color="neutral"
          variant="outline" block :square="collapsed">
          <template v-if="!collapsed" #trailing>
            <div class="flex items-center gap-0.5 ms-auto">
              <UKbd value="meta" variant="subtle" />
              <UKbd value="K" variant="subtle" />
            </div>
          </template>
        </UButton>

        <UNavigationMenu :collapsed="collapsed" :items="items" orientation="vertical" />
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
const items = [
  { label: 'Dashboard', icon: 'i-lucide-home', to: '/oe' },
  { label: 'Entreprises', icon: 'i-lucide-users', to: '/oe/companies' },
  { label: 'Dossiers de labellisation', icon: 'i-lucide-folder', to: '/oe/labeling-cases' },
  { label: 'Gestion des comptes FEEF', icon: 'i-lucide-users-2', to: '/oe/accounts' },
  { label: 'Notifications', icon: 'i-lucide-bell', to: '/oe/notifications' }
]
</script>
