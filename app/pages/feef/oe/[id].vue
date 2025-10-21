<script setup lang="ts">

definePageMeta({
  layout: "dashboard-feef",
});

const { currentOE, fetchOE } = useOes()

const route = useRoute()
const oeId = computed(() => Number(route.params.id))

onMounted(async () => {
  const result = await fetchOE(oeId.value)

  if (!result.success) {
    throw createError({ statusCode: 404, message: 'OE non trouvée' })
  }
})
</script>

<template>
  <UDashboardPanel id="oe">
    <template #header>
      <NavBar />
    </template>
    
    <template #body>
      <AccountsTable :oe-id="oeId"/>
    </template>
  </UDashboardPanel>
</template>
