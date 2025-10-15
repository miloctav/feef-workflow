<template>
  <UDashboardPanel id="oe">
    <template #header>
      <NavBar />
    </template>
    <template #body>
      <PaginatedTable
        :data="oes"
        :pagination="pagination"
        :loading="fetchLoading"
        :error="fetchError"
        :columns="columns"
        :on-page-change="goToPage"
        :on-search="setSearch"
        add-button-text="Ajouter un OE"
        search-placeholder="Rechercher un organisme évaluateur..."
        :on-row-click="handleRowClick"
        :on-delete="handleDelete"
        :get-item-name="(oe) => oe.name"
      >
        <template #create-form>
          <UForm ref="form" :schema="schema" :state="state" class="space-y-4">
            <UFormField label="Nom de l'organisme évaluateur" name="name" required>
              <UInput
                v-model="state.name"
                placeholder="Ex: Bureau Veritas"
                icon="i-lucide-building"
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
import type { OEWithRelations } from '~~/app/types/oes'
import { z } from 'zod'

definePageMeta({
  layout: 'dashboard-feef',
})

// Composable pour gérer les OEs
const {
  oes,
  pagination,
  fetchLoading,
  fetchError,
  goToPage,
  setSearch,
  deleteOE,
  createOE,
} = useOes()

// Schéma de validation pour le formulaire
const schema = z.object({
  name: z.string().min(1, 'Le nom est requis').min(3, 'Le nom doit contenir au moins 3 caractères')
})

type Schema = z.output<typeof schema>

// State du formulaire
const state = reactive<Schema>({
  name: ''
})

const createLoading = ref(false)
const form = ref()

// Créer un OE
const handleCreate = async (close: () => void) => {
  // Valider le formulaire avant de soumettre
  try {
    await form.value.validate()
  } catch (error) {
    // Si le formulaire n'est pas valide, arrêter ici
    return
  }

  createLoading.value = true
  const result = await createOE(state)
  createLoading.value = false

  if (result.success) {
    // Réinitialiser le formulaire
    state.name = ''
    close()
  }
}

// Colonnes du tableau (sans la colonne actions qui est ajoutée automatiquement)
const columns: TableColumn<OEWithRelations>[] = [
  {
    accessorKey: 'name',
    header: 'Nom de l\'organisme',
    cell: ({ row }) => row.original.name,
  },
  {
    accessorKey: 'createdAt',
    header: 'Date de création',
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
]

// Navigation vers le détail d'un OE au clic sur une ligne
const handleRowClick = (oe: OEWithRelations) => {
  navigateTo(`/feef/oe/${oe.id}`)
}

// Supprimer un OE
const handleDelete = async (oe: OEWithRelations) => {
  return await deleteOE(oe.id)
}
</script>
