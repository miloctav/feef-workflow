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
        <EntitySwitcher :collapsed="collapsed" />

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
        <UDashboardNavbar>
          <template #right>
            <UButton
              icon="i-lucide-repeat"
              label="Changer d'organisme évaluateur"
              color="primary"
              variant="outline"
            />
          </template>
        </UDashboardNavbar>
      </template>
      <slot />
    </UDashboardPanel>
    <NotificationsSlideover />
    <ActionsSlideover />
  </UDashboardGroup>
</template>

<script setup lang="ts">
const items = [
  { label: 'Mon dossier', icon: 'i-lucide-home', to: `/entity` },
  { label: 'Mon espace documentaire', icon: 'i-lucide-folder-open', to: `/entity/documents` },
  { label: 'Mes contrats', icon: 'i-lucide-file-signature', to: `/entity/contracts` },
  { label: 'Mes audits', icon: 'i-lucide-clipboard-list', to: `/entity/audits` },
]

const { fetchEntity } = useEntities()
const { user } = useAuth()

const entityId = user.value?.currentEntityId

onMounted(async () => {
  if (!entityId) {
    throw createError({ statusCode: 404, message: 'Entité non trouvée' })
  }
  const result = await fetchEntity(entityId)

  if (!result.success) {
    throw createError({ statusCode: 404, message: 'Entité non trouvée' })
  }
})
</script>
