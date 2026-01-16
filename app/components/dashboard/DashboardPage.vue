<script setup lang="ts">
import type { SelectItem } from '@nuxt/ui'

// Use dashboard stats composable
const { dashboardCategories, categoryTotals, loading, error, fetchStats } = useDashboardStats()

// Use dashboard trends composable
const { saveSnapshot } = useDashboardTrends()

// Use dashboard overview composable for top stats and charts
const {
  data,
  loading: overviewLoading,
  error: overviewError,
  fetchOverview,
  formattedEntityCount,
  formattedAvgAuditGap,
  formattedAvgProcessDuration,
  scheduledAuditsChartData,
  labeledEntitiesChartData,
} = useDashboardOverview()

// Fetch stats and actions on mount
onMounted(async () => {
  await fetchStats()
  await fetchActions()
  await fetchOverview()
})

// Sauvegarder le snapshot quand l'utilisateur quitte la page
onBeforeUnmount(() => {
  if (!error.value && dashboardCategories.value.length > 0) {
    saveSnapshot(dashboardCategories.value)
  }
})

const dossiersFinalisesParAn = [
  { annee: 2022, nombre: 18 },
  { annee: 2023, nombre: 27 },
  { annee: 2024, nombre: 31 },
  { annee: 2025, nombre: 8 },
]

const selectedAnnee = ref(
  dossiersFinalisesParAn.length > 0
    ? dossiersFinalisesParAn[dossiersFinalisesParAn.length - 1].annee
    : 0
)

// Progress bar data from composable
const dossierStats = computed(
  () =>
    data.value?.progressBarStats || {
      depotDossier: 0,
      validationFeef: 0,
      planification: 0,
      audit: 0,
      finalisation: 0,
    }
)

const totalDossiers = computed(() => {
  const stats = dossierStats.value
  return (
    stats.depotDossier +
    stats.validationFeef +
    stats.planification +
    stats.audit +
    stats.finalisation
  )
})

// Calcul des pourcentages pour chaque étape
const depotPct = computed(() =>
  totalDossiers.value > 0
    ? Math.round((dossierStats.value.depotDossier / totalDossiers.value) * 100)
    : 0
)
const validationPct = computed(() =>
  totalDossiers.value > 0
    ? Math.round((dossierStats.value.validationFeef / totalDossiers.value) * 100)
    : 0
)
const planificationPct = computed(() =>
  totalDossiers.value > 0
    ? Math.round((dossierStats.value.planification / totalDossiers.value) * 100)
    : 0
)
const auditPct = computed(() =>
  totalDossiers.value > 0 ? Math.round((dossierStats.value.audit / totalDossiers.value) * 100) : 0
)
const finalisationPct = computed(
  () => 100 - depotPct.value - validationPct.value - planificationPct.value - auditPct.value
)

// Totaux par catégorie principale
const totalAttente = computed(
  () => dossierStats.value.depotDossier + dossierStats.value.validationFeef
)
const totalEnCours = computed(
  () =>
    dossierStats.value.planification + dossierStats.value.audit + dossierStats.value.finalisation
)

const oeOptions = ref<SelectItem[]>([
  { label: 'Tous', value: 'all' },
  { label: 'SGS', value: 'sgs' },
  { label: 'Ecocert', value: 'ecocert' },
])
const selectedOE = ref(oeOptions.value[0].value)
// Note: dashboardCategories and categoryTotals are now provided by useDashboardStats() composable

// Use dashboard actions composable
const {
  actionsByRole,
  loading: actionsLoading,
  error: actionsError,
  fetchActions,
} = useDashboardActions()

// Gestion des onglets
const tabs = [
  { value: 'etapes', label: 'Étapes des dossiers', slot: 'etapes' },
  { value: 'actions', label: 'Actions', slot: 'actions' },
]
</script>

<template>
  <div
    v-if="role === 'auditeur'"
    class="p-4 space-y-4"
  >
    <!-- Vue spécifique auditeur -->
    <AuditsTable />
  </div>
  <div
    v-else
    class="p-4 space-y-4"
  >
    <!-- Titre dashboard + select OE -->
    <div class="flex flex-row items-center justify-center w-full mb-1">
      <span class="font-bold text-3xl">Tableau de bord</span>
    </div>
    <div
      v-if="role === 'feef'"
      class="flex flex-row items-center gap-2 min-w-[220px] mb-1"
    >
      <label class="font-semibold text-gray-700 whitespace-nowrap">Organisme évaluateur</label>
      <USelect
        v-model="selectedOE"
        :items="oeOptions"
        value-key="value"
        class="w-32"
      />
    </div>
    <USeparator class="mb-3" />
    <!-- Bloc infos entreprises, import et export -->
    <div class="flex flex-row gap-4 px-4 mb-4">
      <div class="bg-white rounded-xl shadow p-4 flex-1 flex flex-col items-center justify-center">
        <span class="text-gray-500 text-sm mb-1">Nombre d'entités</span>
        <USkeleton
          v-if="overviewLoading"
          class="h-8 w-16"
        />
        <span
          v-else
          class="text-2xl font-bold text-primary-600"
          >{{ formattedEntityCount }}</span
        >
      </div>
      <div class="bg-white rounded-xl shadow p-4 flex-1 flex flex-col items-center justify-center">
        <span class="text-gray-500 text-sm mb-1 text-center">Écart moyen audit planifié/réel</span>
        <USkeleton
          v-if="overviewLoading"
          class="h-6 w-24"
        />
        <span
          v-else
          class="text-base font-semibold text-gray-800"
          >{{ formattedAvgAuditGap }}</span
        >
      </div>
      <div class="bg-white rounded-xl shadow p-4 flex-1 flex flex-col items-center justify-center">
        <span class="text-gray-500 text-sm mb-1 text-center">Durée moyenne du processus</span>
        <USkeleton
          v-if="overviewLoading"
          class="h-6 w-24"
        />
        <span
          v-else
          class="text-base font-semibold text-gray-800"
          >{{ formattedAvgProcessDuration }}</span
        >
      </div>
    </div>
    <!-- Système d'onglets pour Étapes des dossiers et Actions -->
    <div class="px-4">
      <UTabs
        :items="tabs"
        :default-value="'etapes'"
      >
        <!-- Onglet Étapes des dossiers -->
        <template #etapes>
          <div class="pt-4">
            <!-- Loading state -->
            <div
              v-if="loading"
              class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
            >
              <div
                v-for="i in 3"
                :key="i"
                class="flex flex-col gap-3"
              >
                <USkeleton class="h-8 w-48 mb-2" />
                <USkeleton class="h-24" />
                <USkeleton class="h-24" />
              </div>
            </div>

            <!-- Error state -->
            <div
              v-else-if="error"
              class="flex justify-center"
            >
              <UAlert
                color="error"
                :title="error"
              />
            </div>

            <!-- Data state -->
            <div
              v-else
              class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 justify-start"
            >
              <div
                v-for="(cat, i) in dashboardCategories"
                :key="cat.label"
                class="flex flex-col"
              >
                <h2 class="text-lg font-bold text-gray-800 mb-2 text-center">
                  <span class="text-primary-600">{{ categoryTotals[i] }}</span>
                  &nbsp;{{ cat.label }}
                </h2>
                <div class="flex flex-col gap-3">
                  <DashboardCard
                    v-for="(card, j) in cat.cards"
                    :key="j"
                    v-bind="card"
                  />
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Onglet Actions -->
        <template #actions>
          <div class="pt-4">
            <!-- Loading state -->
            <div
              v-if="actionsLoading"
              class="grid grid-cols-1 lg:grid-cols-3 gap-4"
            >
              <div
                v-for="i in 3"
                :key="i"
                class="flex flex-col gap-3"
              >
                <USkeleton class="h-8 w-48 mb-2" />
                <USkeleton
                  v-for="j in 5"
                  :key="j"
                  class="h-24"
                />
              </div>
            </div>

            <!-- Error state -->
            <div
              v-else-if="actionsError"
              class="flex justify-center"
            >
              <UAlert
                color="error"
                icon="i-lucide-alert-triangle"
                :title="actionsError"
              />
            </div>

            <!-- Data state -->
            <div
              v-else
              class="grid grid-cols-1 lg:grid-cols-3 gap-4"
            >
              <!-- Colonne Actions FEEF -->
              <div class="flex flex-col">
                <h2 class="text-lg font-bold text-gray-800 mb-3 text-center">
                  <span class="text-primary-600">{{ actionsByRole.feef.length }}</span>
                  &nbsp;Actions FEEF
                </h2>
                <div class="flex flex-col gap-3">
                  <ActionCard
                    v-for="action in actionsByRole.feef"
                    :key="action.id"
                    :action="action"
                    :hide-roles="true"
                    :show-context="true"
                    :hide-description="true"
                  />
                  <div
                    v-if="actionsByRole.feef.length === 0"
                    class="text-center text-gray-500 py-8"
                  >
                    Aucune action FEEF
                  </div>
                </div>
              </div>

              <!-- Colonne Actions OE -->
              <div class="flex flex-col">
                <h2 class="text-lg font-bold text-gray-800 mb-3 text-center">
                  <span class="text-primary-600">{{ actionsByRole.oe.length }}</span>
                  &nbsp;Actions OE
                </h2>
                <div class="flex flex-col gap-3">
                  <ActionCard
                    v-for="action in actionsByRole.oe"
                    :key="action.id"
                    :action="action"
                    :hide-roles="true"
                    :show-context="true"
                    :hide-description="true"
                  />
                  <div
                    v-if="actionsByRole.oe.length === 0"
                    class="text-center text-gray-500 py-8"
                  >
                    Aucune action OE
                  </div>
                </div>
              </div>

              <!-- Colonne Actions Entités -->
              <div class="flex flex-col">
                <h2 class="text-lg font-bold text-gray-800 mb-3 text-center">
                  <span class="text-primary-600">{{ actionsByRole.entity.length }}</span>
                  &nbsp;Actions Entités
                </h2>
                <div class="flex flex-col gap-3">
                  <ActionCard
                    v-for="action in actionsByRole.entity"
                    :key="action.id"
                    :action="action"
                    :hide-roles="true"
                    :show-context="true"
                    :hide-description="true"
                  />
                  <div
                    v-if="actionsByRole.entity.length === 0"
                    class="text-center text-gray-500 py-8"
                  >
                    Aucune action Entité
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </UTabs>
    </div>
    <!-- Barre de progression détaillée des dossiers -->
    <div class="w-full px-4 mt-6">
      <h2 class="text-lg font-bold mb-4 text-center">
        État des dossiers ({{ totalDossiers }} dossiers)
      </h2>

      <!-- Totaux par catégorie -->
      <div class="flex justify-center gap-8 mb-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-orange-600">{{ totalAttente }}</div>
          <div class="text-sm text-gray-600">En attente</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-600">{{ totalEnCours }}</div>
          <div class="text-sm text-gray-600">En cours</div>
        </div>
      </div>

      <!-- Barre de progression détaillée -->
      <div
        class="relative w-full h-8 bg-gray-100 rounded-full shadow-lg overflow-hidden flex text-xs font-medium"
      >
        <!-- En attente - Dépôt dossier -->
        <div
          class="h-full flex items-center justify-center text-orange-900 transition-all duration-500 border-r border-white"
          :style="`width: ${depotPct}%; background: #fed7aa`"
        >
          <span
            v-if="depotPct > 8"
            class="w-full text-center px-1"
          >
            Dépôt {{ dossierStats.depotDossier }}
          </span>
        </div>

        <!-- En attente - Validation FEEF -->
        <div
          class="h-full flex items-center justify-center text-orange-900 transition-all duration-500 border-r-2 border-gray-300"
          :style="`width: ${validationPct}%; background: #fdba74`"
        >
          <span
            v-if="validationPct > 8"
            class="w-full text-center px-1"
          >
            Validation {{ dossierStats.validationFeef }}
          </span>
        </div>

        <!-- En cours - Planification -->
        <div
          class="h-full flex items-center justify-center text-blue-900 transition-all duration-500 border-r border-white"
          :style="`width: ${planificationPct}%; background: #bfdbfe`"
        >
          <span
            v-if="planificationPct > 8"
            class="w-full text-center px-1"
          >
            Planif. {{ dossierStats.planification }}
          </span>
        </div>

        <!-- En cours - Audit -->
        <div
          class="h-full flex items-center justify-center text-blue-900 transition-all duration-500 border-r border-white"
          :style="`width: ${auditPct}%; background: #93c5fd`"
        >
          <span
            v-if="auditPct > 8"
            class="w-full text-center px-1"
          >
            Audit {{ dossierStats.audit }}
          </span>
        </div>

        <!-- En cours - Finalisation -->
        <div
          class="h-full flex items-center justify-center text-blue-900 transition-all duration-500"
          :style="`width: ${finalisationPct}%; background: #60a5fa`"
        >
          <span
            v-if="finalisationPct > 8"
            class="w-full text-center px-1"
          >
            Final. {{ dossierStats.finalisation }}
          </span>
        </div>
      </div>
    </div>
    <USeparator class="my-4" />
    <!-- Bloc Statistiques -->
    <div>
      <div class="flex flex-row items-center gap-4 w-full">
        <div class="flex flex-col items-center w-1/2">
          <h2 class="text-lg font-bold mb-1 text-center">Audits prévus par mois</h2>
          <LineChartAudits />
        </div>
        <div class="flex flex-col items-center w-1/2">
          <h2 class="text-lg font-bold mb-1 text-center">Labellisés par année</h2>
          <BarChartLabellises />
        </div>
      </div>
    </div>
  </div>
</template>
