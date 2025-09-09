<script setup lang="ts">
import { h } from "vue";
import type { TableColumn, TableRow } from "@nuxt/ui";
import { COMPANIES, type Company } from "~/utils/data";

definePageMeta({
  layout: "dashboard-feef",
});

const data = ref(COMPANIES);

// Interface pour représenter un dossier de labellisation
interface LabelingCase {
  id: string;
  entreprise: string;
  pilote: string;
  type: string;
  etat: string;
  organismeEvaluateur: string;
  dateValidation: string;
}

// Transformation des données entreprises en dossiers de labellisation
const labelingCases = computed(() => 
  data.value.map(company => ({
    id: company.id,
    entreprise: company.raisonSociale.nom,
    pilote: `${company.pilote.prenom} ${company.pilote.nom}`,
    type: company.workflow.type,
    etat: company.workflow.state,
    organismeEvaluateur: company.workflow.partageOE,
    dateValidation: company.eligibilite.dateValidation,
    original: company
  }))
);

const columns: TableColumn<LabelingCase>[] = [
  {
    accessorKey: "entreprise",
    header: "Entreprise",
    cell: ({ row }) => row.original.entreprise,
  },
  {
    accessorKey: "organismeEvaluateur",
    header: "Organisme Évaluateur",
    cell: ({ row }) => row.original.organismeEvaluateur,
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => row.original.type,
  },
  {
    accessorKey: "etat",
    header: "État", 
    cell: ({ row }) => row.original.etat,
  },
  {
    accessorKey: "pilote",
    header: "Pilote",
    cell: ({ row }) => row.original.pilote,
  },
  {
    accessorKey: "dateValidation",
    header: "Date Validation",
    cell: ({ row }) => row.original.dateValidation,
  },
];

function onSelectRow(row: TableRow<LabelingCase>, e?: Event) {
  navigateTo(`/feef/labeling-cases/${row.original.id}`);
}

function getEtatColor(etat: string): "neutral" | "primary" | "warning" | "secondary" | "success" | "info" | "error" {
  const colors: Record<string, "neutral" | "primary" | "warning" | "secondary" | "success" | "info" | "error"> = {
    'CANDIDATURE': 'neutral',
    'ENGAGEMENT': 'primary', 
    'AUDIT': 'warning',
    'DECISION': 'secondary',
    'LABELISE': 'success'
  };
  return colors[etat] || 'neutral';
}
</script>

<template>
  <UDashboardPanel id="labeling-cases">
    <template #header>
      <UDashboardNavbar title="Dossiers de Labellisation">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="w-full space-y-4 pb-4">
        <UTable
          :data="labelingCases"
          :columns="columns"
          class="flex-1"
          @select="onSelectRow"
        >
          <template #type-data="{ row }">
            <UBadge 
              :variant="row.original.type === 'Initial' ? 'solid' : 'outline'"
              :color="row.original.type === 'Initial' ? 'primary' : 'warning'"
              size="sm"
            >
              {{ row.original.type }}
            </UBadge>
          </template>
          
          <template #etat-data="{ row }">
            <UBadge 
              variant="solid"
              :color="getEtatColor(row.original.etat)"
              size="sm"
            >
              {{ row.original.etat }}
            </UBadge>
          </template>
        </UTable>
      </div>
      <div class="flex justify-center border-t border-default pt-4">
        <UPagination
          :default-page="1"
          :items-per-page="10"
          :total="labelingCases.length"
          @update:page="(p) => {}"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
