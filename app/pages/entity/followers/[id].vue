<script setup lang="ts">
definePageMeta({
  layout: "dashboard-entity",
})

const route = useRoute()
const { fetchEntity, currentEntity } = useEntities()

const followerId = computed(() => Number(route.params.id))

// État local pour l'entité suiveuse
const followerEntity = ref<any>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Charger l'entité suiveuse
const loadFollowerEntity = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await $fetch<{ data: any }>(`/api/entities/${followerId.value}`)
    followerEntity.value = response.data
  } catch (e: any) {
    error.value = e.data?.message || 'Erreur lors du chargement de l\'entité'
  } finally {
    loading.value = false
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

      <div v-else-if="error" class="p-6">
        <UAlert
          color="error"
          icon="i-lucide-alert-circle"
          title="Erreur"
          :description="error"
        />
        <UButton
          class="mt-4"
          variant="outline"
          icon="i-lucide-arrow-left"
          @click="navigateTo('/entity')"
        >
          Retour
        </UButton>
      </div>

      <EntityCase
        v-else-if="followerEntity"
        :follower-entity="followerEntity"
        :master-entity="currentEntity"
        :on-refresh="handleRefresh"
      />
    </template>
  </UDashboardPanel>
</template>
