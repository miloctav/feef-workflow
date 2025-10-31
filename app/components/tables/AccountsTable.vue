<template>
  <div class="w-full space-y-4">
    <!-- Table paginée -->
    <PaginatedTable
      :has-filters="hasFilters && showFiltersCard"
      filters-title="Filtres comptes"
      :on-filters-change="handleFiltersChange"
      :data="accounts"
      :pagination="pagination"
      :loading="fetchLoading"
      :error="fetchError"
      :columns="columns"
      :has-add-button="true"
      add-button-text="Ajouter un compte"
      :on-page-change="goToPage"
      :on-search="setSearch"
      :search-placeholder="searchPlaceholder"
      :on-delete="allowDelete ? handleDelete : undefined"
      :get-item-name="(account) => `${account.firstname} ${account.lastname}`"
    >
      <template #filters="{ filters, updateFilter }">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Filtre par rôle dans l'entité (mode entityId) -->
          <FilterSelect
            v-if="entityId"
            label="Rôle dans l'entité"
            :model-value="filters.entityRole"
            @update:model-value="updateFilter('entityRole', $event)"
            :items="entityRoleItems"
            placeholder="Tous les rôles"
          />
          <!-- Filtre par rôle dans l'OE (mode oeId) -->
          <FilterSelect
            v-else-if="oeId"
            label="Rôle dans l'OE"
            :model-value="filters.oeRole"
            @update:model-value="updateFilter('oeRole', $event)"
            :items="oeRoleItems"
            placeholder="Tous les rôles"
          />
          <!-- Filtre par rôle global (mode sans entityId ni oeId) -->
          <FilterSelect
            v-else
            label="Rôle global"
            :model-value="filters.role"
            @update:model-value="updateFilter('role', $event)"
            :items="roleFilterItems"
            placeholder="Tous les rôles"
          />
        </div>
      </template>

      <template #filter-badges="{ filters }">
        <UBadge v-if="filters.entityRole !== null" variant="subtle" color="primary" size="sm">
          Rôle entité: {{ getFilterLabel('entityRole', filters.entityRole) }}
        </UBadge>
        <UBadge v-if="filters.oeRole !== null" variant="subtle" color="primary" size="sm">
          Rôle OE: {{ getFilterLabel('oeRole', filters.oeRole) }}
        </UBadge>
        <UBadge v-if="filters.role !== null" variant="subtle" color="primary" size="sm">
          Rôle: {{ getFilterLabel('role', filters.role) }}
        </UBadge>
      </template>

      <template #create-form>
        <UForm ref="form" :schema="schema" :state="state" class="space-y-4">
          <UFormField label="Prénom" name="firstname" required>
            <UInput
              v-model="state.firstname"
              placeholder="Ex: Jean"
              icon="i-lucide-user"
            />
          </UFormField>

          <UFormField label="Nom" name="lastname" required>
            <UInput
              v-model="state.lastname"
              placeholder="Ex: Dupont"
              icon="i-lucide-user"
            />
          </UFormField>

          <UFormField label="Email" name="email" required>
            <UInput
              v-model="state.email"
              type="email"
              placeholder="Ex: jean.dupont@example.com"
              icon="i-lucide-mail"
            />
          </UFormField>

          <UFormField label="Rôle global" name="role" required>
            <USelect
              v-model="state.role"
              :items="availableRoleOptions"
              value-key="value"
              placeholder="Sélectionner un rôle"
              :disabled="!!forcedRole"
            />
          </UFormField>

          <!-- Champs spécifiques au rôle OE -->
          <template v-if="state.role === 'OE'">
            <UFormField v-if="!oeId" label="Organisme Évaluateur" name="oeId" required>
              <USelect
                v-model="state.oeId"
                :items="oesList"
                value-key="value"
                placeholder="Sélectionner un OE"
              />
            </UFormField>

            <UFormField label="Rôle dans l'OE" name="oeRole" required>
              <USelect
                v-model="state.oeRole"
                :items="oeRoleCreateOptions"
                value-key="value"
                placeholder="Sélectionner un rôle"
              />
            </UFormField>
          </template>

          <!-- Champs spécifiques au rôle ENTITY -->
          <template v-if="state.role === 'ENTITY'">
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Entités associées
                </label>
                <UButton
                  v-if="!entityId"
                  size="xs"
                  color="primary"
                  variant="soft"
                  icon="i-heroicons-plus"
                  @click="addEntityRole"
                >
                  Ajouter une entité
                </UButton>
              </div>

              <div
                v-for="(entityRole, index) in state.entityRoles"
                :key="index"
                class="flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div class="flex-1 grid grid-cols-2 gap-2">
                  <UFormField :label="`Entité ${index + 1}`" :name="`entityRoles.${index}.entityId`" required>
                    <USelect
                      v-model="entityRole.entityId"
                      :items="entitiesList"
                      value-key="value"
                      placeholder="Sélectionner une entité"
                      :disabled="!!entityId"
                    />
                  </UFormField>

                  <UFormField label="Rôle" :name="`entityRoles.${index}.role`" required>
                    <USelect
                      v-model="entityRole.role"
                      :items="entityRoleCreateOptions"
                      value-key="value"
                      placeholder="Sélectionner un rôle"
                    />
                  </UFormField>
                </div>

                <UButton
                  v-if="!entityId && state.entityRoles && state.entityRoles.length > 1"
                  size="sm"
                  color="error"
                  variant="ghost"
                  icon="i-heroicons-trash"
                  @click="removeEntityRole(index)"
                />
              </div>
            </div>
          </template>

          <!-- Champs spécifiques au rôle AUDITOR -->
          <template v-if="state.role === 'AUDITOR'">
            <!-- En mode OE, l'OE est automatiquement lié (pas besoin de sélection) -->
            <UFormField v-if="!oeId" label="Organismes Évaluateurs" name="oeIds" required>
              <USelectMenu
                v-model="state.oeIds"
                :items="oesList"
                value-key="value"
                multiple
                placeholder="Sélectionner un ou plusieurs OEs"
              />
            </UFormField>
          </template>
        </UForm>
      </template>

      <template #create-footer="{ close }">
        <UButton label="Annuler" color="neutral" variant="outline" @click="close" />
        <UButton
          label="Créer"
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
import type { AccountWithRelations } from '~~/app/types/accounts'
import {
  getRoleLabel,
  getRoleOptions,
  getEntityRoleLabel,
  getEntityRoleOptions,
  getOERoleLabel,
  getOERoleOptions,
} from '~~/app/utils/roles'
import { Role, EntityRole, type EntityRoleType, type RoleType, type OERoleType } from '#shared/types/roles'
import { EntityMode } from '#shared/types/enums'
import { z } from 'zod'

const props = withDefaults(defineProps<{
  hasFilters?: boolean
  entityId?: number
  oeId?: number
  allowDelete?: boolean
}>(), {
  hasFilters: true,
  allowDelete: false
})

const { user } = useAuth()

// Composable pour gérer les comptes (avec entityId si fourni)
const {
  accounts,
  pagination,
  fetchLoading,
  fetchError,
  goToPage,
  setSearch,
  setFilters,
  deleteAccount,
  removeAccountFromEntity,
  createAccount,
  fetchAccounts,
} = useAccounts()

// Composables pour charger les listes d'OEs et entités
const { fetchOesForSelect } = useOes()
const { fetchEntitiesForSelect } = useEntities()

// Listes pour les selects
const oesList = ref<Array<{ label: string; value: number | null }>>([])
const entitiesList = ref<Array<{ label: string; value: number | null }>>([])

// Items pour les filtres avec labels en français
const entityRoleItems = ref<Array<{ label: string; value: EntityRoleType | null }>>([
  { label: 'Tous les rôles', value: null },
  ...getEntityRoleOptions().map(opt => ({ label: opt.label, value: opt.value as EntityRoleType })),
])

const oeRoleItems = ref<Array<{ label: string; value: OERoleType | null }>>([
  { label: 'Tous les rôles', value: null },
  ...getOERoleOptions().map(opt => ({ label: opt.label, value: opt.value as OERoleType })),
])

const roleFilterItems = ref<Array<{ label: string; value: RoleType | null }>>([
  { label: 'Tous les rôles', value: null },
  ...(getRoleOptions() as Array<{ label: string; value: RoleType }>),
])

// Items pour le formulaire de création (sans l'option "Tous")
const entityRoleCreateOptions = getEntityRoleOptions()
const oeRoleCreateOptions = getOERoleOptions()
const roleOptions = getRoleOptions()

// Options de rôle filtrées selon le contexte
const availableRoleOptions = computed(() => {
  // En mode OE : limiter aux rôles OE et AUDITOR
  if (props.oeId) {
    return roleOptions.filter(opt => opt.value === Role.OE || opt.value === Role.AUDITOR)
  }
  // En mode Entity : limiter au rôle ENTITY
  if (props.entityId) {
    return roleOptions.filter(opt => opt.value === Role.ENTITY)
  }
  // Mode général : tous les rôles disponibles
  return roleOptions
})

// Afficher la carte de filtres si on a des filtres à afficher
const showFiltersCard = computed(() => {
  return props.entityId !== undefined || !props.entityId
})

// Charger les données au montage du composant
onMounted(async () => {
  // Appliquer le filtre entityId si fourni en props
  if (props.entityId) {
    setFilters({ entityId: props.entityId })
  }

  // Appliquer le filtre oeId si fourni en props
  if (props.oeId) {
    setFilters({ oeId: props.oeId })
  }

  // Charger les listes pour les selects (sans l'option "Tous")
  // Pour les entités, charger uniquement les entités MASTER (seules elles peuvent avoir des comptes)
  oesList.value = await fetchOesForSelect({ includeAll: false })
  entitiesList.value = await fetchEntitiesForSelect({ includeAll: false, mode: EntityMode.MASTER })

  // Charger la liste des comptes
  fetchAccounts()
})

// Gérer les changements de filtres depuis PaginatedTable
const handleFiltersChange = (newFilters: Record<string, any>) => {
  const activeFilters: Record<string, any> = { ...newFilters }

  // Préserver le filtre entityId si fourni en props
  if (props.entityId) {
    activeFilters.entityId = props.entityId
  }

  // Préserver le filtre oeId si fourni en props
  if (props.oeId) {
    activeFilters.oeId = props.oeId
  }

  setFilters(activeFilters)
}

// Obtenir le label d'un filtre pour l'affichage
const getFilterLabel = (filterName: string, filterValue: EntityRoleType | OERoleType | RoleType | null): string => {
  if (filterValue === null) return ''

  if (filterName === 'entityRole') {
    return getEntityRoleLabel(filterValue as EntityRoleType)
  }
  if (filterName === 'oeRole') {
    return getOERoleLabel(filterValue as OERoleType)
  }
  if (filterName === 'role') {
    return getRoleLabel(filterValue as RoleType)
  }
  return String(filterValue)
}

// Placeholder de recherche dynamique
const searchPlaceholder = computed(() => {
  return props.entityId || props.oeId
    ? 'Rechercher un compte...'
    : 'Rechercher par nom, prénom ou email...'
})

// Colonnes du tableau (dynamiques selon les props)
const columns = computed(() => {
  const allColumns: TableColumn<AccountWithRelations>[] = [
    {
      accessorKey: 'name',
      header: 'Nom complet',
      cell: ({ row }) => {
        const account = row.original
        return `${account.firstname} ${account.lastname}`
      },
    },
    {
      accessorKey: 'email',
      header: 'Adresse mail',
    },
    {
      accessorKey: 'role',
      header: 'Rôle global',
      cell: ({ row }) => {
        const role = row.original.role
        const label = getRoleLabel(role)
        return h(resolveComponent('UBadge'), { color: 'neutral', variant: 'soft', size: 'sm' }, () => label)
      },
    },
  ]

  // Colonne pour les sous-rôles (mode général, entityId ou oeId spécifique)
  if (props.entityId) {
    // Mode entityId : afficher le rôle dans l'entité
    allColumns.push({
      accessorKey: 'entityRole',
      header: 'Rôle dans l\'entité',
      cell: ({ row }) => {
        const account = row.original
        // Trouver la relation avec l'entité actuelle
        const entityRelation = account.accountsToEntities?.find(
          (rel) => rel.entityId === props.entityId
        )

        if (entityRelation) {
          const label = getEntityRoleLabel(entityRelation.role)
          const color = entityRelation.role === EntityRole.SIGNATORY ? 'primary' : 'success'
          return h(resolveComponent('UBadge'), { color, variant: 'soft', size: 'sm' }, () => label)
        }

        return '-'
      },
    })
  } else if (props.oeId) {
    // Mode oeId : afficher le rôle dans l'OE
    allColumns.push({
      accessorKey: 'oeRole',
      header: 'Rôle dans l\'OE',
      cell: ({ row }) => {
        const account = row.original
        const oeRole = account.oeRole

        if (oeRole) {
          const label = getOERoleLabel(oeRole)
          return h(resolveComponent('UBadge'), { color: 'primary', variant: 'soft', size: 'sm' }, () => label)
        }

        return '-'
      },
    })
  } else {
    // Mode général : afficher le sous-rôle selon le rôle global
    allColumns.push({
      accessorKey: 'subRole',
      header: 'Sous-rôle / Organisation',
      cell: ({ row }) => {
        const account = row.original

        // Si le compte est un OE, afficher son oeRole
        if (account.role === Role.OE && account.oeRole) {
          const label = getOERoleLabel(account.oeRole)
          return h(resolveComponent('UBadge'), { color: 'primary', variant: 'soft', size: 'sm' }, () => label)
        }

        // Si le compte est une ENTITY, afficher le nombre d'entités associées
        if (account.role === Role.ENTITY && account.accountsToEntities) {
          const count = account.accountsToEntities.length
          const text = count === 1 ? '1 entité' : `${count} entités`
          return h(resolveComponent('UBadge'), { color: 'neutral', variant: 'soft', size: 'sm' }, () => text)
        }

        // Si le compte est un AUDITOR, afficher les OEs associés
        if (account.role === Role.AUDITOR && account.auditorsToOE) {
          const count = account.auditorsToOE.length
          if (count === 0) {
            return h(resolveComponent('UBadge'), { color: 'gray', variant: 'soft', size: 'sm' }, () => 'Aucun OE')
          }
          const text = count === 1 ? '1 OE' : `${count} OEs`
          return h(resolveComponent('UBadge'), { color: 'blue', variant: 'soft', size: 'sm' }, () => text)
        }

        return '-'
      },
    })
  }

  // Ajouter les colonnes communes
  allColumns.push(
    {
      accessorKey: 'oe',
      header: 'Organisation',
      cell: ({ row }) => {
        const account = row.original

        // Pour les auditeurs, afficher les OEs associés
        if (account.role === Role.AUDITOR && account.auditorsToOE && account.auditorsToOE.length > 0) {
          const oeNames = account.auditorsToOE.map(rel => rel.oe?.name).filter(Boolean).join(', ')
          return oeNames || '-'
        }

        // Pour les autres rôles, afficher l'OE directement lié
        return account.oe?.name || '-'
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Statut',
      cell: ({ row }) => {
        return row.original.isActive
          ? h('span', { class: 'text-green-600 font-medium' }, 'Actif')
          : h('span', { class: 'text-gray-500' }, 'Inactif')
      },
      meta: { class: { td: 'text-center', th: 'text-center' } },
    },
    {
      accessorKey: 'createdAt',
      header: 'Date de création',
      cell: ({ row }) => formatDate(row.original.createdAt),
    }
  )

  return allColumns
})

// Forcer le rôle selon les props fournis
// Note: En mode OE (props.oeId), on ne force pas le rôle pour permettre
// la création de comptes OE et AUDITOR
const forcedRole = computed(() => {
  if (props.entityId) return Role.ENTITY
  return null
})

// Schéma de validation pour le formulaire (dynamique selon le rôle)
const schema = computed(() => {
  const baseSchema = {
    firstname: z.string().min(1, 'Le prénom est requis').min(2, 'Le prénom doit contenir au moins 2 caractères'),
    lastname: z.string().min(1, 'Le nom est requis').min(2, 'Le nom doit contenir au moins 2 caractères'),
    email: z.string().min(1, 'L\'email est requis').email('L\'email doit être valide'),
    role: z.string().min(1, 'Le rôle est requis'),
  }

  const selectedRole = forcedRole.value || state.role

  // Si le rôle est ENTITY
    if (selectedRole === Role.ENTITY) {
    return z.object({
      ...baseSchema,
      entityRoles: z.array(z.object({
        entityId: z.number().positive('L\'entité est requise'),
        role: z.string().min(1, 'Le rôle dans l\'entité est requis')
      })).min(1, 'Au moins une entité doit être sélectionnée')
    })
  }

  // Si le rôle est OE
  if (selectedRole === Role.OE) {
    return z.object({
      ...baseSchema,
      oeId: z.number().positive('L\'OE est requis'),
      oeRole: z.string().min(1, 'Le rôle dans l\'OE est requis')
    })
  }

  // Si le rôle est AUDITOR
  if (selectedRole === Role.AUDITOR) {
    return z.object({
      ...baseSchema,
      oeIds: z.array(z.number().positive('L\'OE doit être valide')).min(1, 'Au moins un OE doit être sélectionné')
    })
  }

  return z.object(baseSchema)
})

type Schema = {
  firstname: string
  lastname: string
  email: string
  role: string
  oeId?: number | null
  oeRole?: string
  oeIds?: number[]
  entityRoles?: Array<{
    entityId: number | null
    role: string
  }>
}

// State du formulaire
const state = reactive<Schema>({
  firstname: '',
  lastname: '',
  email: '',
  role: forcedRole.value || '',
  oeId: props.oeId,
  oeRole: '',
  oeIds: props.oeId ? [props.oeId] : [],
  entityRoles: props.entityId ? [{ entityId: props.entityId, role: '' }] : []
})

// Watcher pour forcer le rôle quand les props changent
watch(() => forcedRole.value, (newRole) => {
  if (newRole) {
    state.role = newRole
  }
}, { immediate: true })

// Watcher pour réinitialiser les champs quand le rôle change
watch(() => state.role, (newRole, oldRole) => {
  // Ne rien faire si c'est la première initialisation
  if (!oldRole) return

  // Réinitialiser les champs OE si on ne sélectionne plus OE
  if (oldRole === Role.OE && newRole !== Role.OE) {
    // Ne pas réinitialiser oeId si on est en mode OE (props.oeId fourni)
    if (!props.oeId) {
      state.oeId = undefined
    }
    state.oeRole = ''
  }

  // Réinitialiser les champs ENTITY si on ne sélectionne plus ENTITY
  if (oldRole === Role.ENTITY && newRole !== Role.ENTITY) {
    state.entityRoles = []
  }

  // Réinitialiser les champs AUDITOR si on ne sélectionne plus AUDITOR
  if (oldRole === Role.AUDITOR && newRole !== Role.AUDITOR) {
    // En mode OE, garder props.oeId dans oeIds
    state.oeIds = props.oeId ? [props.oeId] : []
  }

  // Initialiser les champs selon le nouveau rôle
  if (newRole === Role.ENTITY && (!state.entityRoles || state.entityRoles.length === 0)) {
    state.entityRoles = props.entityId
      ? [{ entityId: props.entityId, role: '' }]
      : [{ entityId: null as any, role: '' }] // Au moins une ligne pour une meilleure UX
  }

  if (newRole === Role.OE && !state.oeId) {
    state.oeId = props.oeId
  }

  if (newRole === Role.AUDITOR && (!state.oeIds || state.oeIds.length === 0)) {
    state.oeIds = props.oeId ? [props.oeId] : []
  }
})

const createLoading = ref(false)
const form = ref()

// Ajouter une entité au tableau
const addEntityRole = () => {
  if (!state.entityRoles) {
    state.entityRoles = []
  }
  state.entityRoles.push({
    entityId: null as any, // Sera converti en number par le select
    role: ''
  })
}

// Retirer une entité du tableau
const removeEntityRole = (index: number) => {
  if (state.entityRoles) {
    state.entityRoles.splice(index, 1)
  }
}

// Créer un compte
const handleCreate = async (close: () => void) => {
  // Valider le formulaire avant de soumettre
  try {
    await form.value.validate()
  } catch (error) {
    // Si le formulaire n'est pas valide, arrêter ici
    return
  }

  createLoading.value = true

  // Préparer les données avec entityRoles ou oeId/oeRole au format attendu par l'API
  const accountData: any = {
    firstname: state.firstname,
    lastname: state.lastname,
    email: state.email,
    role: state.role,
  }

  // Si le rôle est ENTITY, ajouter entityRoles
  if (state.role === Role.ENTITY && state.entityRoles && state.entityRoles.length > 0) {
    accountData.entityRoles = state.entityRoles
  }

  // Si le rôle est OE, ajouter oeId et oeRole
  if (state.role === Role.OE) {
    accountData.oeId = state.oeId
    accountData.oeRole = state.oeRole
  }

  // Si le rôle est AUDITOR, ajouter oeIds
  if (state.role === Role.AUDITOR && state.oeIds && state.oeIds.length > 0) {
    accountData.oeIds = state.oeIds
  }

  const result = await createAccount(accountData)
  createLoading.value = false

  if (result.success) {
    // Réinitialiser le formulaire
    state.firstname = ''
    state.lastname = ''
    state.email = ''
    state.role = forcedRole.value || ''
    state.oeId = props.oeId
    state.oeRole = ''
    state.oeIds = props.oeId ? [props.oeId] : []
    state.entityRoles = props.entityId ? [{ entityId: props.entityId, role: '' }] : []
    close()
  }
}

// Supprimer un compte (ou plutôt l'association si entityId est fourni)
const handleDelete = async (account: AccountWithRelations) => {
  if (props.entityId) {
    // Supprimer uniquement l'association compte-entité
    return await removeAccountFromEntity(account.id, props.entityId)
  }
  // Pour oeId ou mode général : supprimer le compte complètement (soft delete)
  return await deleteAccount(account.id)
}
</script>
