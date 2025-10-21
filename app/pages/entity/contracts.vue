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
            <!-- Contrats avec la FEEF -->
            <FeefContractsList role="company" />

            <!-- Contrats avec les Organismes Évaluateurs -->
            <OeContractsList role="company" />
          </div>
        </UPageBody>
      </UPage>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard-company'
})
</script>
