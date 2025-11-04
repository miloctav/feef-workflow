<template>
  <UDashboardPanel id="documentsSettings">
    <template #header>
      <NavBar />
    </template>
    <template #body>
      <div class="w-full space-y-6 pb-4">
        <!-- En-tête -->
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Documents types</h1>
          <p class="text-gray-600 dark:text-gray-300 mt-1">
            Gérer les documents types demandés aux entreprises
          </p>
        </div>

        <!-- Tableau paginé -->
        <PaginatedTable
          has-filters
          filters-title="Filtres documents"
          :on-filters-change="handleFiltersChange"
          :data="documentsType"
          :pagination="pagination"
          :loading="fetchLoading"
          :error="fetchError"
          :columns="columns"
          :on-page-change="goToPage"
          :on-search="setSearch"
          add-button-text="Ajouter un document type"
          search-placeholder="Rechercher un document type..."
          :on-delete="handleDelete"
          :on-create="handleFormReset"
          :on-update="handleUpdate"
          :can-edit="true"
          :get-item-name="(doc) => doc.title"
        >
          <!-- Filtres personnalisés -->
          <template #filters="{ filters, updateFilter }">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FilterSelect
                label="Catégorie"
                :model-value="filters.category"
                @update:model-value="updateFilter('category', $event)"
                :items="categoryFilterOptions"
                placeholder="Toutes les catégories"
              />
              <FilterSelect
                label="Demande automatique"
                :model-value="filters.autoAsk"
                @update:model-value="updateFilter('autoAsk', $event)"
                :items="autoAskFilterOptions"
                placeholder="Tous"
              />
            </div>
          </template>

          <template #filter-badges="{ filters }">
            <UBadge v-if="filters.category !== null" variant="subtle" color="primary" size="sm">
              Catégorie: {{ getCategoryLabel(filters.category) }}
            </UBadge>
            <UBadge v-if="filters.autoAsk !== null" variant="subtle" color="success" size="sm">
              Demande auto: {{ filters.autoAsk === 'true' ? 'Oui' : 'Non' }}
            </UBadge>
          </template>
          <template #form="{ item, isEditing }">
            <UForm ref="form" :schema="schema" :state="state" class="space-y-4">
              <UFormField label="Titre du document" name="title" required>
                <UInput
                  v-model="state.title"
                  placeholder="Ex: Attestation sur l'honneur"
                  icon="i-lucide-file-text"
                />
              </UFormField>

              <UFormField label="Description" name="description">
                <UTextarea
                  v-model="state.description"
                  placeholder="Description du document..."
                  :rows="3"
                />
              </UFormField>

              <UFormField label="Catégorie" name="category" required>
                <USelect
                  v-model="state.category"
                  :items="categoryOptions"
                  value-key="value"
                  placeholder="Sélectionner une catégorie"
                />
              </UFormField>

              <UFormField label="Demander automatiquement" name="autoAsk">
                <UCheckbox
                  v-model="state.autoAsk"
                  label="Demander ce document automatiquement aux entreprises"
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
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { DocumentTypeWithRelations } from '~~/app/types/documents-type'
import { z } from 'zod'
import { h, resolveComponent } from 'vue'

definePageMeta({
  layout: 'dashboard-feef',
})

const UBadge = resolveComponent('UBadge')

// Composable pour gérer les documents types
const {
  documentsType,
  pagination,
  fetchLoading,
  fetchError,
  updateLoading,
  goToPage,
  setSearch,
  setFilters,
  deleteDocumentType,
  createDocumentType,
  updateDocumentType,
  fetchDocumentsType,
} = useDocumentsType()

onMounted(() => {
  fetchDocumentsType()
})

// Options de catégories pour le formulaire de création
const categoryOptions = [
  { value: 'LEGAL', label: 'Légal' },
  { value: 'FINANCIAL', label: 'Financier' },
  { value: 'TECHNICAL', label: 'Technique' },
  { value: 'OTHER', label: 'Autre' },
]

// Options de catégories pour les filtres (avec option "Tous")
const categoryFilterOptions = [
  { value: null, label: 'Toutes les catégories' },
  ...categoryOptions,
]

// Options pour le filtre demande automatique
const autoAskFilterOptions = [
  { value: null, label: 'Tous' },
  { value: 'true', label: 'Oui' },
  { value: 'false', label: 'Non' },
]

// Map pour afficher les catégories en français
const categoryLabels: Record<string, string> = {
  LEGAL: 'Légal',
  FINANCIAL: 'Financier',
  TECHNICAL: 'Technique',
  OTHER: 'Autre',
}

// Map pour les couleurs des badges de catégorie
const categoryColors: Record<string, string> = {
  LEGAL: 'primary',
  FINANCIAL: 'success',
  TECHNICAL: 'warning',
  OTHER: 'neutral',
}

// Schéma de validation pour le formulaire
const schema = z.object({
  title: z.string().min(1, 'Le titre est requis').min(3, 'Le titre doit contenir au moins 3 caractères'),
  description: z.string().optional(),
  category: z.enum(['LEGAL', 'FINANCIAL', 'TECHNICAL', 'OTHER'], {
    message: 'La catégorie est requise',
  }),
  autoAsk: z.boolean().optional(),
})

type Schema = z.output<typeof schema>

// State unifié du formulaire (pour création et édition)
const state = reactive<Schema>({
  title: '',
  description: '',
  category: 'LEGAL',
  autoAsk: false,
})

const createLoading = ref(false)
const form = ref()

// Réinitialiser le formulaire (fonction appelée par PaginatedTable pour la création)
const handleFormReset = () => {
  // Réinitialiser le formulaire pour la création
  state.title = ''
  state.description = ''
  state.category = 'LEGAL'
  state.autoAsk = false
}

// Mettre à jour un document type (fonction appelée par PaginatedTable pour préremplir le formulaire)
const handleUpdate = async (doc: DocumentTypeWithRelations) => {
  // Pré-remplir le formulaire avec les données du document
  state.title = doc.title
  state.description = doc.description || ''
  state.category = doc.category
  state.autoAsk = doc.autoAsk || false
  return { success: true }
}

// Modifier un document type (fonction appelée par le bouton du modal)
const handleEdit = async (doc: DocumentTypeWithRelations | null, close: () => void) => {
  if (!doc) return
  
  // Valider le formulaire avant de soumettre
  try {
    await form.value.validate()
  } catch (error) {
    // Si le formulaire n'est pas valide, arrêter ici
    return
  }

  const result = await updateDocumentType(doc.id, state)

  if (result.success) {
    // Réinitialiser le formulaire
    state.title = ''
    state.description = ''
    state.category = 'LEGAL'
    state.autoAsk = false
    close()
  }
}

// Créer un document type
const handleCreate = async (close: () => void) => {
  // Valider le formulaire avant de soumettre
  try {
    await form.value.validate()
  } catch (error) {
    // Si le formulaire n'est pas valide, arrêter ici
    return
  }

  createLoading.value = true
  const result = await createDocumentType(state)
  createLoading.value = false

  if (result.success) {
    // Réinitialiser le formulaire
    state.title = ''
    state.description = ''
    state.category = 'LEGAL'
    state.autoAsk = false
    close()
  }
}

// Colonnes du tableau (sans la colonne actions qui est ajoutée automatiquement)
const columns: TableColumn<DocumentTypeWithRelations>[] = [
  {
    accessorKey: 'title',
    header: 'Titre',
    cell: ({ row }) => row.original.title,
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => h('div', {
      class: 'max-w-md truncate',
      title: row.original.description || ''
    }, row.original.description || '-'),
  },
  {
    accessorKey: 'category',
    header: 'Catégorie',
    cell: ({ row }) => {
      const category = row.original.category
      return h(UBadge, {
        variant: 'subtle',
        color: categoryColors[category] || 'neutral',
        size: 'sm'
      }, () => categoryLabels[category] || category)
    },
  },
  {
    accessorKey: 'autoAsk',
    header: 'Demande auto',
    cell: ({ row }) => {
      return h(UBadge, {
        variant: 'subtle',
        color: row.original.autoAsk ? 'success' : 'neutral',
        size: 'sm'
      }, () => row.original.autoAsk ? 'Oui' : 'Non')
    },
  },
]

// Supprimer un document type
const handleDelete = async (doc: DocumentTypeWithRelations) => {
  return await deleteDocumentType(doc.id)
}

// Gérer les changements de filtres depuis PaginatedTable
const handleFiltersChange = (newFilters: Record<string, any>) => {
  setFilters(newFilters)
}

// Obtenir le label d'une catégorie pour l'affichage
const getCategoryLabel = (category: string | null): string => {
  if (!category) return ''
  return categoryLabels[category] || category
}
</script>
