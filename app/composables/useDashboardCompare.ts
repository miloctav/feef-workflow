/**
 * Composable for OE comparison mode on the FEEF dashboard.
 */

import { getCardMappings } from '~/composables/useDashboardStats'

// ---------------------------------------------------------------------------
// Color palette – one color per OE (assigned by index)
// ---------------------------------------------------------------------------

export const OE_COLORS = [
  { bg: 'rgba(59,130,246,0.7)',  border: 'rgba(59,130,246,1)',  tailwind: 'bg-blue-500',    dot: '#3b82f6' },   // blue
  { bg: 'rgba(16,185,129,0.7)', border: 'rgba(16,185,129,1)',  tailwind: 'bg-emerald-500', dot: '#10b981' },   // emerald
  { bg: 'rgba(245,158,11,0.7)', border: 'rgba(245,158,11,1)',  tailwind: 'bg-amber-500',   dot: '#f59e0b' },   // amber
  { bg: 'rgba(139,92,246,0.7)', border: 'rgba(139,92,246,1)',  tailwind: 'bg-violet-500',  dot: '#8b5cf6' },   // violet
  { bg: 'rgba(236,72,153,0.7)', border: 'rgba(236,72,153,1)',  tailwind: 'bg-pink-500',    dot: '#ec4899' },   // pink
  { bg: 'rgba(20,184,166,0.7)', border: 'rgba(20,184,166,1)',  tailwind: 'bg-teal-500',    dot: '#14b8a6' },   // teal
  { bg: 'rgba(249,115,22,0.7)', border: 'rgba(249,115,22,1)',  tailwind: 'bg-orange-500',  dot: '#f97316' },   // orange
  { bg: 'rgba(99,102,241,0.7)', border: 'rgba(99,102,241,1)',  tailwind: 'bg-indigo-500',  dot: '#6366f1' },   // indigo
  { bg: 'rgba(6,182,212,0.7)',  border: 'rgba(6,182,212,1)',   tailwind: 'bg-cyan-500',    dot: '#06b6d4' },   // cyan
  { bg: 'rgba(244,63,94,0.7)',  border: 'rgba(244,63,94,1)',   tailwind: 'bg-rose-500',    dot: '#f43f5e' },   // rose
]

// Neutral color for "unassigned" (null oeId)
export const UNASSIGNED_COLOR = {
  bg: 'rgba(156,163,175,0.7)',
  border: 'rgba(156,163,175,1)',
  tailwind: 'bg-gray-400',
  dot: '#9ca3af',
}

// ---------------------------------------------------------------------------
// Raw API shape
// ---------------------------------------------------------------------------

interface CompareApiData {
  oes: Array<{ id: number, name: string }>
  auditsByStatusByOe: Array<{ oeId: number | null, status: string, count: number }>
  actionAlertsByOe: Array<{ oeId: number | null, auditStatus: string | null, overdueCount: number, upcomingCount: number }>
  entityCountByOe: Array<{ oeId: number | null, count: number }>
  auditGapByOe: Array<{ oeId: number | null, avgGapDays: number | null }>
  processDurationByOe: Array<{ oeId: number | null, avgDurationDays: number | null }>
  scheduledAuditsByMonthByOe: Array<{ oeId: number | null, month: string, count: number }>
  labeledByYearByOe: Array<{ oeId: number | null, year: number, count: number }>
  progressBarByOe: Array<{ oeId: number | null, status: string, count: number }>
  monthLabels: string[]
  yearLabels: number[]
}

// ---------------------------------------------------------------------------
// Exported per-OE card item shape (used by DashboardCardCompare)
// ---------------------------------------------------------------------------

export interface PerOeCardItem {
  oeId: number | null
  oeName: string
  value: number
  alertesRouges: number
  alertesOranges: number
  dot: string
}

// Progress bar per OE shape (used by DashboardProgressBarCompare)
export interface ProgressBarOe {
  oeId: number | null
  oeName: string
  dot: string
  phases: Array<{ key: string, count: number, pct: number, detail: Record<string, number> }>
  total: number
}

// Overview stats per OE (used in the top stats table)
export interface OverviewOe {
  oeId: number | null
  oeName: string
  dot: string
  entityCount: number
  avgAuditGapMonths: number | null
  avgProcessDurationMonths: number | null
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useDashboardCompare() {
  const rawData = useState<CompareApiData | null>('dashboard:compare:data', () => null)
  const loading  = useState<boolean>('dashboard:compare:loading', () => false)
  const error    = useState<string | null>('dashboard:compare:error', () => null)
  const isCompareMode = useState<boolean>('dashboard:compare:active', () => false)

  // ------------------------------------------------------------------
  // Fetch
  // ------------------------------------------------------------------
  const fetchCompare = async () => {
    loading.value = true
    error.value   = null
    try {
      const res = await $fetch<{ data: CompareApiData }>('/api/dashboard/compare')
      rawData.value = res.data
    }
    catch (err) {
      error.value = 'Erreur lors du chargement des données de comparaison'
      console.error(err)
    }
    finally {
      loading.value = false
    }
  }

  // ------------------------------------------------------------------
  // Helpers: color & name lookup
  // ------------------------------------------------------------------

  /** Sorted list of OE ids (consistent ordering for color assignment) */
  const sortedOeIds = computed<Array<number | null>>(() => {
    if (!rawData.value) return []
    // real OEs first (sorted by id), then null (unassigned)
    const ids = rawData.value.oes.map(o => o.id as number | null).sort((a, b) => (a ?? 0) - (b ?? 0))
    // only add null bucket if there are any pre-OE audits (status with null oeId)
    const hasUnassigned = rawData.value.auditsByStatusByOe.some(r => r.oeId === null)
    if (hasUnassigned) ids.push(null)
    return ids
  })

  /** Map oeId -> { name, dot, bg, border } */
  const oeColorMap = computed(() => {
    const map = new Map<number | null, { name: string, dot: string, bg: string, border: string }>()
    const data = rawData.value
    if (!data) return map

    sortedOeIds.value.forEach((oeId, idx) => {
      const palette = oeId === null ? UNASSIGNED_COLOR : (OE_COLORS[idx % OE_COLORS.length] ?? OE_COLORS[0]!)
      const name    = oeId === null
        ? 'Non assigné'
        : (data.oes.find(o => o.id === oeId)?.name ?? `OE ${oeId}`)
      map.set(oeId, { name, dot: palette.dot, bg: palette.bg, border: palette.border })
    })
    return map
  })

  const getOeInfo = (oeId: number | null) =>
    oeColorMap.value.get(oeId) ?? { name: 'Inconnu', dot: UNASSIGNED_COLOR.dot, bg: UNASSIGNED_COLOR.bg, border: UNASSIGNED_COLOR.border }

  // ------------------------------------------------------------------
  // compareCategories  (mirrors the card grid in normal mode)
  // ------------------------------------------------------------------
  const compareCategories = computed(() => {
    const data = rawData.value
    if (!data) return []

    // Build lookups
    const auditCount = new Map<string, number>() // `${oeId ?? 'null'}_${status}` -> count
    data.auditsByStatusByOe.forEach(r => {
      auditCount.set(`${r.oeId ?? 'null'}_${r.status}`, r.count)
    })

    const alertMap = new Map<string, { overdue: number, upcoming: number }>() // `${oeId ?? 'null'}_${auditStatus ?? 'null'}`
    data.actionAlertsByOe.forEach(r => {
      alertMap.set(`${r.oeId ?? 'null'}_${r.auditStatus ?? 'null'}`, {
        overdue: r.overdueCount,
        upcoming: r.upcomingCount,
      })
    })

    const allOeIds = sortedOeIds.value

    const cardMappings = getCardMappings('feef')

    return cardMappings.map(mapping => {
      const cards = mapping.cards.map((cardDef) => {
        // For each audit status, compute value and alerts per OE
        const perOe: PerOeCardItem[] = allOeIds.map((oeId) => {
          const info = getOeInfo(oeId)
          const key = `${oeId ?? 'null'}_${cardDef.auditStatus}`
          const alertKey = `${oeId ?? 'null'}_${cardDef.auditStatus}`
          const alerts = alertMap.get(alertKey) ?? { overdue: 0, upcoming: 0 }
          return {
            oeId,
            oeName: info.name,
            value: auditCount.get(key) ?? 0,
            alertesRouges: alerts.overdue,
            alertesOranges: alerts.upcoming,
            dot: info.dot,
          }
        })

        const total = perOe.reduce((s, o) => s + o.value, 0)

        return {
          shortText: cardDef.shortText,
          auditStatus: cardDef.auditStatus,
          total,
          perOe,
        }
      })

      return { label: mapping.category, cards }
    })
  })

  /** Total per category column (mirrors categoryTotals in normal mode) */
  const compareCategoryTotals = computed(() =>
    compareCategories.value.map(cat =>
      cat.cards.reduce((s, c) => s + c.total, 0),
    ),
  )

  // ------------------------------------------------------------------
  // compareProgressBars
  // ------------------------------------------------------------------

  const PHASE_STATUSES: Record<string, string[]> = {
    candidature: ['CASE_SUBMISSION_IN_PROGRESS', 'PENDING_FEEF_CONTRACT_SIGNATURE', 'PENDING_CASE_APPROVAL'],
    engagement:  ['PENDING_OE_CHOICE', 'PENDING_OE_ACCEPTANCE'],
    audit:       ['PLANNING', 'SCHEDULED', 'PENDING_REPORT', 'PENDING_COMPLEMENTARY_AUDIT'],
    decision:    ['PENDING_OE_OPINION', 'PENDING_CORRECTIVE_PLAN', 'PENDING_CORRECTIVE_PLAN_VALIDATION', 'PENDING_FEEF_DECISION'],
    labellise:   ['COMPLETED'],
  }
  const PHASE_KEYS = ['candidature', 'engagement', 'audit', 'decision', 'labellise'] as const

  const compareProgressBars = computed<ProgressBarOe[]>(() => {
    const data = rawData.value
    if (!data) return []

    // group progressBarByOe by oeId
    const byOe = new Map<string, Map<string, number>>()
    data.progressBarByOe.forEach(r => {
      const k = String(r.oeId ?? 'null')
      if (!byOe.has(k)) byOe.set(k, new Map())
      byOe.get(k)!.set(r.status, r.count)
    })

    return sortedOeIds.value.map((oeId) => {
      const info     = getOeInfo(oeId)
      const statuses = byOe.get(String(oeId ?? 'null')) ?? new Map<string, number>()

      let total = 0
      const phaseRaw = PHASE_KEYS.map((key) => {
        const detail: Record<string, number> = {}
        let count = 0
        PHASE_STATUSES[key]!.forEach(s => {
          const c = statuses.get(s) ?? 0
          detail[s] = c
          count += c
        })
        total += count
        return { key, count, detail }
      })

      let running = 0
      const phases = phaseRaw.map((p, i) => {
        let pct: number
        if (i === phaseRaw.length - 1) {
          pct = total > 0 ? 100 - running : 0
        }
        else {
          pct = total > 0 ? Math.round((p.count / total) * 100) : 0
          running += pct
        }
        return { ...p, pct }
      })

      return { oeId, oeName: info.name, dot: info.dot, phases, total }
    })
  })

  // ------------------------------------------------------------------
  // compareScheduledAuditsChart  – grouped bar chart (one dataset per OE)
  // ------------------------------------------------------------------
  const compareScheduledAuditsChart = computed(() => {
    const data = rawData.value
    if (!data) return null

    const labels = data.monthLabels.map((m) => {
      const [year, mon] = m.split('-')
      return new Date(parseInt(year!), parseInt(mon!) - 1).toLocaleDateString('fr-FR', { month: 'short' })
    })

    const datasets = sortedOeIds.value.map((oeId) => {
      const info = getOeInfo(oeId)
      const counts = data.monthLabels.map(m => {
        const row = data.scheduledAuditsByMonthByOe.find(r => r.oeId === oeId && r.month === m)
        return row?.count ?? 0
      })
      return {
        label: info.name,
        data: counts,
        backgroundColor: info.bg,
        borderColor: info.border,
        borderWidth: 2,
        borderRadius: 4,
      }
    })

    return { labels, datasets }
  })

  // ------------------------------------------------------------------
  // compareLabeledEntitiesChart – grouped bar chart (one dataset per OE)
  // ------------------------------------------------------------------
  const compareLabeledEntitiesChart = computed(() => {
    const data = rawData.value
    if (!data) return null

    const labels = data.yearLabels.map(String)

    const datasets = sortedOeIds.value.map((oeId) => {
      const info = getOeInfo(oeId)
      const counts = data.yearLabels.map(y => {
        const row = data.labeledByYearByOe.find(r => r.oeId === oeId && r.year === y)
        return row?.count ?? 0
      })
      return {
        label: info.name,
        data: counts,
        backgroundColor: info.bg,
        borderColor: info.border,
        borderWidth: 2,
        borderRadius: 4,
      }
    })

    return { labels, datasets }
  })

  // ------------------------------------------------------------------
  // compareOverviewStats – top stats table
  // ------------------------------------------------------------------
  const compareOverviewStats = computed<OverviewOe[]>(() => {
    const data = rawData.value
    if (!data) return []

    return sortedOeIds.value.map((oeId) => {
      const info = getOeInfo(oeId)

      const entityCount = data.entityCountByOe.find(r => r.oeId === oeId)?.count ?? 0

      const gapDays  = data.auditGapByOe.find(r => r.oeId === oeId)?.avgGapDays ?? null
      const avgAuditGapMonths = gapDays !== null
        ? Math.round((gapDays / 30.44) * 10) / 10
        : null

      const durDays  = data.processDurationByOe.find(r => r.oeId === oeId)?.avgDurationDays ?? null
      const avgProcessDurationMonths = durDays !== null
        ? Math.round((durDays / 30.44) * 10) / 10
        : null

      return {
        oeId,
        oeName: info.name,
        dot: info.dot,
        entityCount,
        avgAuditGapMonths,
        avgProcessDurationMonths,
      }
    })
  })

  // ------------------------------------------------------------------
  return {
    rawData: readonly(rawData),
    loading: readonly(loading),
    error: readonly(error),
    isCompareMode,
    oeColorMap: readonly(oeColorMap),
    compareCategories: readonly(compareCategories),
    compareCategoryTotals: readonly(compareCategoryTotals),
    compareProgressBars: readonly(compareProgressBars),
    compareScheduledAuditsChart: readonly(compareScheduledAuditsChart),
    compareLabeledEntitiesChart: readonly(compareLabeledEntitiesChart),
    compareOverviewStats: readonly(compareOverviewStats),
    fetchCompare,
  }
}
