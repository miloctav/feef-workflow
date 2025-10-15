<template>
  <UDashboardPanel id="accountsSettings">
    <template #header>
      <NavBar />
    </template>
    <template #body>
      <PaginatedTable
        :data="accounts"
        :pagination="pagination"
        :loading="fetchLoading"
        :error="fetchError"
        :columns="columns"
        :on-page-change="goToPage"
        :on-search="setSearch"
        add-button-text="Ajouter un compte"
        search-placeholder="Rechercher par nom, prénom ou email..."
        :on-delete="handleDelete"
        :get-item-name="getAccountName"
      >
        <!-- Filtre par rôle personnalisé -->
        <template #filters>
          <span class="text-sm text-gray-600">Filtrer par rôle :</span>
          <USelect
            v-model="selectedRole"
            :items="roleFilterOptions"
            value-key="value"
            placeholder="Tous les rôles"
            class="w-64"
            clearable
            @update:model-value="handleRoleFilter"
          />
        </template>

        <!-- Formulaire de création -->
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

            <UFormField label="Rôle" name="role" required>
              <USelect
                v-model="state.role"
                :items="roleFilterOptions"
                value-key="value"
                placeholder="Sélectionner un rôle"
              />
            </UFormField>
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
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { AccountWithRelations } from '~~/app/types/accounts'
import { getRoleLabel, getRoleOptions } from '~~/app/utils/roles'
import { z } from 'zod'

definePageMeta({ layout: 'dashboard-feef' })

// Composable pour gérer les comptes
const {
  accounts,
  pagination,
  fetchLoading,
  fetchError,
  goToPage,
  setSearch,
  setFilters,
  deleteAccount,
  createAccount,
} = useAccounts()

// Schéma de validation pour le formulaire
const schema = z.object({
  firstname: z.string().min(1, 'Le prénom est requis').min(2, 'Le prénom doit contenir au moins 2 caractères'),
  lastname: z.string().min(1, 'Le nom est requis').min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().min(1, 'L\'email est requis').email('L\'email doit être valide'),
  role: z.string().min(1, 'Le rôle est requis')
})

type Schema = z.output<typeof schema>

// State du formulaire
const state = reactive<Schema>({
  firstname: '',
  lastname: '',
  email: '',
  role: ''
})

const createLoading = ref(false)
const form = ref()

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
  const result = await createAccount(state)
  createLoading.value = false

  if (result.success) {
    // Réinitialiser le formulaire
    state.firstname = ''
    state.lastname = ''
    state.email = ''
    state.role = ''
    close()
  }
}

// State pour le filtre par rôle
const selectedRole = ref<string | undefined>(undefined)

// Options pour le filtre de rôle (sans l'option "Tous" car gérée par le placeholder)
const roleFilterOptions = computed(() => getRoleOptions())

// Gérer le filtre par rôle
const handleRoleFilter = (value: string | undefined) => {
  if (value) {
    setFilters({ role: value })
  } else {
    setFilters({})
  }
}

// Obtenir le nom complet du compte pour le modal de suppression
const getAccountName = (account: AccountWithRelations) => {
  return `${account.firstname} ${account.lastname}`
}

// Supprimer un compte
const handleDelete = async (account: AccountWithRelations) => {
  return await deleteAccount(account.id)
}

// Colonnes du tableau (sans la colonne actions qui est ajoutée automatiquement)
const columns: TableColumn<AccountWithRelations>[] = [
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
    header: 'Rôle',
    cell: ({ row }) => getRoleLabel(row.original.role),
  },
  {
    accessorKey: 'oe',
    header: 'Organisation',
    cell: ({ row }) => row.original.oe?.name || '-',
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
]
</script>
