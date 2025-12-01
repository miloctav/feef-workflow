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
import { OERole } from '#shared/types/roles'

const { user } = useAuth()

// Items du menu - filtrer "Gestion des comptes" si l'utilisateur n'est pas ADMIN
const items = computed(() => {
  const baseItems = [
    { label: 'Dashboard', icon: 'i-lucide-home', to: '/oe' },
    { label: 'Entités', icon: 'i-lucide-users', to: '/oe/entities' },
    { label: 'Audits', icon: 'i-lucide-folder', to: '/oe/audits' },
  ]

  // Ajouter "Gestion des comptes" uniquement pour les OE ADMIN
  if (user.value?.oeRole === OERole.ADMIN) {
    baseItems.push({ label: 'Gestion des comptes', icon: 'i-lucide-users-2', to: '/oe/accounts' })
  }

  return baseItems
})
</script>
