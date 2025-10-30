<script setup lang="ts">

definePageMeta({
  layout: "dashboard-auditor",
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
  <UDashboardPanel id="audits">
    <template #header>
      <NavBar />
    </template>

    <template #body>
      <AuditPage />
    </template>
  </UDashboardPanel>
</template>
