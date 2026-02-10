/**
 * Composable for dashboard statistics
 */

import type { AuditTypeType } from '~~/shared/types/enums'

interface AuditStatusStat {
  status: string
  count: number
}

interface AuditTypeByStatus {
  status: string
  type: AuditTypeType
  count: number
}

interface ContractTypeCount {
  type: string
  count: number
}

interface CaseSubmissionStats {
  count: number
  types: ContractTypeCount[]
  overdueCount: number
  upcomingCount: number
}

interface ActionByAuditStatus {
  auditStatus: string | null
  overdueCount: number
  upcomingCount: number
}

interface AuditStats {
  byStatus: AuditStatusStat[]
  typesByStatus: AuditTypeByStatus[]
  totalNonCompleted: number
  contractsPendingSignature: ContractTypeCount[]
  entitiesCaseSubmission: CaseSubmissionStats
}

interface ActionStats {
  byStatus: Array<{ status: string, count: number }>
  overdue: number
  upcoming: number
  byAuditStatus: ActionByAuditStatus[]
}

interface DashboardCard {
  shortText: string
  value: number
  alertesRouges: number
  alertesOranges: number
  color: string
  bgColor: string
  to?: string
  auditTypes?: {
    initial: number
    renewal: number
    monitoring: number
  }
  trend?: 'up' | 'down'
  lastValue?: number
  lastDate?: string
}

interface DashboardCategory {
  label: string
  cards: DashboardCard[]
}

// Card mappings (based on plan)
const CARD_MAPPINGS: Array<{
  category: string
  cards: Array<{
    shortText: string
    auditStatus: string
    color: string
    bgColor: string
    to: string
  }>
}> = [
    {
      category: 'Demande de dossiers',
      cards: [
        {
          shortText: 'Dépôt en cours',
          auditStatus: 'CASE_SUBMISSION_IN_PROGRESS',
          color: 'border-blue-500',
          bgColor: 'bg-blue-50',
          to: '/feef/entities?dashboardFilter=CASE_SUBMISSION_IN_PROGRESS',
        },
        {
          shortText: 'En attente de signature contrat FEEF',
          auditStatus: 'PENDING_FEEF_CONTRACT_SIGNATURE',
          color: 'border-yellow-500',
          bgColor: 'bg-yellow-50',
          to: '/feef/entities?dashboardFilter=PENDING_FEEF_CONTRACT_SIGNATURE',
        },
        {
          shortText: 'En attente validation FEEF',
          auditStatus: 'PENDING_CASE_APPROVAL',
          color: 'border-green-500',
          bgColor: 'bg-green-50',
          to: '/feef/audits?status=PENDING_CASE_APPROVAL',
        },
      ],
    },
    {
      category: 'Audit',
      cards: [
        {
          shortText: 'En attente d\'acceptation par l\'OE',
          auditStatus: 'PENDING_OE_ACCEPTANCE',
          color: 'border-orange-500',
          bgColor: 'bg-orange-50',
          to: '/feef/audits?status=PENDING_OE_ACCEPTANCE',
        },
        {
          shortText: 'En cours de planification',
          auditStatus: 'PLANNING',
          color: 'border-green-500',
          bgColor: 'bg-green-50',
          to: '/feef/audits?status=PLANNING',
        },
        {
          shortText: 'Audit planifié',
          auditStatus: 'SCHEDULED',
          color: 'border-indigo-500',
          bgColor: 'bg-indigo-50',
          to: '/feef/audits?status=SCHEDULED',
        },
        {
          shortText: 'Rapport attendu audit',
          auditStatus: 'PENDING_REPORT',
          color: 'border-blue-500',
          bgColor: 'bg-blue-50',
          to: '/feef/audits?status=PENDING_REPORT',
        },
      ],
    },
    {
      category: 'Decision',
      cards: [
        {
          shortText: 'En attente de l\'avis de l\'OE',
          auditStatus: 'PENDING_OE_OPINION',
          color: 'border-purple-500',
          bgColor: 'bg-purple-50',
          to: '/feef/audits?status=PENDING_OE_OPINION',
        },
        {
          shortText: 'Plan d\'action en attente',
          auditStatus: 'PENDING_CORRECTIVE_PLAN',
          color: 'border-orange-500',
          bgColor: 'bg-orange-50',
          to: '/feef/audits?status=PENDING_CORRECTIVE_PLAN',
        },
        {
          shortText: 'En attente attestation',
          auditStatus: 'PENDING_FEEF_DECISION',
          color: 'border-green-500',
          bgColor: 'bg-green-50',
          to: '/feef/audits?status=PENDING_FEEF_DECISION',
        },
      ],
    },
  ]

/**
 * Génère une clé unique pour identifier une carte
 */
function generateCardKey(categoryLabel: string, card: DashboardCard): string {
  return `${categoryLabel}_${card.shortText}`
}

function buildDashboardCategories(
  auditStats: AuditStats,
  actionStats: ActionStats,
): DashboardCategory[] {
  // Create a map of audit status -> count
  const auditCountByStatus = new Map<string, number>()
  auditStats.byStatus.forEach((stat) => {
    auditCountByStatus.set(stat.status, stat.count)
  })

  // Create a map of audit status -> type counts
  const auditTypesByStatus = new Map<string, { initial: number, renewal: number, monitoring: number }>()
  auditStats.typesByStatus.forEach((stat) => {
    if (!auditTypesByStatus.has(stat.status)) {
      auditTypesByStatus.set(stat.status, { initial: 0, renewal: 0, monitoring: 0 })
    }
    const types = auditTypesByStatus.get(stat.status)!
    if (stat.type === 'INITIAL') types.initial = stat.count
    else if (stat.type === 'RENEWAL') types.renewal = stat.count
    else if (stat.type === 'MONITORING') types.monitoring = stat.count
  })

  // Create type counts for contracts pending signature
  const contractTypes = { initial: 0, renewal: 0, monitoring: 0 }
  auditStats.contractsPendingSignature.forEach((stat) => {
    if (stat.type === 'INITIAL') contractTypes.initial = stat.count
    else if (stat.type === 'RENEWAL') contractTypes.renewal = stat.count
    else if (stat.type === 'MONITORING') contractTypes.monitoring = stat.count
  })
  const contractCount = auditStats.contractsPendingSignature.reduce((sum, stat) => sum + stat.count, 0)

  // Create a map of audit status -> action alerts
  const actionAlertsByStatus = new Map<string | null, { overdue: number, upcoming: number }>()
  actionStats.byAuditStatus.forEach((stat) => {
    // Include all actions, even those with null auditStatus (entity-level actions)
    actionAlertsByStatus.set(stat.auditStatus, {
      overdue: stat.overdueCount,
      upcoming: stat.upcomingCount,
    })
  })

  // Build categories with cards
  const categories: DashboardCategory[] = []

  for (const mapping of CARD_MAPPINGS) {
    const cards: DashboardCard[] = []

    for (const cardMapping of mapping.cards) {
      // Special handling for contract signature card
      if (cardMapping.auditStatus === 'PENDING_FEEF_CONTRACT_SIGNATURE') {
        cards.push({
          shortText: cardMapping.shortText,
          value: contractCount,
          alertesRouges: 0,
          alertesOranges: 0,
          color: cardMapping.color,
          bgColor: cardMapping.bgColor,
          to: cardMapping.to,
          auditTypes: contractTypes,
        })
      }
      // Special handling for case submission card
      else if (cardMapping.auditStatus === 'CASE_SUBMISSION_IN_PROGRESS') {
        const caseSubmissionTypes = { initial: 0, renewal: 0, monitoring: 0 }
        auditStats.entitiesCaseSubmission.types.forEach((stat) => {
          if (stat.type === 'INITIAL') caseSubmissionTypes.initial = stat.count
          else if (stat.type === 'RENEWAL') caseSubmissionTypes.renewal = stat.count
          else if (stat.type === 'MONITORING') caseSubmissionTypes.monitoring = stat.count
        })

        cards.push({
          shortText: cardMapping.shortText,
          value: auditStats.entitiesCaseSubmission.count,
          alertesRouges: auditStats.entitiesCaseSubmission.overdueCount,
          alertesOranges: auditStats.entitiesCaseSubmission.upcomingCount,
          color: cardMapping.color,
          bgColor: cardMapping.bgColor,
          to: cardMapping.to,
          auditTypes: caseSubmissionTypes,
        })
      } else {
        const count = auditCountByStatus.get(cardMapping.auditStatus) || 0
        const alerts = actionAlertsByStatus.get(cardMapping.auditStatus) || { overdue: 0, upcoming: 0 }
        const types = auditTypesByStatus.get(cardMapping.auditStatus) || { initial: 0, renewal: 0, monitoring: 0 }

        cards.push({
          shortText: cardMapping.shortText,
          value: count,
          alertesRouges: alerts.overdue,
          alertesOranges: alerts.upcoming,
          color: cardMapping.color,
          bgColor: cardMapping.bgColor,
          to: cardMapping.to,
          auditTypes: types,
        })
      }
    }

    categories.push({
      label: mapping.category,
      cards,
    })
  }

  return categories
}

export function useDashboardStats() {
  // Global state
  const auditStats = useState<AuditStats | null>('dashboard:auditStats', () => null)
  const actionStats = useState<ActionStats | null>('dashboard:actionStats', () => null)
  const loading = useState<boolean>('dashboard:loading', () => false)
  const error = useState<string | null>('dashboard:error', () => null)

  // Fetch statistics
  const fetchStats = async () => {
    loading.value = true
    error.value = null
    try {
      const [auditRes, actionRes] = await Promise.all([
        $fetch('/api/audits/stats'),
        $fetch('/api/actions/stats'),
      ])
      auditStats.value = auditRes.data
      actionStats.value = actionRes.data
    }
    catch (err) {
      error.value = 'Erreur lors du chargement des statistiques'
      console.error(err)
    }
    finally {
      loading.value = false
    }
  }

  // Calculate dashboard categories with alerts
  const dashboardCategories = computed(() => {
    if (!auditStats.value || !actionStats.value)
      return []

    const categories = buildDashboardCategories(auditStats.value, actionStats.value)

    // Enrichir avec les tendances
    const { getTrends } = useDashboardTrends()
    const trends = getTrends(categories)

    // Ajouter les tendances à chaque carte
    return categories.map(category => ({
      ...category,
      cards: category.cards.map((card) => {
        const cardKey = generateCardKey(category.label, card)
        const cardTrend = trends[cardKey]

        return {
          ...card,
          trend: cardTrend?.trend,
          lastValue: cardTrend?.lastValue,
          lastDate: cardTrend?.lastDate,
        }
      }),
    }))
  })

  // Calculate category totals
  const categoryTotals = computed(() => {
    return dashboardCategories.value.map(cat =>
      cat.cards.reduce((sum, card) => sum + card.value, 0),
    )
  })

  return {
    auditStats: readonly(auditStats),
    actionStats: readonly(actionStats),
    loading: readonly(loading),
    error: readonly(error),
    dashboardCategories: readonly(dashboardCategories),
    categoryTotals: readonly(categoryTotals),
    fetchStats,
    refresh: fetchStats,
  }
}
