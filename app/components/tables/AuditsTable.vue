<template>
  <div class="w-full space-y-4">
    <!-- Filtres personnalisés -->
    <UCard v-if="hasFilters" class="shadow-md rounded-xl p-6 bg-white dark:bg-gray-900">
      <div class="flex items-center gap-2 mb-6">
        <UIcon name="i-heroicons-funnel" class="w-6 h-6 text-primary" />
        <h3 class="text-xl font-bold text-primary">Filtres audits</h3>
      </div>
      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FilterSelect
            label="Type d'audit"
            v-model="filters.type"
            :items="auditTypeItems"
            placeholder="Type d'audit"
            @update:model-value="handleFilterChange"
          />
          <FilterSelect
            label="Organisme Évaluateur"
            v-model="filters.oeId"
            :items="oeItems"
            placeholder="OE"
            @update:model-value="handleFilterChange"
          />
          <FilterSelect
            label="Auditeur"
            v-model="filters.auditorId"
            :items="auditorItems"
            placeholder="Auditeur"
            @update:model-value="handleFilterChange"
          />
        </div>
        <div class="flex items-center gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <UButton @click="resetFilters" color="neutral" variant="outline" size="sm" icon="i-heroicons-x-mark">
            Réinitialiser
          </UButton>
          <div class="ml-auto text-sm text-gray-600 dark:text-gray-400">
            <span class="font-bold">{{ pagination.total }}</span> audit{{ pagination.total > 1 ? 's' : '' }} trouvé{{
              pagination.total > 1 ? 's' : '' }}
          </div>
        </div>
        <div v-if="hasActiveFilters" class="flex flex-wrap gap-2 mt-2">
          <UBadge v-if="filters.type !== null" variant="subtle" color="primary" size="sm">
            Type: {{ getFilterLabel('type', filters.type) }}
          </UBadge>
          <UBadge v-if="filters.oeId !== null" variant="subtle" color="info" size="sm">
            OE: {{ getFilterLabel('oeId', filters.oeId) }}
          </UBadge>
          <UBadge v-if="filters.auditorId !== null" variant="subtle" color="success" size="sm">
            Auditeur: {{ getFilterLabel('auditorId', filters.auditorId) }}
          </UBadge>
        </div>
      </div>
    </UCard>

    <!-- Table paginée -->
    <PaginatedTable
      :data="audits"
      :pagination="pagination"
      :loading="fetchLoading"
      :error="fetchError"
      :columns="columns"
      :has-add-button="false"
      :on-page-change="goToPage"
      :on-row-click="handleRowClick"
      :on-delete="canDeleteAudit ? handleDelete : undefined"
      :get-item-name="(audit) => `l'audit de ${audit.entity.name}`"
    />
  </div>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { AuditWithRelations } from '~~/app/types/audits'
import {
  AuditType,
  type AuditTypeType,
  getAuditTypeItems,
  getAuditTypeLabel,
} from '#shared/types/enums'

const props = withDefaults(defineProps<{
  hasFilters?: boolean
  entityId?: number
}>(), {
  hasFilters: true
})

const { user } = useAuth()

// Composable pour gérer les audits (avec entityId si fourni)
const {
  audits,
  pagination,
  fetchLoading,
  fetchError,
  goToPage,
  setFilters,
  deleteAudit,
  fetchAudits,
} = useAudits({ entityId: props.entityId })

// Composable pour gérer les comptes (auditeurs)
const { fetchAuditors } = useAccounts()

// Composable pour gérer les OEs
const { fetchOesForSelect } = useOes()

// États des filtres locaux (avant application)
const filters = ref({
  type: null as AuditTypeType | null,
  oeId: null as number | null,
  auditorId: null as number | null,
})

// Items pour les filtres avec labels en français
const auditTypeItems = getAuditTypeItems(true) // true = inclure "Tous les types"

const oeItems = ref<Array<{ label: string; value: number | null }>>([{ label: 'Tous les OE', value: null }])
const auditorItems = ref<Array<{ label: string; value: number | null }>>([{ label: 'Tous les auditeurs', value: null }])

// Charger les OEs pour le filtre
const loadOEs = async () => {
  oeItems.value = await fetchOesForSelect({ includeAll: true })
}

// Charger les auditeurs pour le filtre
const loadAuditors = async () => {
  auditorItems.value = await fetchAuditors({ includeAll: true })
}

// Charger les données au montage du composant
onMounted(() => {
  // Appliquer le filtre entityId si fourni en props
  if (props.entityId) {
    setFilters({ entityId: props.entityId })
  }

  // Charger la liste des audits
  fetchAudits()

  // Charger les données pour les filtres
  loadOEs()
  loadAuditors()
})

// Computed pour vérifier s'il y a des filtres actifs
const hasActiveFilters = computed(() => {
  return filters.value.type !== null ||
    filters.value.oeId !== null ||
    filters.value.auditorId !== null
})

// Appliquer les filtres (fonction utilitaire interne)
const handleFilterChange = () => {
  const activeFilters: Record<string, any> = {}

  // Préserver le filtre entityId si fourni en props
  if (props.entityId) {
    activeFilters.entityId = props.entityId
  }

  if (filters.value.type !== null) {
    activeFilters.type = filters.value.type
  }
  if (filters.value.oeId !== null) {
    activeFilters.oeId = filters.value.oeId
  }
  if (filters.value.auditorId !== null) {
    activeFilters.auditorId = filters.value.auditorId
  }

  setFilters(activeFilters)
}

// Obtenir le label d'un filtre pour l'affichage
const getFilterLabel = (filterName: string, filterValue: AuditTypeType | number | null): string => {
  if (filterValue === null) return ''

  if (filterName === 'type') {
    return getAuditTypeLabel(filterValue as AuditTypeType)
  }
  if (filterName === 'oeId') {
    const oe = oeItems.value.find(item => item.value === filterValue)
    return oe?.label || String(filterValue)
  }
  if (filterName === 'auditorId') {
    const auditor = auditorItems.value.find(item => item.value === filterValue)
    return auditor?.label || String(filterValue)
  }
  return String(filterValue)
}

// Réinitialiser les filtres
const resetFilters = () => {
  filters.value = {
    type: null,
    oeId: null,
    auditorId: null,
  }

  // Préserver le filtre entityId si fourni en props
  const baseFilters: Record<string, any> = {}
  if (props.entityId) {
    baseFilters.entityId = props.entityId
  }

  setFilters(baseFilters)
}

// Vérifier les permissions
const canDeleteAudit = computed(() => user.value?.role === Role.FEEF || user.value?.role === Role.OE)

// Colonnes du tableau (dynamiques selon les props)
const columns = computed(() => {
  const allColumns: TableColumn<AuditWithRelations>[] = [
    {
      accessorKey: 'entity',
      header: 'Entité',
      cell: ({ row }) => row.original.entity.name,
    },
    {
      accessorKey: 'type',
      header: 'Type d\'audit',
      cell: ({ row }) => {
        const type = row.original.type
        const label = getAuditTypeLabel(type)
        const colorMap = {
          [AuditType.INITIAL]: 'primary',
          [AuditType.RENEWAL]: 'warning',
          [AuditType.MONITORING]: 'info',
        }
        const color = colorMap[type] || 'neutral'
        return h(resolveComponent('UBadge'), { color, variant: 'soft', size: 'sm' }, () => label)
      },
    },
    {
      accessorKey: 'oe',
      header: 'Organisme Évaluateur',
      cell: ({ row }) => row.original.oe?.name || '-',
    },
    {
      accessorKey: 'auditor',
      header: 'Auditeur',
      cell: ({ row }) => {
        const auditor = row.original.auditor
        return auditor ? `${auditor.firstname} ${auditor.lastname}` : '-'
      },
    },
    {
      accessorKey: 'plannedDate',
      header: 'Date planifiée',
      cell: ({ row }) => row.original.plannedDate ? formatDate(row.original.plannedDate) : '-',
    },
    {
      accessorKey: 'score',
      header: 'Score',
      cell: ({ row }) => {
        const score = row.original.score
        if (score === null || score === undefined) return '-'

        // Déterminer la couleur en fonction du score
        let color = 'neutral'
        if (score >= 80) color = 'success'
        else if (score >= 60) color = 'warning'
        else color = 'error'

        return h(resolveComponent('UBadge'), { color, variant: 'soft', size: 'sm' }, () => `${score}%`)
      },
    },
  ]

  // Si entityId est fourni, on retire la colonne "Entité"
  if (props.entityId) {
    return allColumns.filter(col => col.accessorKey !== 'entity')
  }

  return allColumns
})

// Navigation vers le détail d'un audit au clic sur une ligne
const handleRowClick = (audit: AuditWithRelations) => {
  navigateTo(`/${user.value?.role.toLowerCase()}/audits/${audit.id}`)
}

// Supprimer un audit
const handleDelete = async (audit: AuditWithRelations) => {
  return await deleteAudit(audit.id)
}
</script>
