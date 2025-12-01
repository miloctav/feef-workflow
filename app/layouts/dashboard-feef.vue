<template>
  <UDashboardGroup>
    <UDashboardSidebar collapsible resizable :ui="{ footer: 'lg:border-t lg:border-default' }">
      <template #header="{ collapsed }">
        <div class="w-full flex justify-center items-center pt-2">
          <NuxtLink to="/">
            <img v-if="!collapsed" class="max-w-[70px] h-auto cursor-pointer mx-auto"
              alt="PME+ Engagé"
              src="~/assets/images/Logo-PMEplus.png">
            <img v-else class="h-8 w-8 cursor-pointer object-contain mx-auto" alt="PME+"
              src="~/assets/images/Logo-PMEplus.png">
          </NuxtLink>
        </div>
      </template>

      <template #default="{ collapsed }">
        <UButton
          :label="collapsed ? undefined : 'Rechercher...'"
          icon="i-lucide-search"
          color="neutral"
          variant="outline"
          block
          :square="collapsed"
        >
          <template v-if="!collapsed" #trailing>
            <div class="flex items-center gap-0.5 ms-auto">
              <UKbd value="meta" variant="subtle" />
              <UKbd value="K" variant="subtle" />
            </div>
          </template>
        </UButton>

        <UNavigationMenu
          :collapsed="collapsed"
          :items="items"
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
const items = [
  { label: 'Dashboard', icon: 'i-lucide-home', to: '/feef' },
  { label: 'Entités', icon: 'i-lucide-users', to: '/feef/entities' },
  { label: 'Audits', icon: 'i-lucide-folder', to: '/feef/audits' },
  { label: 'Organismes Évaluateurs', icon: 'i-lucide-shield-check', to: '/feef/oes' },
  {
    label: 'Paramètres',
    icon: 'i-lucide-settings',
    defaultOpen: true,
    children: [
      { label: 'Configuration des documents', icon: 'i-lucide-file-text', to: '/feef/settings/documents' },
      { label: 'Gestion des comptes', icon: 'i-lucide-users-2', to: '/feef/settings/accounts' }
    ]
  },
]
</script>
