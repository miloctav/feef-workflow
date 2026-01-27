<script setup lang="ts">
import EntityCase from '~/components/entity/EntityCase.vue'

definePageMeta({
  layout: "dashboard-entity",
})

const { currentEntity } = useEntities()
// Le layout gère fetchEntity() dans son onMounted
</script>

<template>
  <UDashboardPanel id="case">
    <template #header>
      <NavBar />
    </template>
    <template #body>
      <UPage>
        <!-- État de chargement -->
        <div v-if="!currentEntity" class="flex items-center justify-center p-12">
          <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
          <span class="ml-3 text-gray-600">Chargement du dossier...</span>
        </div>

        <!-- EntityCase une fois les données chargées -->
        <UPageBody v-else>
          <EntityCase />
        </UPageBody>
      </UPage>
    </template>
  </UDashboardPanel>
</template>
