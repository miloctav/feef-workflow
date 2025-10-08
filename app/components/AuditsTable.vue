<script setup lang="ts">
import type { TableColumn, TableRow } from "@nuxt/ui";
import { COMPANIES, type Company } from "~/utils/data";
const UBadge = resolveComponent('UBadge')

// Interface pour représenter un audit
interface Audit {
  id: string;
  entreprise: string;
  type: string;
  etat: string;
  organismeEvaluateur: string;
  dateAuditCible: string;
  dateAuditReel: string;
  alerteDelais: 'vert' | 'orange' | 'rouge';
  rapportAudit: string;
  performanceGlobale: number | undefined;
  original: any;
}

// Fonction pour calculer l'alerte délais
function getAlerteDelais(company: Company): 'vert' | 'orange' | 'rouge' {
  const today = new Date();
  const dateAuditPlanifiee = company.workflow.audit.dateDebutPlanifiee;

  if (!dateAuditPlanifiee) return 'vert';

  const auditDate = new Date(dateAuditPlanifiee);
  const diffDays = Math.ceil((auditDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

  if (diffDays < 0) return 'rouge'; // Audit dépassé
  if (diffDays <= 7) return 'orange'; // Audit dans moins de 7 jours
  return 'vert'; // Audit dans plus de 7 jours
}

// Tous les audits (pour le design)
const audits = computed(() =>
  COMPANIES
    .map(company => ({
      id: company.id,
      entreprise: company.raisonSociale.nom,
      type: company.workflow.type,
      etat: company.workflow.state,
      organismeEvaluateur: company.workflow.partageOE,
      dateAuditCible: `${company.workflow.audit.dateDebutPlanifiee} - ${company.workflow.audit.dateFinPlanifiee}`,
      dateAuditReel: company.workflow.audit.dateDebutReelle && company.workflow.audit.dateFinReelle ?
        `${company.workflow.audit.dateDebutReelle} - ${company.workflow.audit.dateFinReelle}` : 'Non réalisé',
      alerteDelais: getAlerteDelais(company),
      rapportAudit: company.workflow.rapport.rapport?.isAvailable ? 'Transmis' : 'En cours',
      performanceGlobale: company.workflow.rapport.performanceGlobale,
      original: company
    }))
);

const columns: TableColumn<Audit>[] = [
  {
    accessorKey: "entreprise",
    header: "Entité",
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
    accessorKey: "dateAuditCible",
    header: "Date Audit Planifiée",
    cell: ({ row }) => row.original.dateAuditCible,
  },
  {
    accessorKey: "dateAuditReel",
    header: "Date Audit Réalisée",
    cell: ({ row }) => row.original.dateAuditReel,
  },
  {
    accessorKey: "alerteDelais",
    header: "Statut",
    cell: ({ row }) => {
      const color = ({ vert: 'success', orange: 'warning', rouge: 'error' })[row.getValue('alerteDelais') as string];
      const label = ({ vert: 'À venir', orange: 'Imminent', rouge: 'En retard' })[row.getValue('alerteDelais') as string];
      return h(UBadge, { class: 'capitalize', variant: 'soft', color }, () => label);
    },
  },
  {
    accessorKey: "rapportAudit",
    header: "Rapport",
    cell: ({ row }) => row.original.rapportAudit,
  },
  {
    accessorKey: "performanceGlobale",
    header: "Performance",
    cell: ({ row }) => row.original.performanceGlobale !== undefined ? `${row.original.performanceGlobale}%` : '-',
  },
];

function onSelectRow(row: TableRow<Audit>, e?: Event) {
  navigateTo(`/auditeur/audits/${row.original.id}`);
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
  <div class="w-full space-y-4 pb-4">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Mes Audits</h2>
        <p class="text-sm text-gray-600 mt-1">{{ audits.length }} audit{{ audits.length > 1 ? 's' : '' }} assigné{{ audits.length > 1 ? 's' : '' }}</p>
      </div>
    </div>

    <!-- Tableau -->
    <div>
      <UTable
        :data="audits"
        :columns="columns"
        class="shadow-lg rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800"
        @select="onSelectRow"
        thead-class="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10"
      >
        <template #type-data="{ row }">
          <UBadge :variant="row.original.type === 'Initial' ? 'solid' : 'outline'" :color="row.original.type === 'Initial' ? 'primary' : 'warning'" size="sm">{{ row.original.type }}</UBadge>
        </template>
        <template #etat-data="{ row }">
          <UBadge variant="solid" :color="getEtatColor(row.original.etat)" size="sm">{{ row.original.etat }}</UBadge>
        </template>
        <template #rapportAudit-data="{ row }">
          <UBadge :variant="row.original.rapportAudit === 'Transmis' ? 'solid' : 'outline'" :color="row.original.rapportAudit === 'Transmis' ? 'success' : 'neutral'" size="sm">{{ row.original.rapportAudit }}</UBadge>
        </template>
        <template #performanceGlobale-data="{ row }">
          <div v-if="row.original.performanceGlobale !== undefined" class="flex items-center gap-2">
            <UProgress :value="row.original.performanceGlobale" :max="100" size="sm" class="w-20" />
            <span class="text-sm font-semibold">{{ row.original.performanceGlobale }}%</span>
          </div>
          <span v-else class="text-gray-400">-</span>
        </template>
      </UTable>
    </div>

    <div v-if="audits.length > 10" class="flex justify-center border-t border-default pt-4">
      <UPagination :default-page="1" :items-per-page="10" :total="audits.length" />
    </div>
  </div>
</template>
