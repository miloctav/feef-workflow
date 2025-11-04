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
  </UDashboardGroup>
</template>

<script setup lang="ts">
const items = [
  { label: 'Mon dossier', icon: 'i-lucide-home', to: `/entity` },
  { label: 'Mon espace documentaire', icon: 'i-lucide-folder-open', to: `/entity/documents` },
  { label: 'Mes contrats', icon: 'i-lucide-file-signature', to: `/entity/contracts` },
  { label: 'Mes audits', icon: 'i-lucide-clipboard-list', to: `/entity/audits` }
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
