<script setup lang="ts">
import { h } from "vue";
import type { TableColumn, TableRow } from "@nuxt/ui";
import { ORGANISMES_EVALUATEURS, type OE } from "~/utils/data";

definePageMeta({
  layout: "dashboard-feef",
});

const data = ref(ORGANISMES_EVALUATEURS);

const columns: TableColumn<OE>[] = [
  {
    accessorKey: "nom",
    header: "Nom de l'organisme",
    cell: ({ row }) => row.original.nom,
  },
  {
    accessorKey: "accounts",
    header: "Nombre de comptes",
    cell: ({ row }) => row.original.accounts.length,
  },
  {
    accessorKey: "accounts",
    header: "Comptes détails",
    cell: ({ row }) => {
      const adminCount = row.original.accounts.filter(account => account.role === 'administrateur').length;
      const chargeCount = row.original.accounts.filter(account => account.role === 'chargé d\'affaire').length;
      return `${adminCount} admin, ${chargeCount} chargés d'affaire`;
    },
  },
];

function onSelectRow(row: TableRow<OE>, e?: Event) {
  navigateTo(`/feef/oe/${row.original.id}`);
}
</script>

<template>
  <UDashboardPanel id="oe">
    <template #header>
      <UDashboardNavbar title="Organismes Évaluateurs">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        </UDashboardNavbar>
    </template>

    <template #body>
      <div class="w-full space-y-4 pb-4">
        <UTable
          :data="data"
          :columns="columns"
          class="flex-1"
          @select="onSelectRow"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
