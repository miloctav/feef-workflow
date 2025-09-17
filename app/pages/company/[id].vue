<script setup lang="ts">
import CompanyDetail from '~/components/CompanyDetail.vue';
import { getCompanyById } from '~/utils/data'

definePageMeta({
  layout: "dashboard-company",
});

const route = useRoute()
const company = getCompanyById(route.params.id as string)

if (!company) {
  throw createError({ statusCode: 404, statusMessage: 'Entreprise non trouvée' })
}
</script>

<template>
  <UDashboardPanel id="companies">
    <template #header>
      <NavBar />
    </template>
    <template #body>
      <!-- Container principal avec 80% de largeur -->
      <div class="w-4/5 mx-auto">
        <CompanyDetail :company="company" role="company"/>
      </div>
    </template>
  </UDashboardPanel>
</template>
