<script setup lang="ts">
import CompanyDetail from '~/components/CompanyDetail.vue';
import { getCompanyById } from '~/utils/data'

definePageMeta({
  layout: "dashboard-oe",
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
      <CompanyTabs :company="company" role="oe" />
    </template>
  </UDashboardPanel>
</template>
