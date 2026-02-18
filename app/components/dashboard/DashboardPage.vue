<script setup lang="ts">
import type { SelectItem } from '@nuxt/ui'
import type { DashboardRole } from '~/composables/useDashboardStats'

const props = withDefaults(defineProps<{ role?: DashboardRole }>(), {
  role: 'feef',
})

// Use dashboard stats composable
const { dashboardCategories, categoryTotals, loading, error, fetchStats } = useDashboardStats(props.role)

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
  const oeId = currentOeId.value
  await fetchStats(oeId)
  await fetchActions(oeId)
  await fetchOverview(oeId)
})

// Sauvegarder le snapshot quand l'utilisateur quitte la page
onBeforeUnmount(() => {
  if (!error.value && dashboardCategories.value.length > 0) {
    saveSnapshot(dashboardCategories.value)
  }
})

// Configuration des 5 phases métier
const PHASE_CONFIG = [
  {
    key: 'candidature' as const,
    label: 'Candidature',
    description: 'Dépôt du dossier, signature du contrat FEEF, approbation par FEEF',
    bgColor: '#fde68a',
    textColor: 'text-yellow-900',
    detailLabels: {
      CASE_SUBMISSION_IN_PROGRESS: 'Dépôt en cours',
      PENDING_FEEF_CONTRACT_SIGNATURE: 'Signature contrat FEEF',
      PENDING_CASE_APPROVAL: 'Approbation dossier',
    } as Record<string, string>,
  },
  {
    key: 'engagement' as const,
    label: 'Engagement',
    description: "Sélection et acceptation de l'OE (Organisme Évaluateur) par l'entité",
    bgColor: '#fdba74',
    textColor: 'text-orange-900',
    detailLabels: {
      PENDING_OE_CHOICE: "Choix de l'OE",
      PENDING_OE_ACCEPTANCE: 'Acceptation OE',
    } as Record<string, string>,
  },
  {
    key: 'audit' as const,
    label: 'Audit',
    description: 'Planification, réalisation de l\'audit sur site et remise du rapport',
    bgColor: '#7dd3fc',
    textColor: 'text-sky-900',
    detailLabels: {
      PLANNING: 'Planification',
      SCHEDULED: 'Planifié',
      PENDING_REPORT: 'Rapport attendu',
      PENDING_COMPLEMENTARY_AUDIT: 'Audit complémentaire',
    } as Record<string, string>,
  },
  {
    key: 'decision' as const,
    label: 'Décision',
    description: 'Avis de l\'OE, plan correctif éventuel, décision finale FEEF',
    bgColor: '#a5b4fc',
    textColor: 'text-indigo-900',
    detailLabels: {
      PENDING_OE_OPINION: 'Avis OE',
      PENDING_CORRECTIVE_PLAN: 'Plan correctif',
      PENDING_CORRECTIVE_PLAN_VALIDATION: 'Validation plan',
      PENDING_FEEF_DECISION: 'Décision FEEF',
    } as Record<string, string>,
  },
  {
    key: 'labellise' as const,
    label: 'Labellisé',
    description: 'Dossiers ayant obtenu le label FEEF',
    bgColor: '#34d399',
    textColor: 'text-emerald-900',
    detailLabels: {
      COMPLETED: 'Terminés',
    } as Record<string, string>,
  },
]

const progressBarStats = computed(() => data.value?.progressBarStats)

const totalDossiers = computed(() => {
  if (!progressBarStats.value) return 0
  return PHASE_CONFIG.reduce((sum, phase) => sum + (progressBarStats.value![phase.key]?.total || 0), 0)
})

const phases = computed(() => {
  let runningPct = 0
  return PHASE_CONFIG.map((p, i) => {
    const count = progressBarStats.value?.[p.key]?.total || 0
    const detail = progressBarStats.value?.[p.key]?.detail || {}
    let pct: number
    if (i === PHASE_CONFIG.length - 1) {
      pct = totalDossiers.value > 0 ? 100 - runningPct : 0
    }
    else {
      pct = totalDossiers.value > 0 ? Math.round((count / totalDossiers.value) * 100) : 0
      runningPct += pct
    }
    return { ...p, count, pct, detail }
  })
})

const oeOptions = ref<SelectItem[]>([
  { label: 'Tous', value: 'all' },
])
const selectedOE = ref('all')

// Fetch OE list dynamically
onBeforeMount(async () => {
  try {
    const response = await $fetch('/api/oes', { query: { limit: -1 } })
    const oes = response.data || []
    oeOptions.value = [
      { label: 'Tous', value: 'all' },
      ...oes.map((oe: any) => ({ label: oe.name, value: String(oe.id) })),
    ]
  }
  catch (err) {
    console.error('Error fetching OEs:', err)
  }
})

// Computed oeId for API calls
const currentOeId = computed(() => selectedOE.value === 'all' ? undefined : Number(selectedOE.value))

// Watch OE selection changes and refresh all dashboard data
watch(selectedOE, async () => {
  const oeId = currentOeId.value
  await Promise.all([
    fetchStats(oeId),
    fetchActions(oeId),
    fetchOverview(oeId),
  ])
})

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

      <!-- Légende des 5 phases -->
      <div class="flex justify-center gap-6 mb-4 flex-wrap">
        <UTooltip
          v-for="phase in phases"
          :key="phase.key"
          :text="phase.description"
        >
          <div class="flex items-center gap-1.5 cursor-help">
            <span
              class="inline-block w-3 h-3 rounded-full shrink-0"
              :style="`background: ${phase.bgColor}`"
            />
            <span class="text-sm text-gray-600">{{ phase.label }}</span>
            <span class="text-sm font-bold text-gray-900">{{ phase.count }}</span>
          </div>
        </UTooltip>
      </div>

      <!-- Barre de progression détaillée -->
      <div
        class="relative w-full h-8 bg-gray-100 rounded-full shadow-lg overflow-hidden flex text-xs font-medium"
      >
        <UTooltip
          v-for="(phase, i) in phases"
          :key="phase.key"
          class="h-full transition-all duration-500"
          :style="`width: ${phase.pct}%`"
        >
          <div
            class="h-full w-full flex items-center justify-center"
            :class="[phase.textColor, i < phases.length - 1 ? 'border-r border-white' : '']"
            :style="`background: ${phase.bgColor}`"
          >
            <span
              v-if="phase.pct > 8"
              class="w-full text-center px-1 truncate"
            >
              {{ phase.label }} {{ phase.count }}
            </span>
          </div>
          <template #content>
            <div class="text-xs p-1 min-w-32">
              <div class="font-semibold mb-1">{{ phase.label }}</div>
              <div
                v-for="(count, key) in phase.detail"
                :key="key"
                class="flex justify-between gap-4"
              >
                <span>{{ phase.detailLabels[String(key)] || key }}</span>
                <span class="font-bold">{{ count }}</span>
              </div>
            </div>
          </template>
        </UTooltip>
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
