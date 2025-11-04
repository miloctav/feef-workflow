<template>
  <div class="h-full overflow-y-auto">
    <UContainer class="py-8">
      <UPage>
        <UPageHeader
          title="Mes contrats"
          description="Consultez et gérez vos contrats de labellisation et devis"
        >
          <template #icon>
            <UIcon name="i-lucide-file-signature" class="w-8 h-8 text-primary" />
          </template>
        </UPageHeader>

        <UPageBody>
          <div class="space-y-6">
            <ContractsList />
          </div>
        </UPageBody>
      </UPage>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard-entity'
})

const { currentEntity, fetchEntity, fetchLoading, fetchError, submitCase, submitCaseLoading } = useEntities()
const { user } = useAuth()

const entityId = user.value?.currentEntityId

onMounted(async () => {
  if (!entityId) {
    throw createError({ statusCode: 404, message: 'Entité non trouvée' })
  }
  const result = await fetchEntity(entityId)

  if (!result.success) {
    throw createError({ statusCode: 404, message: 'Entité non trouvée' })
  }
})
</script>
