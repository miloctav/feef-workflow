<script setup lang="ts">

definePageMeta({
  layout: "dashboard-feef",
});

const route = useRoute()
const { currentAudit, fetchAudit } = useAudits()

const auditId = computed(() => Number(route.params.id))
onMounted(async () => {
  const result = await fetchAudit(auditId.value)

  if (!result.success) {
    throw createError({ statusCode: 404, message: 'Audit non trouvé' })
  }
})
</script>

<template>
  <UDashboardPanel id="labeling-case-detail">
    <template #header>
      <NavBar />
    </template>

    <template #body>
      <AuditPage />
    </template>
  </UDashboardPanel>
</template>
