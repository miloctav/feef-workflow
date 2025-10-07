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
          :items="items.slice(0,4)"
          orientation="vertical"
        />
        <USeparator label="Entreprises du groupe" class="my-3" />
        <UNavigationMenu
          :collapsed="collapsed"
          :items="items.slice(5)"
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
import { COMPANIES, getCompanyById } from '../components/../utils/data'

const selectedCompanyId = ref(COMPANIES.length > 0 ? COMPANIES[0].id : '')

const selectedCompany = computed(() => getCompanyById(selectedCompanyId.value))

const items = computed(() => {
  const baseItems = [
    { label: 'Mon dossier', icon: 'i-lucide-home', to: `/company/${selectedCompanyId.value}` },
    { label: 'Mon espace documentaire', icon: 'i-lucide-folder-open', to: `/company/documents` },
    { label: 'Mes contrats', icon: 'i-lucide-file-signature', to: `/company/contracts` },
    { label: 'Mes audits', icon: 'i-lucide-clipboard-list', to: `/company/labeling-cases` }
  ]

  const company = selectedCompany.value

  // Si l'entreprise est un groupe, afficher les entreprises du groupe
  if (company?.appartenanceGroupe?.estGroupe && company.appartenanceGroupe.entreprisesGroupe?.length) {
    const groupCompanies = company.appartenanceGroupe.entreprisesGroupe.map(entrepriseId => {
      const entreprise = getCompanyById(entrepriseId)
      return {
        label: entreprise?.raisonSociale.nom || entrepriseId,
        icon: 'i-lucide-building-2',
        to: `/company/${entrepriseId}`
      }
    })
    return [...baseItems, { type: 'label' as const, label: '' }, ...groupCompanies]
  }

  return baseItems
})
</script>
