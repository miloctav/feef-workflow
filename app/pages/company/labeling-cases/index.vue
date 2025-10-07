<script setup lang="ts">
import { COMPANIES, getCompanyById } from "~/utils/data";

definePageMeta({
  layout: "dashboard-company",
});

// TODO: Récupérer l'ID de l'entreprise connectée
const selectedCompanyId = ref(COMPANIES.length > 0 ? COMPANIES[0].id : '');
const selectedCompany = computed(() => getCompanyById(selectedCompanyId.value));
</script>

<template>
  <UDashboardPanel id="labeling-cases">
    <template #header>
      <NavBar />
    </template>

    <template #body>
      <LabelingCasesTable
        v-if="selectedCompany"
        :company="selectedCompany"
        role="company"
        :withFilters="false"
      />
    </template>
  </UDashboardPanel>
</template>
