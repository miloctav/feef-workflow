<script setup lang="ts">
import { getCompanyById } from '~/utils/data'

definePageMeta({
  layout: "dashboard-auditeur",
});

const route = useRoute()
const company = getCompanyById(route.params.id as string)

if (!company) {
  throw createError({ statusCode: 404, statusMessage: 'Audit non trouvé' })
}
</script>

<template>
  <UDashboardPanel id="audit-detail">
    <template #header>
      <NavBar />
    </template>

    <template #body>
      <LabelingCaseDetail :company="company" role="auditeur" />
    </template>
  </UDashboardPanel>
</template>
