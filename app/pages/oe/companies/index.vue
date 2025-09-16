<script setup lang="ts">
import type { TableColumn, TableRow } from "@nuxt/ui";
import { COMPANIES, type Company } from "~/utils/data";

definePageMeta({
  layout: "dashboard-oe",
});

const data = ref(COMPANIES);

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
    cell: ({ row }) => row.original.workflow.type,
  },
  {
    accessorKey: "workflow.state",
    header: "État",
    cell: ({ row }) => row.original.workflow.state,
  },
];

function onSelectRow(row: TableRow<Company>, e?: Event) {
  navigateTo(`/oe/companies/${row.original.id}`);
}
</script>

<template>
  <UDashboardPanel id="companies">
    <template #header>
      <NavBar />
    </template>    <template #body>
      <div class="w-full space-y-4 pb-4">
        <UTable
          :data="data"
          :columns="columns"
          class="flex-1"
          @select="onSelectRow"
        />
      </div>
      <div class="flex justify-center border-t border-default pt-4">
        <UPagination
        :default-page="1"
        :items-per-page="10"
        :total="50"
        @update:page="(p) => {}"
      />
      </div>
    </template>
  </UDashboardPanel>
</template>
