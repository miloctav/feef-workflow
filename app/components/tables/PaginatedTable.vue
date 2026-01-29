<template>
  <div>
    <!-- Carte de filtres -->
    <UCard v-if="hasFilters" class="mb-4 shadow-md rounded-xl p-6 bg-white dark:bg-gray-900">
      <div class="flex items-center gap-2 mb-6">
        <UIcon name="i-heroicons-funnel" class="w-6 h-6 text-primary" />
        <h3 class="text-xl font-bold text-primary">{{ filtersTitle }}</h3>
      </div>
      <div class="space-y-4">
        <!-- Slot pour les filtres personnalisés -->
        <slot name="filters" :filters="filters" :update-filter="updateFilter" :has-active-filters="hasActiveFilters" />

        <!-- Footer avec bouton réinitialiser et compteur -->
        <div class="flex items-center gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <UButton @click="resetFilters" color="neutral" variant="outline" size="sm" icon="i-heroicons-x-mark">
            Réinitialiser
          </UButton>
          <div class="ml-auto text-sm text-gray-600 dark:text-gray-400">
            <span class="font-bold">{{ pagination.total }}</span> résultat{{ pagination.total > 1 ? 's' : '' }} trouvé{{ pagination.total > 1 ? 's' : '' }}
          </div>
        </div>

        <!-- Slot pour les badges de filtres actifs -->
        <div v-if="hasActiveFilters" class="flex flex-wrap gap-2 mt-2">
          <slot name="filter-badges" :filters="filters" />
        </div>
      </div>
    </UCard>

    <!-- Barre de recherche et bouton d'ajout -->
    <div class="mb-4 flex flex-col gap-4">
      <div class="flex justify-between gap-4">
        <div class="flex gap-4 items-center">
          <UInput v-if="hasSearch" v-model="searchQuery" :placeholder="searchPlaceholder" icon="i-lucide-search" class="w-80"
            :ui="{ trailing: 'pe-1' }" @input="handleSearchInput">
            <template v-if="searchQuery?.length" #trailing>
              <UButton color="neutral" variant="link" size="sm" icon="i-lucide-circle-x"
                aria-label="Effacer la recherche" @click="clearSearch" />
            </template>
          </UInput>
        </div>

        <!-- Bouton d'ajout -->
        <UButton v-if="hasAddButton" color="primary" :icon="addButtonIcon" size="sm" @click="openCreateModal">
          {{ addButtonText }}
        </UButton>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading && !data.length" class="flex justify-center items-center py-12">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-primary text-2xl" />
      <span class="ml-2 text-gray-600">Chargement...</span>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-alert-circle" class="text-red-600" />
        <span class="text-red-800">{{ error }}</span>
      </div>
    </div>

    <!-- Table -->
    <template v-else>
      <div class="overflow-y-auto max-h-[calc(100vh-13rem)]">
        <UTable :data="data" :columns="columnsWithActions" :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-(--ui-bg-elevated)/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-1 first:rounded-l-[calc(var(--ui-radius)*2)] last:rounded-r-[calc(var(--ui-radius)*2)] border-y border-(--ui-border) first:border-l last:border-r',
          td: 'border-b border-(--ui-border)',
        }" @select="handleRowClick" sticky />
      </div>

      <!-- Pagination -->
      <div class="flex justify-between items-center mt-4">
        <div class="text-sm text-gray-600">
          Affichage de {{ ((pagination.page - 1) * pagination.limit) + 1 }}
          à {{ Math.min(pagination.page * pagination.limit, pagination.total) }}
          sur {{ pagination.total }} résultats
        </div>

        <UPagination v-model:page="currentPage" :total="pagination.total" :disabled="isLoading"
          :items-per-page="pagination.limit" />
      </div>
    </template>

    <!-- Modal unifié pour création et édition -->
    <UModal v-model:open="isFormModalOpen" :title="formModalTitle" :ui="{ footer: 'justify-end' }">
      <template #body>
        <slot name="form" :item="currentItem" :is-editing="isEditing" />
      </template>

      <template #footer="{ close }">
        <slot name="form-footer" :close="close" :item="currentItem" :is-editing="isEditing">
          <UButton label="Annuler" color="neutral" variant="outline" @click="close" />
          <UButton 
            :label="isEditing ? 'Modifier' : 'Créer'" 
            color="primary" 
            @click="close" 
          />
        </slot>
      </template>
    </UModal>

    <!-- Modal de confirmation de suppression -->
    <UModal v-model:open="isDeleteModalOpen" title="Confirmer la suppression" :ui="{ footer: 'justify-end' }">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-alert-triangle" class="text-red-600 text-xl" />
          <span class="text-highlighted font-semibold">Confirmer la suppression</span>
        </div>
      </template>

      <template #body>
        <p class="text-gray-700">
          Êtes-vous sûr de vouloir supprimer
          <strong>{{ deleteItemName }}</strong> ?
        </p>
        <p class="text-sm text-gray-500 mt-2">
          Cette action est irréversible.
        </p>
      </template>

      <template #footer="{ close }">
        <UButton label="Annuler" color="neutral" variant="outline" @click="close" />
        <UButton label="Supprimer" color="error" :loading="deleteLoading" @click="confirmDelete" />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts" generic="T extends Record<string, any>">
import type { TableColumn, TableRow } from '@nuxt/ui'

// Props
const props = withDefaults(defineProps<{
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  loading?: boolean
  error?: string | null
  columns: TableColumn<T>[]
  hasAddButton?: boolean
  hasSearch?: boolean
  addButtonText?: string
  addButtonIcon?: string
  searchPlaceholder?: string
  hasFilters?: boolean
  filtersTitle?: string
  canEdit?: boolean
  onRowClick?: (row: T) => void
  onDelete?: (item: T) => Promise<{ success: boolean }>
  onUpdate?: (item: T) => Promise<{ success: boolean }>
  onCreate?: () => void
  onPageChange: (page: number) => void
  onSearch?: (search: string) => void
  onFiltersChange?: (filters: Record<string, any>) => void
  getItemName?: (item: T) => string
}>(), {
  loading: false,
  error: null,
  addButtonText: 'Ajouter',
  addButtonIcon: 'i-lucide-plus',
  searchPlaceholder: 'Rechercher...',
  hasAddButton: true,
  hasFilters: false,
  hasSearch: true,
  canEdit: false,
  filtersTitle: 'Filtres',
  getItemName: (item: T) => String(item.name || item.id || 'cet élément')
})

// Aliases pour garder la compatibilité avec le reste du code
const isLoading = computed(() => props.loading)
const goToPage = props.onPageChange
const setSearch = props.onSearch

// State pour la recherche
const searchQuery = ref('')

// État des filtres
const filters = ref<Record<string, any>>({})

// Computed pour vérifier s'il y a des filtres actifs
const hasActiveFilters = computed(() => {
  return Object.values(filters.value).some(value => value !== null && value !== undefined && value !== '')
})

// Fonction pour mettre à jour un filtre
const updateFilter = (name: string, value: any) => {
  filters.value[name] = value
  if (props.onFiltersChange) {
    props.onFiltersChange({ ...filters.value })
  }
}

// Fonction pour réinitialiser les filtres
const resetFilters = () => {
  filters.value = {}
  if (props.onFiltersChange) {
    props.onFiltersChange({})
  }
}

// State pour les modals
const isFormModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const currentItem = ref<T | null>(null)
const isEditing = ref(false)
const itemToDelete = ref<T | null>(null)
const deleteLoading = ref(false)

// Pagination synchronisée
const currentPage = computed({
  get: () => props.pagination.page,
  set: (newPage) => goToPage(newPage)
})

// Debounce pour la recherche
let searchTimeout: NodeJS.Timeout | null = null

const handleSearchInput = () => {
  if(!setSearch) return

  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  searchTimeout = setTimeout(() => {
    setSearch(searchQuery.value)
  }, 300)
}

// Réinitialiser la recherche
const clearSearch = () => {
  if(!setSearch) return
  searchQuery.value = ''
  setSearch('')
}

// Ouvrir le modal pour la création
const openCreateModal = () => {
  currentItem.value = null
  isEditing.value = false
  isFormModalOpen.value = true
  // Déclencher l'événement onCreate pour réinitialiser le formulaire si nécessaire
  if (props.onCreate) {
    props.onCreate()
  }
}

// Ouvrir le modal pour l'édition
const openEditModal = (item: T) => {
  currentItem.value = item
  isEditing.value = true
  isFormModalOpen.value = true
  // Déclencher l'événement onUpdate pour préremplir le formulaire
  if (props.onUpdate) {
    props.onUpdate(item)
  }
}

// Ouvrir le modal de suppression
const openDeleteModal = (item: T) => {
  itemToDelete.value = item
  isDeleteModalOpen.value = true
}

// Confirmer la suppression
const confirmDelete = async () => {
  if (!itemToDelete.value || !props.onDelete) return

  deleteLoading.value = true
  const result = await props.onDelete(itemToDelete.value)
  deleteLoading.value = false

  if (result.success) {
    isDeleteModalOpen.value = false
    itemToDelete.value = null
  }
}

// Obtenir le nom de l'item
const getItemName = (item: T | null) => {
  if (!item) return ''
  return props.getItemName(item)
}

// Computed pour les noms d'items et le titre du modal
const formModalTitle = computed(() => {
  if (isEditing.value && currentItem.value) {
    return `Modifier ${getItemName(currentItem.value)}`
  }
  return props.addButtonText
})

const deleteItemName = computed(() => getItemName(itemToDelete.value))

// Gérer le clic sur une ligne
const handleRowClick = (event: any, row: any) => {
  // Vérifier si le clic provient du bouton d'actions
  if (event?.target && (event.target as HTMLElement).closest?.('[data-actions-menu]')) {
    return
  }

  if (props.onRowClick) {
    // row.original contient les données réelles
    const data = row?.original ?? row
    if (data) {
      props.onRowClick(data)
    }
  }
}

// Ajouter la colonne Actions si onDelete ou canEdit est fourni
const columnsWithActions = computed(() => {
  if (!props.onDelete && !props.canEdit) return props.columns

  const UButton = resolveComponent('UButton')
  const UDropdownMenu = resolveComponent('UDropdownMenu')

  return [
    ...props.columns,
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: { row: TableRow<T> }) => {
        const item = row.original
        const items: any[] = [
          {
            type: 'label',
            label: 'Actions',
          },
          {
            type: 'separator',
          },
        ]

        // Ajouter l'option "Modifier" si canEdit est true
        if (props.canEdit) {
          items.push({
            label: 'Modifier',
            icon: 'i-heroicons-pencil',
            color: 'primary',
            onSelect() {
              openEditModal(item)
            },
          })
        }

        // Ajouter l'option "Supprimer" si onDelete est fourni
        if (props.onDelete) {
          items.push({
            label: 'Supprimer',
            icon: 'i-heroicons-trash',
            color: 'error',
            onSelect() {
              openDeleteModal(item)
            },
          })
        }

        return h(
          'div',
          {
            class: 'text-right',
            'data-actions-menu': true,
          },
          h(
            UDropdownMenu,
            {
              content: {
                align: 'end',
              },
              items,
              'aria-label': 'Actions',
            },
            () =>
              h(UButton, {
                icon: 'i-heroicons-ellipsis-vertical',
                color: 'neutral',
                variant: 'ghost',
                class: 'ml-auto',
                'aria-label': 'Actions',
              })
          )
        )
      },
    } as TableColumn<T>,
  ]
})
</script>
