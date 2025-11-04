<template>
  <div class="w-full space-y-4">
    <!-- Table paginée -->
    <PaginatedTable
      has-filters
      filters-title="Filtres entités"
      :on-filters-change="handleFiltersChange"
      :data="entities"
      :pagination="pagination"
      :loading="fetchLoading"
      :error="fetchError"
      :columns="columns"
      :on-page-change="goToPage"
      :on-search="setSearch"
      add-button-text='Créer une nouvelle entité'
      :has-add-button="user?.role === Role.FEEF"
      search-placeholder="Rechercher par nom, SIREN, SIRET..."
      :on-row-click="handleRowClick"
      :on-delete="user?.role === Role.FEEF ? handleDelete : undefined"
      :on-create="user?.role === Role.FEEF ? handleFormReset : undefined"
      :get-item-name="(entity) => entity.name"
    >
      <template #filters="{ filters, updateFilter }">
        <div :class="user?.role === Role.FEEF ? 'grid grid-cols-1 md:grid-cols-4 gap-4' : 'grid grid-cols-1 md:grid-cols-3 gap-4'">
          <FilterSelect
            label="Type d'entité"
            :model-value="filters.type"
            @update:model-value="updateFilter('type', $event)"
            :items="entityTypeItems"
            placeholder="Type d'entité"
          />
          <FilterSelect
            label="Mode de labellisation"
            :model-value="filters.mode"
            @update:model-value="updateFilter('mode', $event)"
            :items="entityModeItems"
            placeholder="Mode"
          />
          <FilterSelect
            v-if="user?.role === Role.FEEF"
            label="Organisme Évaluateur"
            :model-value="filters.oeId"
            @update:model-value="updateFilter('oeId', $event)"
            :items="oeItems"
            placeholder="OE"
          />
          <FilterSelect
            v-if="user?.role === Role.FEEF"
            label="Chargé de compte"
            :model-value="filters.accountManagerId"
            @update:model-value="updateFilter('accountManagerId', $event)"
            :items="accountManagerItems"
            placeholder="Chargé de compte"
          />
        </div>
      </template>

      <template #filter-badges="{ filters }">
        <UBadge v-if="filters.type !== null" variant="subtle" color="primary" size="sm">
          Type: {{ getFilterLabel('type', filters.type) }}
        </UBadge>
        <UBadge v-if="filters.mode !== null" variant="subtle" color="secondary" size="sm">
          Mode: {{ getFilterLabel('mode', filters.mode) }}
        </UBadge>
        <UBadge v-if="filters.oeId !== null" variant="subtle" color="info" size="sm">
          OE: {{ getFilterLabel('oeId', filters.oeId) }}
        </UBadge>
        <UBadge v-if="filters.accountManagerId !== null" variant="subtle" color="success" size="sm">
          Chargé: {{ getFilterLabel('accountManagerId', filters.accountManagerId) }}
        </UBadge>
      </template>

      <template v-if="user?.role === Role.FEEF" #form="{ item, isEditing }">
        <UForm ref="form" :schema="schema" :state="state" class="space-y-4">
          <UFormField label="Nom de l'entité" name="name" required>
            <UInput v-model="state.name" placeholder="Ex: Entreprise ABC" icon="i-lucide-building" />
          </UFormField>

          <UFormField label="Type d'entité" name="type" required>
            <USelect v-model="state.type" :items="createEntityTypeItems" placeholder="Sélectionner un type" />
          </UFormField>

          <UFormField label="Mode de labellisation" name="mode" required>
            <USelect v-model="state.mode" :items="createEntityModeItems" placeholder="Sélectionner un mode" />
          </UFormField>

          <UFormField label="SIREN" name="siren">
            <UInput v-model="state.siren" placeholder="123456789" icon="i-lucide-hash" />
          </UFormField>

          <UFormField label="SIRET" name="siret">
            <UInput v-model="state.siret" placeholder="12345678901234" icon="i-lucide-hash" />
          </UFormField>
        </UForm>
      </template>

      <template v-if="user?.role === Role.FEEF" #form-footer="{ close, item, isEditing }">
        <UButton label="Annuler" color="neutral" variant="outline" @click="close" />
        <UButton 
          :label="isEditing ? 'Modifier' : 'Créer'" 
          color="primary" 
          :loading="createLoading" 
          @click="handleCreate(close)" 
        />
      </template>
    </PaginatedTable>
  </div>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { EntityWithRelations } from '~~/app/types/entities'
import {
  EntityType,
  EntityMode,
  type EntityTypeType,
  type EntityModeType,
  getEntityTypeItems,
  getEntityModeItems,
  getEntityTypeLabel,
  getEntityModeLabel
} from '#shared/types/enums'
import { z } from 'zod'

const { user } = useAuth()

// Composable pour gérer les entités
const {
  entities,
  pagination,
  fetchLoading,
  fetchError,
  goToPage,
  setSearch,
  setFilters,
  deleteEntity,
  createEntity,
  fetchEntities,
} = useEntities()

// Items pour les filtres avec labels en français
const entityTypeItems = getEntityTypeItems(true) // true = inclure "Tous les types"
const entityModeItems = getEntityModeItems(true) // true = inclure "Tous les modes"

const oeItems = ref<Array<{ label: string; value: number | null }>>([{ label: 'Tous les OE', value: null }])
const accountManagerItems = ref<Array<{ label: string; value: number | null }>>([{ label: 'Tous les chargés', value: null }])

// Charger les OEs pour le filtre
const loadOEs = async () => {
  try {
    const response = await $fetch<{ data: Array<{ id: number; name: string }> }>('/api/oes?limit=100')
    oeItems.value = [
      { label: 'Tous les OE', value: null },
      ...response.data.map(oe => ({ label: oe.name, value: oe.id }))
    ]
  } catch (e) {
    console.error('Erreur lors du chargement des OE:', e)
  }
}

// Charger les chargés de compte pour le filtre (uniquement rôle FEEF)
const loadAccountManagers = async () => {
  try {
    const response = await $fetch<{ data: Array<{ id: number; firstname: string; lastname: string }> }>('/api/accounts?role=FEEF&limit=100')
    accountManagerItems.value = [
      { label: 'Tous les chargés', value: null },
      ...response.data.map(account => ({
        label: `${account.firstname} ${account.lastname}`,
        value: account.id
      }))
    ]
  } catch (e) {
    console.error('Erreur lors du chargement des chargés de compte:', e)
  }
}

// Charger les données au montage du composant
onMounted(() => {
  // Charger la liste des entités
  fetchEntities()

  if (user.value?.role === Role.FEEF) {
    loadOEs()
    loadAccountManagers()
  }
})

// Items pour le formulaire de création (sans l'option "Tous")
const createEntityTypeItems = getEntityTypeItems(false) // false = sans "Tous les types"
const createEntityModeItems = getEntityModeItems(false) // false = sans "Tous les modes"

// Gérer les changements de filtres depuis PaginatedTable
const handleFiltersChange = (newFilters: Record<string, any>) => {
  setFilters(newFilters)
}

// Obtenir le label d'un filtre pour l'affichage
const getFilterLabel = (filterName: string, filterValue: EntityTypeType | EntityModeType | number | null): string => {
  if (filterValue === null) return ''

  if (filterName === 'type') {
    return getEntityTypeLabel(filterValue as EntityTypeType)
  }
  if (filterName === 'mode') {
    return getEntityModeLabel(filterValue as EntityModeType)
  }
  if (filterName === 'oeId') {
    const oe = oeItems.value.find(item => item.value === filterValue)
    return oe?.label || String(filterValue)
  }
  if (filterName === 'accountManagerId') {
    const manager = accountManagerItems.value.find(item => item.value === filterValue)
    return manager?.label || String(filterValue)
  }
  return String(filterValue)
}

// Schéma de validation pour le formulaire
const schema = z.object({
  name: z.string().min(1, 'Le nom est requis').min(3, 'Le nom doit contenir au moins 3 caractères'),
  type: z.enum(['COMPANY', 'GROUP']),
  mode: z.enum(['MASTER', 'FOLLOWER']),
  siren: z.string().length(9, 'Le SIREN doit contenir 9 chiffres').optional().or(z.literal('')),
  siret: z.string().length(14, 'Le SIRET doit contenir 14 chiffres').optional().or(z.literal('')),
})

type Schema = z.output<typeof schema>

// State du formulaire
const state = reactive<Schema>({
  name: '',
  type: EntityType.COMPANY,
  mode: EntityMode.MASTER,
  siren: '',
  siret: '',
})

const createLoading = ref(false)
const form = ref()

// Réinitialiser le formulaire (fonction appelée par PaginatedTable pour la création)
const handleFormReset = () => {
  // Réinitialiser le formulaire pour la création
  state.name = ''
  state.type = EntityType.COMPANY
  state.mode = EntityMode.MASTER
  state.siren = ''
  state.siret = ''
}

// Créer une entité
const handleCreate = async (close: () => void) => {
  // Valider le formulaire avant de soumettre
  try {
    await form.value.validate()
  } catch (error) {
    // Si le formulaire n'est pas valide, arrêter ici
    return
  }

  createLoading.value = true

  // Préparer les données (ne pas envoyer les champs vides)
  const data: any = {
    name: state.name,
    type: state.type,
    mode: state.mode,
  }

  if (state.siren) data.siren = state.siren
  if (state.siret) data.siret = state.siret

  const result = await createEntity(data)
  createLoading.value = false

  if (result.success) {
    // Réinitialiser le formulaire
    state.name = ''
    state.type = EntityType.COMPANY
    state.mode = EntityMode.MASTER
    state.siren = ''
    state.siret = ''
    close()
  }
}

// Colonnes du tableau
const columns: TableColumn<EntityWithRelations>[] = [
  {
    accessorKey: 'name',
    header: 'Nom',
    cell: ({ row }) => row.original.name,
  },
  {
    accessorKey: 'siren',
    header: 'SIREN',
    cell: ({ row }) => row.original.siren || '-',
  },
  {
    accessorKey: 'siret',
    header: 'SIRET',
    cell: ({ row }) => row.original.siret || '-',
  },
  {
    accessorKey: 'type',
    header: 'Type d\'entité',
    cell: ({ row }) => {
      const type = row.original.type
      const label = getEntityTypeLabel(type)
      const color = type === EntityType.GROUP ? 'secondary' : 'neutral'
      return h(resolveComponent('UBadge'), { color, variant: 'soft', size: 'sm' }, () => label)
    },
  },
  {
    accessorKey: 'mode',
    header: 'Mode labellisation',
    cell: ({ row }) => {
      const mode = row.original.mode
      const label = getEntityModeLabel(mode)
      const color = mode === EntityMode.MASTER ? 'success' : 'info'
      return h(resolveComponent('UBadge'), { color, variant: 'soft', size: 'sm' }, () => label)
    },
  },
  {
    accessorKey: 'oe',
    header: 'Organisme Évaluateur',
    cell: ({ row }) => row.original.oe?.name || '-',
  },
  {
    accessorKey: 'accountManager',
    header: 'Chargé de compte',
    cell: ({ row }) => {
      const manager = row.original.accountManager
      return manager ? `${manager.firstname} ${manager.lastname}` : '-'
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Date de création',
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
]

// Navigation vers le détail d'une entité au clic sur une ligne
const handleRowClick = (entity: EntityWithRelations) => {
  navigateTo(`/${user.value?.role.toLowerCase()}/entities/${entity.id}`)
}

// Supprimer une entité
const handleDelete = async (entity: EntityWithRelations) => {
  return await deleteEntity(entity.id)
}
</script>
