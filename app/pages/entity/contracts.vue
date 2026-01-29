<template>
  <UDashboardPanel id="labeling-case-detail">
    <template #header>
      <NavBar />
    </template>

    <template #body>
      <UContainer class="py-8">
        <UPage>
          <UPageHeader
            title="Mes contrats"
            description="Consultez et gérez vos contrats de labellisation et devis"
          >
            <template #icon>
              <UIcon
                name="i-lucide-file-signature"
                class="w-8 h-8 text-primary"
              />
            </template>
          </UPageHeader>

          <UPageBody>
            <div class="space-y-6">
              <ContractsList />
            </div>
          </UPageBody>
        </UPage>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard-entity',
})

const { currentEntity, fetchEntity, fetchLoading, fetchError, submitCase, submitCaseLoading } =
  useEntities()
const { fetchContracts } = useContracts()
const { user } = useAuth()

const entityId = user.value?.currentEntityId

onMounted(async () => {
  if (!entityId) {
    throw createError({ statusCode: 404, message: 'Entité non trouvée' })
  }

  // Charger l'entité ET les contrats en parallèle
  const [entityResult] = await Promise.all([
    fetchEntity(entityId),
    fetchContracts(entityId)
  ])

  if (!entityResult.success) {
    throw createError({ statusCode: 404, message: 'Entité non trouvée' })
  }
})
</script>
