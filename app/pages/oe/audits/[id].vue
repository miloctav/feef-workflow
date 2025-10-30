<script setup lang="ts">
import Stepper from '~/components/Stepper.vue';
import { getCompanyById } from '~/utils/data'

definePageMeta({
  layout: "dashboard-oe",
});

const route = useRoute()
const company = getCompanyById(route.params.id as string)

if (!company) {
  throw createError({ statusCode: 404, message: 'Dossier de labellisation non trouvé' })
}
</script>

<template>
  <UDashboardPanel id="labeling-case-detail">
    <template #header>
      <NavBar />
    </template>

    <template #body>
      <LabelingCaseDetail :company="company" role="oe" />
    </template>
  </UDashboardPanel>
</template>
