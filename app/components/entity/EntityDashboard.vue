<script setup lang="ts">
const { currentEntity } = useEntities()
const latestAudit = computed(() => currentEntity.value?.audits?.[0] || null)
</script>

<template>
  <UPage>
    <UPageBody>
      <!-- État de chargement -->
      <div v-if="!currentEntity" class="flex items-center justify-center p-12">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
        <span class="ml-3 text-gray-600">Chargement du dashboard...</span>
      </div>

      <!-- Dashboard -->
      <div v-else class="space-y-6">
        <!-- Première rangée : Anniversaire + OE Info -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnniversaryCard />
          <OeInfoCard :entity="currentEntity" :latest-audit="latestAudit" />
        </div>

        <!-- Timeline de labellisation -->
        <AuditTimelineCard :audit="latestAudit" />
      </div>
    </UPageBody>
  </UPage>
</template>
