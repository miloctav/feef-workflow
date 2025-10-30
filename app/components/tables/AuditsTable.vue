<template>
  <div class="w-full space-y-4">
    <!-- Table paginée -->
    <PaginatedTable
      :has-filters="hasFilters"
      filters-title="Filtres audits"
      :on-filters-change="handleFiltersChange"
      :data="audits"
      :pagination="pagination"
      :loading="fetchLoading"
      :error="fetchError"
      :columns="columns"
      :has-add-button="false"
      :has-search="false"
      :on-page-change="goToPage"
      :on-row-click="handleRowClick"
      :on-delete="canDeleteAudit ? handleDelete : undefined"
      :get-item-name="(audit) => `l'audit de ${audit.entity.name}`"
    >
      <template #filters="{ filters, updateFilter }">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FilterSelect
            label="Type d'audit"
            :model-value="filters.type"
            @update:model-value="updateFilter('type', $event)"
            :items="auditTypeItems"
            placeholder="Type d'audit"
          />
          <FilterSelect
            label="Organisme Évaluateur"
            :model-value="filters.oeId"
            @update:model-value="updateFilter('oeId', $event)"
            :items="oeItems"
            placeholder="OE"
          />
          <FilterSelect
            label="Auditeur"
            :model-value="filters.auditorId"
            @update:model-value="updateFilter('auditorId', $event)"
            :items="auditorItems"
            placeholder="Auditeur"
          />
        </div>
      </template>

      <template #filter-badges="{ filters }">
        <UBadge v-if="filters.type !== null" variant="subtle" color="primary" size="sm">
          Type: {{ getFilterLabel('type', filters.type) }}
        </UBadge>
        <UBadge v-if="filters.oeId !== null" variant="subtle" color="info" size="sm">
          OE: {{ getFilterLabel('oeId', filters.oeId) }}
        </UBadge>
        <UBadge v-if="filters.auditorId !== null" variant="subtle" color="success" size="sm">
          Auditeur: {{ getFilterLabel('auditorId', filters.auditorId) }}
        </UBadge>
      </template>
    </PaginatedTable>
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
  // Charger la liste des audits
  // Note: Si entityId est fourni en props, il est déjà dans initialParams et sera utilisé automatiquement
  fetchAudits()

  if( props.hasFilters ){
    loadOEs()
    loadAuditors()
  }
})

// Gérer les changements de filtres depuis PaginatedTable
const handleFiltersChange = (newFilters: Record<string, any>) => {
  const activeFilters: Record<string, any> = { ...newFilters }

  // Préserver le filtre entityId si fourni en props
  if (props.entityId) {
    activeFilters.entityId = props.entityId
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
