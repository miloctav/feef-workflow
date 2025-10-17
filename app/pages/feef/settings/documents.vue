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
          :get-item-name="(doc) => doc.title"
        >
          <!-- Filtres personnalisés -->
          <template #filters>
            <FilterSelect
              v-model="selectedCategory"
              :items="categoryOptions"
              value-key="value"
              placeholder="Toutes les catégories"
              class="w-64"
              clearable
              @update:model-value="handleCategoryFilter"
            />
            <FilterSelect
              v-model="selectedAutoAsk"
              :items="autoAskOptions"
              value-key="value"
              placeholder="Demande auto"
              class="w-48"
              clearable
              @update:model-value="handleAutoAskFilter"
            />
          </template>
          <template #create-form>
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
  goToPage,
  setSearch,
  setFilters,
  deleteDocumentType,
  createDocumentType,
  fetchDocumentsType,
} = useDocumentsType()

// State pour les filtres
const selectedCategory = ref<string | undefined>(undefined)
const selectedAutoAsk = ref<string | undefined>(undefined)

onMounted(() => {
  fetchDocumentsType()
})

// Options de catégories avec labels en français
const categoryOptions = [
  { value: 'LEGAL', label: 'Légal' },
  { value: 'FINANCIAL', label: 'Financier' },
  { value: 'TECHNICAL', label: 'Technique' },
  { value: 'OTHER', label: 'Autre' },
]

// Options pour le filtre demande automatique
const autoAskOptions = [
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
    errorMap: () => ({ message: 'La catégorie est requise' }),
  }),
  autoAsk: z.boolean().optional(),
})

type Schema = z.output<typeof schema>

// State du formulaire
const state = reactive<Schema>({
  title: '',
  description: '',
  category: 'LEGAL',
  autoAsk: false,
})

const createLoading = ref(false)
const form = ref()

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

// Gérer le filtre par catégorie
const handleCategoryFilter = (value: string | undefined) => {
  const filters: Record<string, string> = {}

  if (value) {
    filters.category = value
  }

  // Conserver le filtre autoAsk s'il est actif
  if (selectedAutoAsk.value) {
    filters.autoAsk = selectedAutoAsk.value
  }

  setFilters(filters)
}

// Gérer le filtre par demande automatique
const handleAutoAskFilter = (value: string | undefined) => {
  const filters: Record<string, string> = {}

  // Conserver le filtre category s'il est actif
  if (selectedCategory.value) {
    filters.category = selectedCategory.value
  }

  if (value) {
    filters.autoAsk = value
  }

  setFilters(filters)
}
</script>
