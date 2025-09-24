<script setup lang="ts">
import { h } from "vue";
import type { TableColumn, TableRow } from "@nuxt/ui";
import { COMPANIES, type Company } from "~/utils/data";

interface Props {
  company: Company
  role?: 'oe' | 'feef' | 'company'
}

const props = withDefaults(defineProps<Props>(), {
  role: 'feef'
})

const data = ref(COMPANIES);

// États des filtres
const filters = ref({
  type: '',
  state: '',
  oe: ''
});

const typeItems = ref(['Tous les types', 'Initial', 'Renouvellement']);
const stateItems = ref(['Tous les états', 'CANDIDATURE', 'ENGAGEMENT', 'AUDIT', 'DECISION', 'LABELISE']);
const oeItems = ref(['Tous les OE', 'SGS', 'Ecocert']);

// Computed pour vérifier s'il y a des filtres actifs
const hasActiveFilters = computed(() => {
  return filters.value.type !== '' ||
         filters.value.state !== '' ||
         filters.value.oe !== '';
});

// Fonction pour réinitialiser les filtres
function resetFilters() {
  filters.value = {
    type: '',
    state: '',
    oe: ''
  };
}

// Données filtrées
const filteredCompanies = computed(() =>
  data.value.filter(company => {
    // Filtrage par type
    if (filters.value.type && filters.value.type !== 'Tous les types' && company.workflow.type !== filters.value.type) {
      return false;
    }
    // Filtrage par état
    if (filters.value.state && filters.value.state !== 'Tous les états' && company.workflow.state !== filters.value.state) {
      return false;
    }
    // Filtrage par OE
    if (filters.value.oe && filters.value.oe !== 'Tous les OE' && company.workflow.partageOE !== filters.value.oe) {
      return false;
    }
    return true;
  })
);

// Génère une date fictive de renouvellement pour chaque entreprise
function getRenewalDate(company: Company): string {
  // Pour la démo, on prend la date de création + 1 an, ou une date fixe
  const baseDate = new Date();
  baseDate.setFullYear(baseDate.getFullYear() + 1);
  return baseDate.toLocaleDateString('fr-FR');
}

const columns: TableColumn<Company>[] = [
  {
    accessorKey: "raisonSociale.nom",
    header: "Nom",
    cell: ({ row }) => row.original.raisonSociale.nom,
  },
  {
    accessorKey: "raisonSociale.siren",
    header: "SIREN",
    cell: ({ row }) => row.original.raisonSociale.siren,
  },
  {
    accessorKey: "pilote",
    header: "Pilote",
    cell: ({ row }) => {
      const pilote = row.original.pilote;
      return `${pilote.prenom} ${pilote.nom}`;
    },
  },
  {
    accessorKey: "workflow.type",
    header: "Type",
    cell: ({ row }) => {
      const type = row.original.workflow.type;
      const color = type === 'Initial' ? 'primary' : 'warning';
      return h(resolveComponent('UBadge'), { color, variant: 'soft', size: 'sm' }, () => type);
    },
  },
  {
    accessorKey: "workflow.state",
    header: "État",
    cell: ({ row }) => {
      const state = row.original.workflow.state;
      const color = state === 'LABELISE' ? 'success' : state === 'AUDIT' ? 'warning' : state === 'ENGAGEMENT' ? 'primary' : 'neutral';
      return h(resolveComponent('UBadge'), { color, variant: 'soft', size: 'sm' }, () => state);
    },
  },
  {
    accessorKey: "renewalDate",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return h(resolveComponent('UButton'), {
        color: 'neutral',
        variant: 'ghost',
        label: 'Date limite de renouvellement',
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(isSorted === 'asc')
      });
    },
    cell: ({ row }) => {
      const date = getRenewalDate(row.original);
      return h(resolveComponent('UBadge'), { color: 'info', variant: 'soft', size: 'sm' }, () => date);
    },
    sortingFn: (a, b) => {
      // Convertit les dates en format JS pour le tri
      const dateA = new Date(getRenewalDate(a.original));
      const dateB = new Date(getRenewalDate(b.original));
      return dateA.getTime() - dateB.getTime();
    }
  },
];

function onSelectRow(row: TableRow<Company>, e?: Event) {
  navigateTo(`/${props.role}/companies/${row.original.id}`);
}
</script>

<template>
    <div class="w-full space-y-8 pb-4">
        <!-- Filtres -->
        <UCard class="shadow-md rounded-xl p-6 bg-white dark:bg-gray-900">
          <div class="flex items-center gap-2 mb-6">
            <UIcon name="i-heroicons-funnel" class="w-6 h-6 text-primary" />
            <h3 class="text-xl font-bold text-primary">Filtres entreprises</h3>
          </div>
          <div class="space-y-4">
            <div :class="role === 'feef' ? 'grid grid-cols-1 md:grid-cols-3 gap-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4'">
              <UFormGroup label="Type de dossier">
                <USelect v-model="filters.type" :items="typeItems" placeholder="Type" class="w-full" />
              </UFormGroup>
              <UFormGroup label="État du dossier">
                <USelect v-model="filters.state" :items="stateItems" placeholder="État" class="w-full" />
              </UFormGroup>
              <UFormGroup v-if="role==='feef'" label="Organisme Évaluateur">
                <USelect v-model="filters.oe" :items="oeItems" placeholder="OE" class="w-full" />
              </UFormGroup>
            </div>
            <div class="flex items-center gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <UButton color="primary" size="sm" icon="i-heroicons-magnifying-glass">Appliquer</UButton>
              <UButton @click="resetFilters" color="neutral" variant="outline" size="sm" icon="i-heroicons-x-mark">Réinitialiser</UButton>
              <div class="ml-auto text-sm text-gray-600 dark:text-gray-400">
                <span class="font-bold">{{ filteredCompanies.length }}</span> entreprise{{ filteredCompanies.length > 1 ? 's' : '' }} trouvée{{ filteredCompanies.length > 1 ? 's' : '' }}
              </div>
            </div>
            <div v-if="hasActiveFilters" class="flex flex-wrap gap-2 mt-2">
              <UBadge v-if="filters.type" variant="subtle" color="primary" size="sm">Type: {{filters.type}}</UBadge>
              <UBadge v-if="filters.state" variant="subtle" color="info" size="sm">État: {{filters.state}}</UBadge>
              <UBadge v-if="filters.oe" variant="subtle" color="secondary" size="sm">OE: {{ filters.oe }}</UBadge>
            </div>
          </div>
        </UCard>

        <!-- Champ de recherche + bouton création sur la même ligne -->
        <div class="flex flex-row items-center justify-between mb-2">
          <UInput
            placeholder="Rechercher par nom d'entreprise..."
            icon="i-heroicons-magnifying-glass"
            class="w-80"
          />
          <div v-if="role==='feef'">
            <UButton color="primary" icon="i-lucide-plus" size="sm" class="font-semibold">Créer une nouvelle entreprise
            </UButton>
          </div>
        </div>
        <UTable :data="filteredCompanies" :columns="columns"
          class="shadow-lg rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 transition-all"
          thead-class="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10"
          tbody-class="hover:bg-gray-50 dark:hover:bg-gray-900" @select="onSelectRow">
          <template #row="{ row, index }">
            <tr class="hover:bg-gray-100 dark:hover:bg-gray-900 transition cursor-pointer">
              <td class="px-4 py-2">{{ row.original.raisonSociale.nom }}</td>
              <td class="px-4 py-2">{{ row.original.raisonSociale.siren }}</td>
              <td class="px-4 py-2">{{ row.original.pilote.prenom }} {{ row.original.pilote.nom }}</td>
              <td class="px-4 py-2">
                <UBadge :color="row.original.workflow.type === 'Initial' ? 'primary' : 'warning'" variant="soft" size="sm">
                  {{ row.original.workflow.type }}
                </UBadge>
              </td>
              <td class="px-4 py-2">
                <UBadge :color="row.original.workflow.state === 'LABELISE' ? 'success' : row.original.workflow.state === 'AUDIT' ? 'warning' : row.original.workflow.state === 'ENGAGEMENT' ? 'primary' : 'neutral'" variant="soft" size="sm">
                  {{ row.original.workflow.state }}
                </UBadge>
              </td>
              <td class="px-4 py-2">
                <UBadge color="info" variant="soft" size="sm">
                  {{ getRenewalDate(row.original) }}
                </UBadge>
              </td>
            </tr>
          </template>
        </UTable>
      </div>
      <div class="flex justify-center border-t border-default pt-4">
        <UPagination :default-page="1" :items-per-page="10" :total="filteredCompanies.length" size="lg" class="mt-2"
          @update:page="(p) => { }" />
      </div>
</template>