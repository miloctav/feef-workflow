<script setup lang="ts">
import { h } from "vue";
import type { TableColumn, TableRow } from "@nuxt/ui";
import { COMPANIES, type Company } from "~/utils/data";

definePageMeta({
  layout: "dashboard-oe",
});

const data = ref(COMPANIES);

// États des filtres (factices pour le design)
const filters = ref({
  type: '',
  state: '',
  oe: '',
  entreprise: '',
  alerteRouge: false,
  alerteOrange: false
});

// Options pour les filtres
const typeOptions = [
  { label: 'Tous les types', value: '' },
  { label: 'Initial', value: 'Initial' },
  { label: 'Renouvellement', value: 'Renouvellement' }
];

const stateOptions = [
  { label: 'Tous les états', value: '' },
  { label: 'Candidature', value: 'CANDIDATURE' },
  { label: 'Engagement', value: 'ENGAGEMENT' },
  { label: 'Audit', value: 'AUDIT' },
  { label: 'Décision', value: 'DECISION' },
  { label: 'Labellisé', value: 'LABELISE' }
];

const oeOptions = [
  { label: 'Tous les OE', value: '' },
  { label: 'SGS', value: 'SGS' },
  { label: 'Ecocert', value: 'Ecocert' }
];

const entrepriseOptions = [
  { label: 'Toutes les entreprises', value: '' },
  { label: 'Alpha', value: 'Alpha' },
  { label: 'Beta', value: 'Beta' },
  { label: 'Omega', value: 'Omega' },
  { label: 'Zeta', value: 'Zeta' }
];

// Interface pour représenter un dossier de labellisation
interface LabelingCase {
  id: string;
  entreprise: string;
  pilote: string;
  type: string;
  etat: string;
  organismeEvaluateur: string;
  dateValidation: string;
  dateAuditCible: string;
  dateAuditReel: string;
  alerteDelais: 'vert' | 'orange' | 'rouge';
  nomAuditeur: string;
  rapportAudit: string;
  avisLabellisation: string;
  original: any;
}

// Computed pour vérifier s'il y a des filtres actifs
const hasActiveFilters = computed(() => {
  return filters.value.type !== '' || 
         filters.value.state !== '' || 
         filters.value.oe !== '' || 
         filters.value.entreprise !== '' || 
         filters.value.alerteRouge || 
         filters.value.alerteOrange;
});

// Fonctions pour obtenir les labels des options
function getTypeLabel(value: string): string {
  const option = typeOptions.find(opt => opt.value === value);
  return option ? option.label : value;
}

function getStateLabel(value: string): string {
  const option = stateOptions.find(opt => opt.value === value);
  return option ? option.label : value;
}

// Fonction pour réinitialiser les filtres
function resetFilters() {
  filters.value = {
    type: '',
    state: '',
    oe: '',
    entreprise: '',
    alerteRouge: false,
    alerteOrange: false
  };
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
    dateAuditCible: `${company.workflow.audit.dateDebutPlanifiee} - ${company.workflow.audit.dateFinPlanifiee}`,
    dateAuditReel: company.workflow.audit.dateDebutReelle && company.workflow.audit.dateFinReelle ? 
      `${company.workflow.audit.dateDebutReelle} - ${company.workflow.audit.dateFinReelle}` : 'Non réalisé',
    alerteDelais: getAlerteDelais(company),
    nomAuditeur: `${company.workflow.audit.auditeur.prenom} ${company.workflow.audit.auditeur.nom}`,
    rapportAudit: company.workflow.rapport.rapportSimplifie?.isAvailable ? 'Disponible' : 
                  company.workflow.rapport.rapportDetaille?.isAvailable ? 'Disponible' : 'En attente',
    avisLabellisation: company.workflow.avis.avis || 'En attente',
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
  {
    accessorKey: "dateAuditCible",
    header: "Date Audit Cible",
    cell: ({ row }) => row.original.dateAuditCible,
  },
  {
    accessorKey: "dateAuditReel",
    header: "Date Audit Réel",
    cell: ({ row }) => row.original.dateAuditReel,
  },
  {
    accessorKey: "alerteDelais",
    header: "Alerte Délais",
    cell: ({ row }) => row.original.alerteDelais,
  },
  {
    accessorKey: "nomAuditeur",
    header: "Nom Auditeur",
    cell: ({ row }) => row.original.nomAuditeur,
  },
  {
    accessorKey: "rapportAudit",
    header: "Rapport d'Audit",
    cell: ({ row }) => row.original.rapportAudit,
  },
  {
    accessorKey: "avisLabellisation",
    header: "Avis Labellisation",
    cell: ({ row }) => row.original.avisLabellisation,
  },
];

function onSelectRow(row: TableRow<LabelingCase>, e?: Event) {
  navigateTo(`/oe/labeling-cases/${row.original.id}`);
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
      <NavBar />
    </template>

    <template #body>
      <LabelingCasesTable role="oe" />
    </template>
  </UDashboardPanel>
</template>
