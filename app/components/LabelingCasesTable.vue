<script setup lang="ts">
import type { SelectItem, TableColumn, TableRow } from "@nuxt/ui";
import { COMPANIES, type Company } from "~/utils/data";
const UBadge = resolveComponent('UBadge')

interface Props {
  company: Company
  role?: 'oe' | 'feef' | 'company'
}

const props = withDefaults(defineProps<Props>(), {
  role: 'feef'
})

const data = ref(COMPANIES);

// États des filtres (factices pour le design)
const filters = ref({
  type: '',
  state: '',
  oe: '',
  entreprise: '',
  statut: '',
  alerteRouge: false,
  alerteOrange: false
});

const typeItems = ref(['Tous les types', 'Initial', 'Renouvellement']);

const stateItems = ref(['Tous les états', 'Candidature', 'Engagement', 'Audit', 'Décision', 'Labellisé']);

const statutItems = ref(['Tous les statuts', 'En cours de labellisation', 'En cours de validité', 'Archivé']);

const oeItems = ref(['Tous les OE', 'SGS', 'Ecocert']);

const entrepriseItems = ref([
  'Toutes les entreprises', 
  'Alpha', 
  'Beta', 
  'Omega', 
  'Zeta'
]);

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
         filters.value.statut !== '' ||
         filters.value.alerteRouge || 
         filters.value.alerteOrange;
});


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
  data.value
    .map(company => {
      // Statut fictif pour la démo : alternance selon l'id
      let statut = 'En cours de labellisation';
      if (company.id.endsWith('1') || company.id.endsWith('4')) statut = 'En cours de validité';
      if (company.id.endsWith('2')) statut = 'Archivé';
      return {
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
        statut,
        original: company
      };
    })
    .filter(item => {
      // Filtrage par statut si sélectionné
      if (filters.value.statut && filters.value.statut !== 'Tous les statuts') {
        return item.statut === filters.value.statut;
      }
      return true;
    })
);

const columns: TableColumn<LabelingCase>[] = [
  {
    accessorKey: "entreprise",
    header: "Entreprise",
    cell: ({ row }) => row.original.entreprise,
  },
  ...(props.role === 'feef' ? [{
    accessorKey: "organismeEvaluateur",
    header: "Organisme Évaluateur",
    cell: ({ row }) => row.original.organismeEvaluateur,
  }] : []),
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
    cell: ({ row }) => {
      const color = ({ vert: 'success', orange: 'warning', rouge: 'error' })[row.getValue('alerteDelais') as string];
      const label = ({ vert: 'Verte', orange: 'Orange', rouge: 'Rouge' })[row.getValue('alerteDelais') as string];
      return h(UBadge, { class: 'capitalize', variant: 'soft', color }, () => label);
    },
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
  navigateTo(`/${props.role}/labeling-cases/${row.original.id}`);
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
    <div class="w-full space-y-8 pb-4">
        <div class="flex flex-col lg:flex-row gap-8">
          <!-- Filtres dans une carte -->
          <UCard class="flex-1 shadow-md rounded-xl p-6 bg-white dark:bg-gray-900">
            <div class="flex items-center gap-2 mb-6">
              <UIcon name="i-heroicons-funnel" class="w-6 h-6 text-primary" />
              <h3 class="text-xl font-bold text-primary">Filtres dossiers</h3>
            </div>
            <div class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <UFormGroup label="Type de dossier">
                  <USelect v-model="filters.type" :items="typeItems" placeholder="Type" class="w-full" />
                </UFormGroup>
                <UFormGroup label="État du dossier">
                  <USelect v-model="filters.state" :items="stateItems" placeholder="État" class="w-full" />
                </UFormGroup>
                <UFormGroup label="Statut du dossier">
                  <USelect v-model="filters.statut" :items="statutItems" placeholder="Statut" class="w-full" />
                </UFormGroup>
                <UFormGroup v-if="role==='feef'" label="Organisme Évaluateur">
                  <USelect v-model="filters.oe" :items="oeItems" placeholder="OE" class="w-full" />
                </UFormGroup>
                <UFormGroup label="Entreprise">
                  <USelect v-model="filters.entreprise" :items="entrepriseItems" placeholder="Entreprise" class="w-full" />
                </UFormGroup>
              </div>
              <div class="flex items-center gap-6 pt-2 border-t border-gray-200 dark:border-gray-700">
                <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Alertes :</span>
                <UCheckbox v-model="filters.alerteRouge" color="error">
                  <template #label>
                    <div class="flex items-center gap-2">
                      <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 text-red-500" />
                      <span class="text-sm">Rouges</span>
                    </div>
                  </template>
                </UCheckbox>
                <UCheckbox v-model="filters.alerteOrange" color="warning">
                  <template #label>
                    <div class="flex items-center gap-2">
                      <UIcon name="i-heroicons-exclamation-circle" class="w-4 h-4 text-orange-500" />
                      <span class="text-sm">Oranges</span>
                    </div>
                  </template>
                </UCheckbox>
              </div>
              <div class="flex items-center gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <UButton color="primary" size="sm" icon="i-heroicons-magnifying-glass">Appliquer</UButton>
                <UButton @click="resetFilters" color="neutral" variant="outline" size="sm" icon="i-heroicons-x-mark">Réinitialiser</UButton>
                <div class="ml-auto text-sm text-gray-600 dark:text-gray-400">
                  <span class="font-bold">{{ labelingCases.length }}</span> dossier{{ labelingCases.length > 1 ? 's' : '' }} trouvé{{ labelingCases.length > 1 ? 's' : '' }}
                </div>
              </div>
              <div v-if="hasActiveFilters" class="flex flex-wrap gap-2 mt-2">
                <UBadge v-if="filters.type" variant="subtle" color="primary" size="sm">Type: {{filters.type}}</UBadge>
                <UBadge v-if="filters.state" variant="subtle" color="info" size="sm">État: {{filters.state}}</UBadge>
                <UBadge v-if="filters.oe" variant="subtle" color="secondary" size="sm">OE: {{ filters.oe }}</UBadge>
                <UBadge v-if="filters.entreprise" variant="subtle" color="success" size="sm">Entreprise: {{ filters.entreprise }}</UBadge>
                <UBadge v-if="filters.alerteRouge" variant="subtle" color="error" size="sm">Rouges</UBadge>
                <UBadge v-if="filters.alerteOrange" variant="subtle" color="warning" size="sm">Oranges</UBadge>
              </div>
            </div>
          </UCard>
          <!-- Import/Export dans une carte -->
          <UCard class="min-w-[320px] shadow-md rounded-xl p-6 bg-white dark:bg-gray-900 flex flex-col justify-between">
            <div>
              <div class="flex items-center gap-2 mb-6">
                <UIcon name="i-heroicons-arrow-down-tray" class="w-6 h-6 text-secondary" />
                <h3 class="text-xl font-bold text-secondary">Import / Export</h3>
              </div>
              <div class="space-y-4">
                <div v-if="role === 'oe'" class="flex gap-2">
                  <UButton color="primary" variant="outline" size="sm" icon="i-heroicons-arrow-down-tray" class="flex-1">Importer</UButton>
                  <UButton color="primary" variant="outline" size="sm" icon="i-heroicons-arrow-up-tray" class="flex-1">Exporter</UButton>
                </div>
                <template v-else>
                  <div class="space-y-2">
                    <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">SGS</h4>
                    <div class="flex gap-2">
                      <UButton color="primary" variant="outline" size="sm" icon="i-heroicons-arrow-down-tray" class="flex-1">Importer</UButton>
                      <UButton color="primary" variant="outline" size="sm" icon="i-heroicons-arrow-up-tray" class="flex-1">Exporter</UButton>
                    </div>
                  </div>
                  <div class="space-y-2">
                    <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Ecocert</h4>
                    <div class="flex gap-2">
                      <UButton color="secondary" variant="outline" size="sm" icon="i-heroicons-arrow-down-tray" class="flex-1">Importer</UButton>
                      <UButton color="secondary" variant="outline" size="sm" icon="i-heroicons-arrow-up-tray" class="flex-1">Exporter</UButton>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </UCard>
        </div>
        <!-- Champ de recherche entreprise -->
        <div class="flex flex-row items-center gap-2 mt-8 mb-4">
          <UInput
            placeholder="Rechercher une entreprise..."
            icon="i-heroicons-magnifying-glass"
            class="w-80"
          />
        </div>
        <!-- Tableau modernisé -->
        <div>
          <UTable
            :data="labelingCases"
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
            <template #alerteDelais-data="{ row }">
              <UBadge variant="solid" :color="row.original.alerteDelais === 'vert' ? 'success' : row.original.alerteDelais === 'orange' ? 'warning' : 'error'" size="sm">
                <UIcon :name="row.original.alerteDelais === 'vert' ? 'i-heroicons-check-circle' : row.original.alerteDelais === 'orange' ? 'i-heroicons-exclamation-triangle' : 'i-heroicons-x-circle'" class="w-3 h-3" />
              </UBadge>
            </template>
            <template #rapportAudit-data="{ row }">
              <UBadge :variant="row.original.rapportAudit === 'Disponible' ? 'solid' : 'outline'" :color="row.original.rapportAudit === 'Disponible' ? 'success' : 'neutral'" size="sm">{{ row.original.rapportAudit }}</UBadge>
            </template>
            <template #avisLabellisation-data="{ row }">
              <UBadge :variant="row.original.avisLabellisation !== 'En attente' ? 'solid' : 'outline'" :color="row.original.avisLabellisation === 'FAVORABLE' ? 'success' : row.original.avisLabellisation === 'DEFAVORABLE' ? 'error' : 'neutral'" size="sm">{{ row.original.avisLabellisation }}</UBadge>
            </template>
          </UTable>
        </div>
        <div class="flex justify-center border-t border-default pt-4">
          <UPagination :default-page="1" :items-per-page="10" :total="labelingCases.length" @update:page="(p) => {}" />
        </div>
      </div>
</template>