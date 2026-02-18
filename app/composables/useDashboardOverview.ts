/**
 * Composable for dashboard overview statistics
 */

export interface DashboardOverviewData {
    entityCount: number
    avgAuditGapMonths: number | null
    avgProcessDurationMonths: number | null
    scheduledAuditsByMonth: Record<string, { initial: number, renewal: number, monitoring: number }>
    labeledEntitiesByYear: Record<number, { initial: number, renewal: number, monitoring: number }>
    progressBarStats: {
        candidature: { total: number, detail: Record<string, number> }
        engagement: { total: number, detail: Record<string, number> }
        audit: { total: number, detail: Record<string, number> }
        decision: { total: number, detail: Record<string, number> }
        labellise: { total: number, detail: Record<string, number> }
    }
}

export function useDashboardOverview() {
    // Global state
    const data = useState<DashboardOverviewData | null>('dashboard:overview', () => null)
    const loading = useState<boolean>('dashboard:overview:loading', () => false)
    const error = useState<string | null>('dashboard:overview:error', () => null)

    // Fetch overview statistics
    const fetchOverview = async (oeId?: number) => {
        loading.value = true
        error.value = null
        try {
            const query = oeId ? { oeId } : undefined
            const response = await $fetch('/api/dashboard/overview', { query })
            data.value = response.data
        }
        catch (err) {
            error.value = 'Erreur lors du chargement des statistiques du dashboard'
            console.error(err)
        }
        finally {
            loading.value = false
        }
    }

    // Formatted entity count
    const formattedEntityCount = computed(() => {
        return data.value?.entityCount?.toString() || '0'
    })

    // Formatted average audit gap (e.g., "+3.5 mois" or "-2.1 mois")
    const formattedAvgAuditGap = computed(() => {
        const gap = data.value?.avgAuditGapMonths
        if (gap === null || gap === undefined) return 'N/A'

        const sign = gap >= 0 ? '+' : ''
        return `${sign}${gap.toFixed(1)} mois`
    })

    // Formatted average process duration (e.g., "6.2 mois")
    const formattedAvgProcessDuration = computed(() => {
        const duration = data.value?.avgProcessDurationMonths
        if (duration === null || duration === undefined) return 'N/A'

        return `${duration.toFixed(1)} mois`
    })

    // Get scheduled audits data for charts (array format)
    const scheduledAuditsChartData = computed(() => {
        if (!data.value?.scheduledAuditsByMonth) return { labels: [], initial: [], renewal: [], monitoring: [] }

        const months = Object.keys(data.value.scheduledAuditsByMonth).sort()
        const labels = months.map((month) => {
            const [year, monthNum] = month.split('-')
            const date = new Date(parseInt(year), parseInt(monthNum) - 1)
            return date.toLocaleDateString('fr-FR', { month: 'short' })
        })

        const initial = months.map(month => data.value!.scheduledAuditsByMonth[month].initial)
        const renewal = months.map(month => data.value!.scheduledAuditsByMonth[month].renewal)
        const monitoring = months.map(month => data.value!.scheduledAuditsByMonth[month].monitoring)

        return { labels, initial, renewal, monitoring }
    })

    // Get labeled entities data for charts (array format)
    const labeledEntitiesChartData = computed(() => {
        if (!data.value?.labeledEntitiesByYear) return { years: [], initial: [], renewal: [], monitoring: [] }

        const years = Object.keys(data.value.labeledEntitiesByYear).map(Number).sort()
        const initial = years.map(year => data.value!.labeledEntitiesByYear[year].initial)
        const renewal = years.map(year => data.value!.labeledEntitiesByYear[year].renewal)
        const monitoring = years.map(year => data.value!.labeledEntitiesByYear[year].monitoring)

        return { years, initial, renewal, monitoring }
    })

    return {
        data: readonly(data),
        loading: readonly(loading),
        error: readonly(error),
        fetchOverview,
        refresh: fetchOverview,
        // Formatted values
        formattedEntityCount,
        formattedAvgAuditGap,
        formattedAvgProcessDuration,
        // Chart data
        scheduledAuditsChartData,
        labeledEntitiesChartData,
    }
}
