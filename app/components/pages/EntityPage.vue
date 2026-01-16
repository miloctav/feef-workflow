<template>
  <div
    v-if="currentEntity"
    class="space-y-6"
  >
    <!-- En-tête avec le nom de l'entreprise -->
    <div class="bg-white">
      <div class="px-6 py-4">
        <div class="flex items-center gap-4">
          <UIcon
            name="i-lucide-building-2"
            class="w-10 h-10 text-primary"
          />
          <div>
            <h1 class="text-2xl font-bold text-gray-900">{{ currentEntity.name }}</h1>
          </div>
        </div>
      </div>
    </div>

    <!-- Contenu principal -->
    <div class="px-6">
      <!-- Cas Entité Suiveuse : Pas d'onglets, direct le dossier -->
      <div
        v-if="currentEntity.mode === EntityMode.FOLLOWER"
        class="py-6"
      >
        <EntityCase />
      </div>

      <!-- Cas Entité Maître : Onglets complets -->
      <UTabs
        v-else
        v-model="selectedTab"
        :items="tabs"
      >
        <!-- Tab Dossier -->
        <template #dossier>
          <div class="py-6">
            <EntityCase />
          </div>
        </template>

        <!-- Tab Espace documentaire -->
        <template
          v-if="currentEntity.mode === EntityMode.MASTER"
          #espacedoc
        >
          <div class="py-6">
            <DocumentaryReviewTab />
          </div>
        </template>

        <!-- Tab Comptes -->
        <template
          v-if="currentEntity.mode === EntityMode.MASTER"
          #comptes
        >
          <AccountsTable :entity-id="currentEntity.id" />
        </template>

        <!-- Tab Contrats -->
        <template
          v-if="currentEntity.mode === EntityMode.MASTER"
          #contrats
        >
          <div class="py-6">
            <ContractsList />
          </div>
        </template>

        <!-- Tab Audits -->
        <template
          v-if="currentEntity.mode === EntityMode.MASTER"
          #audits
        >
          <div class="py-6">
            <AuditsTable
              v-if="currentEntity"
              :has-filters="false"
              :entity-id="currentEntity.id"
            />
          </div>
        </template>
      </UTabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import DocumentaryReviewTab from '~/components/tabs/DocumentaryReviewTab.vue'
import AuditsTable from '../tables/AuditsTable.vue'

const { user } = useAuth()

// Récupérer l'entité courante depuis le composable
const { currentEntity } = useEntities()

// Composables pour précharger les données
const { fetchDocumentaryReviews } = useDocumentaryReviews()
const { fetchContracts } = useContracts()
const { setFilters: setAuditFilters, fetchAudits } = useAudits()

const selectedTab = ref('dossier')

const tabs = computed(() => {
  const baseTabs = [
    {
      slot: 'dossier',
      value: 'dossier',
      label: 'Dossier',
      icon: 'i-lucide-folder',
    },
  ]

  if (currentEntity.value?.mode === EntityMode.MASTER) {
    baseTabs.push({
      slot: 'espacedoc',
      value: 'espacedoc',
      label: 'Espace documentaire',
      icon: 'i-lucide-files',
    })
  }

  // Ajouter l'onglet Comptes uniquement pour le rôle FEEF
  if (user.value?.role === Role.FEEF && currentEntity.value?.mode === EntityMode.MASTER) {
    baseTabs.push({
      slot: 'comptes',
      value: 'comptes',
      label: 'Comptes',
      icon: 'i-lucide-users',
    })
  }

  if (currentEntity.value?.mode === EntityMode.MASTER) {
    baseTabs.push(
      {
        slot: 'contrats',
        value: 'contrats',
        label: 'Contrats',
        icon: 'i-lucide-file-text',
      },
      {
        slot: 'audits',
        value: 'audits',
        label: 'Audits',
        icon: 'i-lucide-clipboard-list',
      }
    )
  }

  return baseTabs
})

// Précharger toutes les données des tabs au montage
onMounted(async () => {
  if (!currentEntity.value) return

  // Charger toutes les données en parallèle pour éviter les requêtes multiples lors des changements de tabs
  const promises: Promise<any>[] = []

  // Charger les documents de la revue documentaire (pour le tab "Espace documentaire")
  if (currentEntity.value.mode === EntityMode.MASTER) {
    promises.push(fetchDocumentaryReviews(currentEntity.value.id))
  }

  // Charger les contrats (pour le tab "Contrats")
  if (currentEntity.value.mode === EntityMode.MASTER) {
    promises.push(fetchContracts(currentEntity.value.id))
  }

  // Configurer les filtres pour les audits (pour le tab "Audits")
  // Note: setAuditFilters déclenche automatiquement un refresh via le watch dans usePaginatedFetch
  if (currentEntity.value.mode === EntityMode.MASTER) {
    setAuditFilters({ entityId: currentEntity.value.id })
  }

  // Attendre que toutes les données soient chargées
  await Promise.all(promises)
})
</script>
