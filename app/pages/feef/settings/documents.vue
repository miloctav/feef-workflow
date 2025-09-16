<script setup lang="ts">
import { h, resolveComponent } from "vue";
import type { TableColumn } from "@nuxt/ui";
import { DOCUMENTS, labelingCaseState, type Documents } from "~/utils/data";

definePageMeta({
  layout: "dashboard-feef",
});

const UBadge = resolveComponent('UBadge');
const UButton = resolveComponent('UButton');
const UDropdownMenu = resolveComponent('UDropdownMenu');

// État des documents (copie modifiable) - filtrés pour candidature et engagement uniquement
const documents = ref<Documents[]>([
  ...DOCUMENTS.filter(doc => 
    doc.labelingCaseState === labelingCaseState.candidacy || 
    doc.labelingCaseState === labelingCaseState.engagement
  )
]);

// État des modals
const showAddModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const selectedDocument = ref<Documents | null>(null);

// Formulaire pour nouveau/édition de document
const documentForm = ref({
  id: '',
  name: '',
  description: '',
  labelingCaseState: labelingCaseState.candidacy as string,
  isAvailable: false,
  dateLimiteDepot: ''
});

// Colonnes du tableau
const columns: TableColumn<Documents>[] = [
  {
    accessorKey: "name",
    header: "Nom du document",
    cell: ({ row }) => row.original.name,
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => h('div', { 
      class: 'max-w-md truncate',
      title: row.original.description 
    }, row.original.description),
  },
  {
    accessorKey: "labelingCaseState",
    header: "Phase",
    cell: ({ row }) => {
      const state = row.original.labelingCaseState;
      const colorMap = {
        'CANDIDATURE': 'neutral',
        'ENGAGEMENT': 'warning'
      };
      return h(UBadge, {
        variant: 'subtle',
        color: colorMap[state as keyof typeof colorMap] || 'neutral',
        size: 'sm'
      }, () => state);
    },
  },
  {
    accessorKey: "dateLimiteDepot",
    header: "Date limite",
    cell: ({ row }) => row.original.dateLimiteDepot || '-',
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const items = [{
        type: 'label',
        label: 'Actions'
      }, {
        label: 'Modifier',
        icon: 'i-heroicons-pencil',
        onSelect() {
          editDocument(row.original);
        }
      }, {
        type: 'separator'
      }, {
        label: 'Supprimer',
        icon: 'i-heroicons-trash',
        color: 'error',
        onSelect() {
          deleteDocument(row.original);
        }
      }];

      return h('div', { class: 'text-right' }, h(UDropdownMenu, {
        'content': { align: 'end' },
        items,
        'aria-label': 'Actions du document'
      }, () => h(UButton, {
        'icon': 'i-heroicons-ellipsis-vertical',
        'color': 'neutral',
        'variant': 'ghost',
        'size': 'sm',
        'aria-label': 'Actions'
      })));
    }
  }
];

// Fonctions CRUD
function addDocument() {
  
}

function editDocument(document: Documents) {
  
}

function deleteDocument(document: Documents) {
  
}

</script>

<template>
  <UDashboardPanel id="documentsSettings">
    <template #header>
      <NavBar />
    </template>

    <template #body>
      <div class="w-full space-y-6 pb-4">
        <!-- En-tête avec bouton d'ajout -->
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Documents requis</h1>
            <p class="text-gray-600 dark:text-gray-300 mt-1">
              Gérer les documents demandés aux entreprises pour les phases Candidature et Engagement
            </p>
          </div>
          <UButton
            @click="addDocument"
            color="primary"
            icon="i-heroicons-plus"
          >
            Ajouter un document
          </UButton>
        </div>

        <!-- Tableau des documents -->
        <UTable
          :data="documents"
          :columns="columns"
          class="flex-1"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
