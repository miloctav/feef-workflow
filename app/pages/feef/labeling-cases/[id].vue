<script setup lang="ts">
import { getCompanyById } from '~/utils/data'

definePageMeta({
  layout: "dashboard-feef",
});

const route = useRoute()
const company = getCompanyById(route.params.id as string)

if (!company) {
  throw createError({ statusCode: 404, statusMessage: 'Dossier de labellisation non trouvé' })
}
</script>

<template>
  <UDashboardPanel id="labeling-case-detail">
    <template #header>
      <NavBar />
    </template>

    <template #body>
      <LabelingCaseDetail :company="company" role="feef" />
    </template>
  </UDashboardPanel>
</template>
