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
        :on-update="handleUpdate"
        :on-create="handleFormReset"
        :can-edit="true"
        :get-item-name="(oe) => oe.name"
      >
        <template #form="{ item, isEditing }">
          <UForm ref="form" :schema="schema" :state="formState" class="space-y-4">
            <UFormField label="Nom de l'organisme évaluateur" name="name" required>
              <UInput
                v-model="formState.name"
                icon="i-lucide-building"
              />
            </UFormField>
          </UForm>
        </template>

        <template #form-footer="{ close, item, isEditing }">
          <UButton label="Annuler" color="neutral" variant="outline" @click="close" />
          <UButton
            :label="isEditing ? 'Modifier' : 'Créer'"
            color="primary"
            :loading="isEditing ? updateLoading : createLoading"
            @click="isEditing ? handleEdit(item, close) : handleCreate(close)"
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
  updateLoading,
  goToPage,
  setSearch,
  deleteOE,
  createOE,
  updateOE,
} = useOes()

// Schéma de validation pour le formulaire
const schema = z.object({
  name: z.string().min(1, 'Le nom est requis').min(3, 'Le nom doit contenir au moins 3 caractères')
})

type Schema = z.output<typeof schema>

// State unifié du formulaire (pour création et édition)
const formState = reactive<Schema>({
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
  const result = await createOE(formState)
  createLoading.value = false

  if (result.success) {
    // Réinitialiser le formulaire
    formState.name = ''
    close()
  }
}

// Réinitialiser le formulaire (fonction appelée par PaginatedTable pour la création)
const handleFormReset = () => {
  // Réinitialiser le formulaire pour la création
  formState.name = ''
}

// Mettre à jour un OE (fonction appelée par PaginatedTable pour préremplir le formulaire)
const handleUpdate = async (oe: OEWithRelations) => {
  // Pré-remplir le formulaire avec les données de l'OE
  formState.name = oe.name
  return { success: true }
}

// Modifier un OE (fonction appelée par le bouton du modal)
const handleEdit = async (oe: OEWithRelations | null, close: () => void) => {
  if (!oe) return
  
  // Valider le formulaire avant de soumettre
  try {
    await form.value.validate()
  } catch (error) {
    // Si le formulaire n'est pas valide, arrêter ici
    return
  }

  const result = await updateOE(oe.id, formState)

  if (result.success) {
    // Réinitialiser le formulaire
    formState.name = ''
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
  navigateTo(`/feef/oes/${oe.id}`)
}

// Supprimer un OE
const handleDelete = async (oe: OEWithRelations) => {
  return await deleteOE(oe.id)
}
</script>
