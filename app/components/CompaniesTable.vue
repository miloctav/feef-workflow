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
    <div class="w-full space-y-4 pb-4">
        <div v-if="role==='feef'" class="flex justify-end mb-2">
          <UButton color="primary" icon="i-lucide-plus" size="sm" class="font-semibold">Créer une nouvelle entreprise
          </UButton>
        </div>
        <UTable :data="data" :columns="columns"
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
        <UPagination :default-page="1" :items-per-page="10" :total="data.length" size="lg" class="mt-2"
          @update:page="(p) => { }" />
      </div>
</template>