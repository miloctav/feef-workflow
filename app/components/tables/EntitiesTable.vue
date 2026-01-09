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
      add-button-text="Créer une nouvelle entité"
      :has-add-button="user?.role === Role.FEEF"
      search-placeholder="Rechercher par nom, SIRET..."
      :on-row-click="handleRowClick"
      :on-delete="user?.role === Role.FEEF ? handleDelete : undefined"
      :on-create="user?.role === Role.FEEF ? handleFormReset : undefined"
      :get-item-name="(entity) => entity.name"
    >
      <template #filters="{ filters, updateFilter }">
        <div
          :class="
            user?.role === Role.FEEF
              ? 'grid grid-cols-1 md:grid-cols-4 gap-4'
              : 'grid grid-cols-1 md:grid-cols-3 gap-4'
          "
        >
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
        <UBadge
          v-if="filters.type !== null"
          variant="subtle"
          color="primary"
          size="sm"
        >
          Type: {{ getFilterLabel('type', filters.type) }}
        </UBadge>
        <UBadge
          v-if="filters.mode !== null"
          variant="subtle"
          color="secondary"
          size="sm"
        >
          Mode: {{ getFilterLabel('mode', filters.mode) }}
        </UBadge>
        <UBadge
          v-if="filters.oeId !== null"
          variant="subtle"
          color="info"
          size="sm"
        >
          OE: {{ getFilterLabel('oeId', filters.oeId) }}
        </UBadge>
        <UBadge
          v-if="filters.accountManagerId !== null"
          variant="subtle"
          color="success"
          size="sm"
        >
          Chargé: {{ getFilterLabel('accountManagerId', filters.accountManagerId) }}
        </UBadge>
      </template>

      <template
        v-if="user?.role === Role.FEEF"
        #form="{ item, isEditing }"
      >
        <UForm
          ref="form"
          :schema="schema"
          :state="state"
          class="space-y-6"
        >
          <!-- Informations générales -->
          <div class="space-y-4">
            <UFormField
              label="Nom de l'entité"
              name="name"
              required
            >
              <UInput
                v-model="state.name"
                placeholder="Ex: Entreprise ABC"
                icon="i-lucide-building"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField
                label="Type d'entité"
                name="type"
                required
              >
                <USelect
                  v-model="state.type"
                  :items="createEntityTypeItems"
                  placeholder="Sélectionner un type"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Mode de labellisation"
                name="mode"
                required
              >
                <USelect
                  v-model="state.mode"
                  :items="createEntityModeItems"
                  placeholder="Sélectionner un mode"
                  size="lg"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>

          <!-- Identifiants légaux -->
          <div class="space-y-4">
            <div
              class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              <UIcon
                name="i-lucide-file-text"
                class="size-4"
              />
              <span>Identifiants légaux</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField
                label="SIRET"
                name="siret"
                hint="14 chiffres"
              >
                <UInput
                  v-model="state.siret"
                  placeholder="12345678901234"
                  icon="i-lucide-hash"
                  size="lg"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>

          <!-- Création de compte optionnelle (Uniquement en création) -->
          <div
            v-if="!isEditing"
            class="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4"
          >
            <div class="flex items-start gap-3">
              <UCheckbox
                v-model="state.createAccount"
                name="createAccount"
                label="Créer ou associer un compte utilisateur"
                help="Si l'email existe déjà, le compte sera associé à cette entité."
              />
            </div>

            <template v-if="state.createAccount">
              <div
                class="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg space-y-4 border border-gray-200 dark:border-gray-700"
              >
                <div
                  class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  <UIcon
                    name="i-lucide-user-plus"
                    class="size-4"
                  />
                  <span>Informations du compte</span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <UFormField
                    label="Prénom"
                    name="accountFirstname"
                    required
                  >
                    <UInput
                      v-model="state.accountFirstname"
                      placeholder="Jean"
                      icon="i-lucide-user"
                      size="lg"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField
                    label="Nom"
                    name="accountLastname"
                    required
                  >
                    <UInput
                      v-model="state.accountLastname"
                      placeholder="Dupont"
                      icon="i-lucide-user"
                      size="lg"
                      class="w-full"
                    />
                  </UFormField>
                </div>

                <UFormField
                  label="Email"
                  name="accountEmail"
                  required
                >
                  <UInput
                    v-model="state.accountEmail"
                    type="email"
                    placeholder="jean.dupont@exemple.com"
                    icon="i-lucide-mail"
                    size="lg"
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  label="Rôle dans l'entité"
                  name="accountEntityRole"
                  required
                >
                  <USelect
                    v-model="state.accountEntityRole"
                    :items="entityRoleOptions"
                    value-key="value"
                    placeholder="Sélectionner un rôle"
                    size="lg"
                    class="w-full"
                  />
                </UFormField>
              </div>
            </template>
          </div>
        </UForm>
      </template>

      <template
        v-if="user?.role === Role.FEEF"
        #form-footer="{ close, item, isEditing }"
      >
        <UButton
          label="Annuler"
          color="neutral"
          variant="outline"
          @click="close"
        />
        <UButton
          :label="
            isEditing ? 'Modifier' : state.createAccount ? 'Créer Entité & Compte' : 'Créer Entité'
          "
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
  getEntityModeLabel,
  AuditStatusLabels,
  type AuditStatusType,
  type AuditTypeType,
  getAuditStatusColor,
  getAuditTypeLabel,
} from '#shared/types/enums'
import { z } from 'zod'
import { getEntityRoleOptions } from '~~/app/utils/roles'

const { user } = useAuth()

const entityRoleOptions = getEntityRoleOptions()

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

const oeItems = ref<Array<{ label: string; value: number | null }>>([
  { label: 'Tous les OE', value: null },
])
const accountManagerItems = ref<Array<{ label: string; value: number | null }>>([
  { label: 'Tous les chargés', value: null },
])

// Charger les OEs pour le filtre
const loadOEs = async () => {
  try {
    const response = await $fetch<{ data: Array<{ id: number; name: string }> }>(
      '/api/oes?limit=100'
    )
    oeItems.value = [
      { label: 'Tous les OE', value: null },
      ...response.data.map((oe) => ({ label: oe.name, value: oe.id })),
    ]
  } catch (e) {
    console.error('Erreur lors du chargement des OE:', e)
  }
}

// Charger les chargés de compte pour le filtre (uniquement rôle FEEF)
const loadAccountManagers = async () => {
  try {
    const response = await $fetch<{
      data: Array<{ id: number; firstname: string; lastname: string }>
    }>('/api/accounts?role=FEEF&limit=100')
    accountManagerItems.value = [
      { label: 'Tous les chargés', value: null },
      ...response.data.map((account) => ({
        label: `${account.firstname} ${account.lastname}`,
        value: account.id,
      })),
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
const getFilterLabel = (
  filterName: string,
  filterValue: EntityTypeType | EntityModeType | number | null
): string => {
  if (filterValue === null) return ''

  if (filterName === 'type') {
    return getEntityTypeLabel(filterValue as EntityTypeType)
  }
  if (filterName === 'mode') {
    return getEntityModeLabel(filterValue as EntityModeType)
  }
  if (filterName === 'oeId') {
    const oe = oeItems.value.find((item) => item.value === filterValue)
    return oe?.label || String(filterValue)
  }
  if (filterName === 'accountManagerId') {
    const manager = accountManagerItems.value.find((item) => item.value === filterValue)
    return manager?.label || String(filterValue)
  }
  return String(filterValue)
}

// Schéma de validation pour le formulaire
const schema = z
  .object({
    name: z
      .string()
      .min(1, 'Le nom est requis')
      .min(3, 'Le nom doit contenir au moins 3 caractères'),
    type: z.enum(['COMPANY', 'GROUP']),
    mode: z.enum(['MASTER', 'FOLLOWER']),
    siret: z
      .string()
      .min(14, 'Le SIRET doit contenir 14 chiffres')
      .max(14, 'Le SIRET doit contenir 14 chiffres')
      .regex(/^\d{14}$/, 'Le SIRET doit contenir uniquement 14 chiffres'),

    // Champs optionnels du compte
    createAccount: z.boolean().default(false),
    accountFirstname: z.string().optional(),
    accountLastname: z.string().optional(),
    accountEmail: z.string().email('Email invalide').optional().or(z.literal('')),
    accountEntityRole: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.createAccount) {
      if (!data.accountFirstname || data.accountFirstname.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Le prénom est requis (min 2 caractères)',
          path: ['accountFirstname'],
        })
      }
      if (!data.accountLastname || data.accountLastname.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Le nom est requis (min 2 caractères)',
          path: ['accountLastname'],
        })
      }
      if (!data.accountEmail) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "L'email est requis",
          path: ['accountEmail'],
        })
      }
      if (!data.accountEntityRole) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Le rôle est requis',
          path: ['accountEntityRole'],
        })
      }
    }
  })

type Schema = z.output<typeof schema>

// State du formulaire
const state = reactive({
  name: '',
  type: EntityType.COMPANY,
  mode: EntityMode.MASTER,
  siret: '',

  // Champs compte
  createAccount: false,
  accountFirstname: undefined as string | undefined,
  accountLastname: undefined as string | undefined,
  accountEmail: undefined as string | undefined,
  accountEntityRole: undefined as string | undefined,
})

const createLoading = ref(false)
const form = ref()

// Réinitialiser le formulaire (fonction appelée par PaginatedTable pour la création)
const handleFormReset = () => {
  // Réinitialiser le formulaire pour la création
  state.name = ''
  state.type = EntityType.COMPANY
  state.mode = EntityMode.MASTER
  state.siret = ''

  // Reset compte
  state.createAccount = false
  state.accountFirstname = undefined
  state.accountLastname = undefined
  state.accountEmail = undefined
  state.accountEntityRole = undefined
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

  if (state.siret) data.siret = state.siret

  // Ajouter les données du compte si demandé
  if (state.createAccount) {
    data.createAccount = true
    data.accountFirstname = state.accountFirstname
    data.accountLastname = state.accountLastname
    data.accountEmail = state.accountEmail
    data.accountEntityRole = state.accountEntityRole
  }

  const result = await createEntity(data)
  createLoading.value = false

  if (result.success) {
    // Réinitialiser le formulaire
    handleFormReset()
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
    accessorKey: 'siret',
    header: 'SIRET',
    cell: ({ row }) => row.original.siret || '-',
  },
  {
    accessorKey: 'type',
    header: "Type d'entité",
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
  {
    accessorKey: 'audits',
    header: 'Dernier audit',
    cell: ({ row }) => {
      const latestAudit = row.original.audits?.[0]

      if (!latestAudit) {
        return '-'
      }

      const statusLabel = AuditStatusLabels[latestAudit.status as AuditStatusType]
      const typeLabel = getAuditTypeLabel(latestAudit.type as AuditTypeType)
      const statusColor = getAuditStatusColor(latestAudit.status as AuditStatusType)

      const displayText = `${statusLabel} - ${typeLabel}`

      return h(
        resolveComponent('UBadge'),
        { color: statusColor, variant: 'soft', size: 'sm' },
        () => displayText
      )
    },
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
