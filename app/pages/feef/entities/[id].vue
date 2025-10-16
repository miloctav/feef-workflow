<script setup lang="ts">
import CompanyTabs from '~/components/CompanyTabs.vue'
import { getCompanyById } from '~/utils/data'

definePageMeta({
  layout: "dashboard-feef",
});

const route = useRoute()
const company = getCompanyById(route.params.id as string)

if (!company) {
  throw createError({ statusCode: 404, message: 'Entreprise non trouvée' })
}
</script>

<template>
  <UDashboardPanel id="companies">
    <template #header>
      <NavBar />
    </template>
    <template #body>
      <CompanyTabs :company="company" role="feef" />
    </template>
  </UDashboardPanel>
</template>
