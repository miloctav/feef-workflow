<script setup lang="ts">
const {
  currentEntity,
  assignAccountManager,
  assignAccountManagerLoading,
} = useEntities()

const { fetchAccountManagers } = useAccounts()

const { user } = useAuth()

// État du modal
const isOpen = ref(false)
const selectedAccountManagerId = ref<{ label: string; value: number } | undefined>(undefined)
const accountManagers = ref<Array<{ label: string; value: number }>>([])

// Charger les chargés d'affaire quand le modal s'ouvre
watch(isOpen, async (open) => {
  if (open && currentEntity.value?.oeId) {
    accountManagers.value = await fetchAccountManagers(currentEntity.value.oeId)
    // Pré-sélectionner le chargé d'affaire actuel si présent
    if (currentEntity.value?.accountManagerId) {
      selectedAccountManagerId.value = accountManagers.value.find(am => am.value === currentEntity.value!.accountManagerId) || undefined
    } else {
      selectedAccountManagerId.value = undefined
    }
  }
})

const handleAssign = async () => {
  if (!currentEntity.value || !selectedAccountManagerId.value) return

  const result = await assignAccountManager(currentEntity.value.id, selectedAccountManagerId.value.value)

  if (result.success) {
    isOpen.value = false
  }
}

// Visibilité du bouton
const isVisible = computed(() => {
  return user.value?.role === Role.OE && user.value.oeRole === OERole.ADMIN
})

// Label dynamique du bouton
const buttonLabel = computed(() => {
  return currentEntity.value?.accountManager
    ? 'Modifier le chargé d\'affaire'
    : 'Affecter un chargé d\'affaire'
})
</script>

<template>
  <UModal
    v-if="isVisible"
    v-model:open="isOpen"
    :title="buttonLabel"
    description="Sélectionnez le chargé d'affaire qui sera responsable de cette entité."
    :ui="{ footer: 'justify-end' }"
  >
    <UButton
      color="primary"
      variant="solid"
      size="md"
      icon="i-lucide-user-plus"
    >
      {{ buttonLabel }}
    </UButton>

    <template #body>
      <USelectMenu
        v-model="selectedAccountManagerId"
        :items="accountManagers"
        placeholder="Sélectionner un chargé d'affaire"
        searchable
        searchable-placeholder="Rechercher un chargé d'affaire..."
      />
    </template>

    <template #footer="{ close }">
      <UButton
        color="neutral"
        variant="outline"
        @click="close"
      >
        Annuler
      </UButton>
      <UButton
        color="primary"
        :disabled="!selectedAccountManagerId?.value"
        :loading="assignAccountManagerLoading"
        @click="handleAssign"
      >
        Confirmer
      </UButton>
    </template>
  </UModal>
</template>