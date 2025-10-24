<script setup lang="ts">
interface Props {
  collapsed?: boolean
}

defineProps<Props>()

const { user, switchEntity: switchEntityAuth } = useAuth()
const { fetchEntitiesForSelect } = useEntities()

// Liste des entités chargées
const entitiesList = ref<Array<{ label: string; value: number }>>([])
const isLoading = ref(true)

onMounted(async () => {
  const fetched = await fetchEntitiesForSelect({ includeAll: false })
  // remove entries with null values so entitiesList matches the expected { label: string; value: number }[]
  entitiesList.value = fetched.filter((e: { label: string; value: number | null }) => e.value !== null) as { label: string; value: number }[]
  isLoading.value = false
})

// Entité courante
const currentEntity = computed(() => {
  if (!user.value?.currentEntityId) return null
  return entitiesList.value.find(e => e.value === user.value?.currentEntityId)
})

// Items pour le dropdown (exclure l'entité courante)
const items = computed(() => {
  if (entitiesList.value.length === 0) return []

  const otherEntities = entitiesList.value.filter(e => e.value !== user.value?.currentEntityId)

  return [
    otherEntities.map((entity: { label: any; value: number; }) => ({
      label: entity.label,
      onSelect: () => switchEntity(entity.value)
    }))
  ]
})

// Entité sélectionnée pour le bouton
// Entité sélectionnée pour le bouton
const selectedEntity = computed(() => {
  if (!currentEntity.value) return null

  return {
    label: currentEntity.value.label
  }
})
// Fonction de switch d'entité
const isSwitching = ref(false)
async function switchEntity(entityId: number) {
  if (entityId === user.value?.currentEntityId) return

  isSwitching.value = true
  await switchEntityAuth(entityId)
  isSwitching.value = false
}
</script>

<template>
  <UDropdownMenu
    v-if="selectedEntity && items.length > 0"
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-40' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      v-bind="{
        ...selectedEntity,
        label: collapsed ? undefined : selectedEntity.label,
        trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down'
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      :loading="isSwitching || isLoading"
      :disabled="isSwitching"
      class="data-[state=open]:bg-elevated bg-gray-100 border border-gray-300"
      :class="[!collapsed && 'py-2']"
      :ui="{
        trailingIcon: 'text-dimmed'
      }"
    />
  </UDropdownMenu>
</template>
