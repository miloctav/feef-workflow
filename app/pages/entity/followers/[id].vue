<script setup lang="ts">
definePageMeta({
  layout: "dashboard-entity",
})

const route = useRoute()
const { fetchFollowerEntity, currentFollowerEntity, currentEntity } = useEntities()

const followerId = computed(() => Number(route.params.id))

// Charger l'entité suiveuse
const loading = ref(false)

const loadFollowerEntity = async () => {
  loading.value = true
  const result = await fetchFollowerEntity(followerId.value)
  loading.value = false

  if (!result.success) {
    throw createError({
      statusCode: 404,
      message: result.error || 'Entité suiveuse non trouvée'
    })
  }
}

// Rafraîchir l'entité suiveuse
const handleRefresh = async () => {
  await loadFollowerEntity()
}

onMounted(() => {
  loadFollowerEntity()
})

// Recharger si l'ID change
watch(followerId, () => {
  loadFollowerEntity()
})
</script>

<template>
  <UDashboardPanel id="follower-entity">
    <template #header>
      <NavBar />
    </template>
    <template #body>
      <div v-if="loading" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
      </div>

      <EntityCase
        v-else-if="currentFollowerEntity"
        :follower-entity="currentFollowerEntity"
        :master-entity="currentEntity"
        :on-refresh="handleRefresh"
      />
    </template>
  </UDashboardPanel>
</template>
