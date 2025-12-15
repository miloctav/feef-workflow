<template>
  <UDashboardGroup>
    <UDashboardSidebar
      collapsible
      resizable
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <div class="w-full flex justify-center items-center pt-2">
          <NuxtLink to="/">
            <img
              v-if="!collapsed"
              class="max-w-[70px] h-auto cursor-pointer mx-auto"
              alt="PME+ Engagé"
              src="~/assets/images/Logo-PMEplus.png"
            />
            <img
              v-else
              class="h-8 w-8 cursor-pointer object-contain mx-auto"
              alt="PME+"
              src="~/assets/images/Logo-PMEplus.png"
            />
          </NuxtLink>
        </div>
      </template>

      <template #default="{ collapsed }">
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
const items = [{ label: 'Mes Audits', icon: 'i-lucide-clipboard-list', to: '/auditor' }]
</script>
