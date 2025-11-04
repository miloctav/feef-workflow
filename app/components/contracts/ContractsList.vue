<template>
  <div class="space-y-6">
    <!-- Loading state -->
    <div v-if="fetchLoading" class="flex items-center justify-center p-8">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-primary w-6 h-6" />
      <span class="ml-2">Chargement des contrats...</span>
    </div>

    <!-- Error state -->
    <div v-else-if="fetchError" class="flex items-center justify-center p-8">
      <UAlert
        color="error"
        variant="soft"
        title="Erreur"
        :description="fetchError"
      />
    </div>

    <!-- Contrats organisés en deux sections distinctes -->
    <div v-else class="space-y-8">
      <!-- SECTION CONTRATS FEEF -->
      <div v-if="showFeefSection" class="space-y-4">
        <div class="flex items-center justify-between pb-2">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Contrats FEEF</h2>
            <p class="text-sm text-gray-600 mt-1">
              {{ feefContracts.length }} contrat{{ feefContracts.length > 1 ? 's' : '' }}
            </p>
          </div>
          <AddContractModal
            v-if="canAddFeefContract && entityId"
            :entity-id="entityId"
            :force-oe-id="null"
            @created="handleContractCreated"
          />
        </div>

        <ContractAccordion
          title="Contrats FEEF"
          :contracts="feefContracts"
          accordion-value="feef"
          color="blue"
          icon="i-lucide-award"
          empty-message="Aucun contrat FEEF"
          @contract-click="openContractViewer"
        >
          <template #contract-actions="{ contract }">
            <EditContractModal
              :contract="contract"
              @updated="handleContractUpdated"
            />
          </template>
        </ContractAccordion>
      </div>

      <!-- SECTION CONTRATS OE -->
      <div v-if="showOeSection" class="space-y-4">
        <div class="flex items-center justify-between pb-2">
          <div>
            <div class="flex items-center gap-3">
              <h2 class="text-lg font-semibold text-gray-900">Contrats OE</h2>
              <UBadge
                v-if="currentEntity?.oe"
                :label="`OE actuel : ${currentEntity.oe.name}`"
                color="primary"
                variant="soft"
              />
              <UBadge
                v-else-if="currentEntity && !currentEntity.oe"
                label="Aucun OE assigné"
                color="neutral"
                variant="soft"
              />
              <UBadge
                v-else-if="!currentEntity && user?.role === Role.ENTITY"
                label="Chargement..."
                color="neutral"
                variant="soft"
              />
              <SelectOeModal
                v-if="user?.role === Role.ENTITY && currentEntity"
                :entity-id="currentEntity.id"
                :current-entity-oe="currentEntity.oe"
                @updated="handleOeUpdated"
              />
            </div>
            <p class="text-sm text-gray-600 mt-1">
              {{ oeContractsCount }} contrat{{ oeContractsCount > 1 ? 's' : '' }}
            </p>
          </div>
          <AddContractModal
            v-if="canAddOeContract && entityId"
            :entity-id="entityId"
            :force-oe-id="currentEntity?.oeId ?? user?.oeId"
            @created="handleContractCreated"
          />
        </div>

        <!-- Un accordéon par OE -->
        <ContractAccordion
          v-for="(contractsList, oeName) in oeContractsByOe"
          :key="oeName"
          :title="`Contrats ${oeName}`"
          :contracts="contractsList"
          :accordion-value="oeName"
          color="purple"
          icon="i-lucide-briefcase"
          empty-message="Aucun contrat dans cette catégorie"
          @contract-click="openContractViewer"
        >
          <template #contract-actions="{ contract }">
            <EditContractModal
              :contract="contract"
              @updated="handleContractUpdated"
            />
          </template>
        </ContractAccordion>

        <!-- État vide si aucun contrat OE -->
        <UCard v-if="Object.keys(oeContractsByOe).length === 0" class="overflow-hidden">
          <div class="text-center py-8 text-gray-500">
            <UIcon name="i-lucide-inbox" class="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Aucun contrat OE</p>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Document Viewer (adapté pour contracts) -->
    <DocumentViewer
      v-model:open="isViewerOpen"
      :contract="selectedContract"
    />
  </div>
</template>

<script setup lang="ts">
import type { ContractWithRelations } from '~~/app/types/contracts'

const { user } = useAuth()

// Récupérer l'entité courante depuis le composable
const { currentEntity } = useEntities()

// Pour ENTITY, utiliser user.currentEntityId directement (disponible immédiatement)
// Pour les autres rôles, utiliser currentEntity.id (nécessite que currentEntity soit chargé)
const entityId = computed(() => {
  if (user.value?.role === Role.ENTITY) {
    return user.value.currentEntityId
  }
  return currentEntity.value?.id
})

const {
  contracts,
  fetchLoading,
  fetchError,
  fetchContracts,
} = useContracts()

// Charger les contrats au montage
onMounted(async () => {
  if (entityId.value) {
    await fetchContracts(entityId.value)
  }
})

// Filtrer les contrats FEEF (oeId = null)
const feefContracts = computed(() => {
  return contracts.value.filter(c => c.oeId === null)
})

// Grouper les contrats OE par oeId
const oeContractsByOe = computed(() => {
  const groups: Record<string, any[]> = {}
  contracts.value.forEach(contract => {
    if (contract.oeId !== null) {
      const oeKey = contract.oe?.name || `OE ${contract.oeId}`
      if (!groups[oeKey]) groups[oeKey] = []
      groups[oeKey].push(contract)
    }
  })
  return groups
})

// Compter le nombre total de contrats OE
const oeContractsCount = computed(() => {
  return Object.values(oeContractsByOe.value).flat().length
})



// Affichage conditionnel selon le rôle
const showFeefSection = computed(() => {
  return user.value?.role === Role.FEEF || user.value?.role === Role.ENTITY
})

const showOeSection = computed(() => {
  return user.value?.role === Role.OE || user.value?.role === Role.ENTITY
})

// Permissions de création
const canAddFeefContract = computed(() => {
  if (!user.value) return false
  return user.value.role === Role.FEEF || user.value.role === Role.ENTITY
})

const canAddOeContract = computed(() => {
  if (!user.value) return false

  // OE peut toujours ajouter
  if (user.value.role === Role.OE) return true

  // ENTITY peut ajouter si elle a un oeId
  if (user.value.role === Role.ENTITY) {
    // Utiliser currentEntity.oeId si disponible, sinon user.oeId comme fallback
    const oeId = currentEntity.value?.oeId ?? user.value.oeId
    return oeId !== null && oeId !== undefined
  }

  return false
})





// Gestion du Viewer
const isViewerOpen = ref(false)
const selectedContract = ref<ContractWithRelations | null>(null)

function openContractViewer(contract: ContractWithRelations) {
  selectedContract.value = contract
  isViewerOpen.value = true
}



// Gérer la mise à jour de l'OE
async function handleOeUpdated() {
  // L'entité courante est automatiquement mise à jour dans assignOe
  // Il suffit de recharger les contrats car l'OE a changé
  if (entityId.value) {
    await fetchContracts(entityId.value)
  }
}

// Gestion des événements
async function handleContractCreated() {
  if (entityId.value) {
    await fetchContracts(entityId.value)
  }
}

async function handleContractUpdated() {
  if (entityId.value) {
    await fetchContracts(entityId.value)
  }
}
</script>
