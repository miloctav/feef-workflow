<script setup lang="ts">
import { h } from "vue";
import type { TableColumn, TableRow } from "@nuxt/ui";
import { COMPANIES, type Company } from "~/utils/data";

definePageMeta({
  layout: "dashboard-feef",
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
      <NavBar />
    </template>

    <template #body>
      <div class="w-full space-y-6 pb-4">
        <!-- Section des filtres et actions -->
        <div class="flex gap-8">
          <!-- Section des filtres -->
          <div class="flex-1 max-w-[60%]">
            <!-- En-tête des filtres -->
            <div class="flex items-center gap-2 mb-4">
              <UIcon name="i-heroicons-funnel" class="w-5 h-5 text-gray-600" />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Filtres</h3>
            </div>

            <!-- Filtres -->
            <div class="space-y-4">
            <!-- Première ligne de filtres -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <UFormGroup label="Type de dossier">
                <USelect
                  v-model="filters.type"
                  :options="typeOptions"
                  placeholder="Sélectionner un type"
                />
              </UFormGroup>

              <UFormGroup label="État du dossier">
                <USelect
                  v-model="filters.state"
                  :options="stateOptions"
                  placeholder="Sélectionner un état"
                />
              </UFormGroup>

              <UFormGroup label="Organisme Évaluateur">
                <USelect
                  v-model="filters.oe"
                  :options="oeOptions"
                  placeholder="Sélectionner un OE"
                />
              </UFormGroup>

              <UFormGroup label="Entreprise">
                <USelect
                  v-model="filters.entreprise"
                  :options="entrepriseOptions"
                  placeholder="Sélectionner une entreprise"
                />
              </UFormGroup>
            </div>

            <!-- Deuxième ligne : Filtres par alertes -->
            <div class="flex items-center gap-6 pt-2 border-t border-gray-200 dark:border-gray-600">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Alertes :</span>
              
              <UCheckbox
                v-model="filters.alerteRouge"
                color="error"
              >
                <template #label>
                  <div class="flex items-center gap-2">
                    <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 text-red-500" />
                    <span class="text-sm">Alertes critiques</span>
                  </div>
                </template>
              </UCheckbox>

              <UCheckbox
                v-model="filters.alerteOrange"
                color="warning"
              >
                <template #label>
                  <div class="flex items-center gap-2">
                    <UIcon name="i-heroicons-exclamation-circle" class="w-4 h-4 text-orange-500" />
                    <span class="text-sm">Alertes importantes</span>
                  </div>
                </template>
              </UCheckbox>
            </div>

            <!-- Actions des filtres -->
            <div class="flex items-center gap-3 pt-3 border-t border-gray-200 dark:border-gray-600">
              <UButton
                color="primary"
                size="sm"
                icon="i-heroicons-magnifying-glass"
              >
                Appliquer les filtres
              </UButton>
              
              <UButton
                @click="resetFilters"
                color="neutral"
                variant="outline" 
                size="sm"
                icon="i-heroicons-x-mark"
              >
                Réinitialiser
              </UButton>

              <!-- Compteur de résultats -->
              <div class="ml-auto text-sm text-gray-600 dark:text-gray-400">
                <span class="font-medium">{{ labelingCases.length }}</span> dossier{{ labelingCases.length > 1 ? 's' : '' }} trouvé{{ labelingCases.length > 1 ? 's' : '' }}
              </div>
            </div>
          </div>

          <!-- Filtres actifs -->
          <div v-if="hasActiveFilters" class="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <UBadge 
              v-if="filters.type" 
              variant="subtle" 
              color="primary" 
              size="sm"
            >
              Type: {{ getTypeLabel(filters.type) }}
            </UBadge>
            <UBadge 
              v-if="filters.state" 
              variant="subtle" 
              color="info" 
              size="sm"
            >
              État: {{ getStateLabel(filters.state) }}
            </UBadge>
            <UBadge 
              v-if="filters.oe" 
              variant="subtle" 
              color="secondary" 
              size="sm"
            >
              OE: {{ filters.oe }}
            </UBadge>
            <UBadge 
              v-if="filters.entreprise" 
              variant="subtle" 
              color="success" 
              size="sm"
            >
              Entreprise: {{ filters.entreprise }}
            </UBadge>
            <UBadge 
              v-if="filters.alerteRouge" 
              variant="subtle" 
              color="error" 
              size="sm"
            >
              Alertes critiques
            </UBadge>
            <UBadge 
              v-if="filters.alerteOrange" 
              variant="subtle" 
              color="warning" 
              size="sm"
            >
              Alertes importantes
            </UBadge>
          </div>
          </div>

          <!-- Section des boutons Import/Export -->
          <div class="min-w-[300px]">
            <!-- En-tête des actions -->
            <div class="flex items-center gap-2 mb-4">
              <UIcon name="i-heroicons-arrow-down-tray" class="w-5 h-5 text-gray-600" />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Import/Export</h3>
            </div>

            <!-- Boutons d'actions -->
            <div class="space-y-4">
              <!-- SGS -->
              <div class="space-y-2">
                <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">SGS</h4>
                <div class="flex gap-2">
                  <UButton
                    color="primary"
                    variant="outline"
                    size="sm"
                    icon="i-heroicons-arrow-down-tray"
                    class="flex-1"
                  >
                    Importer SGS
                  </UButton>
                  <UButton
                    color="primary"
                    variant="outline"
                    size="sm"
                    icon="i-heroicons-arrow-up-tray"
                    class="flex-1"
                  >
                    Exporter SGS
                  </UButton>
                </div>
              </div>

              <!-- Ecocert -->
              <div class="space-y-2">
                <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">Ecocert</h4>
                <div class="flex gap-2">
                  <UButton
                    color="secondary"
                    variant="outline"
                    size="sm"
                    icon="i-heroicons-arrow-down-tray"
                    class="flex-1"
                  >
                    Importer Ecocert
                  </UButton>
                  <UButton
                    color="secondary"
                    variant="outline"
                    size="sm"
                    icon="i-heroicons-arrow-up-tray"
                    class="flex-1"
                  >
                    Exporter Ecocert
                  </UButton>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tableau des dossiers -->
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

          <template #alerteDelais-data="{ row }">
            <UBadge 
              variant="solid"
              :color="row.original.alerteDelais === 'vert' ? 'success' : 
                     row.original.alerteDelais === 'orange' ? 'warning' : 'error'"
              size="sm"
            >
              <UIcon 
                :name="row.original.alerteDelais === 'vert' ? 'i-heroicons-check-circle' : 
                      row.original.alerteDelais === 'orange' ? 'i-heroicons-exclamation-triangle' : 
                      'i-heroicons-x-circle'"
                class="w-3 h-3"
              />
            </UBadge>
          </template>

          <template #rapportAudit-data="{ row }">
            <UBadge 
              :variant="row.original.rapportAudit === 'Disponible' ? 'solid' : 'outline'"
              :color="row.original.rapportAudit === 'Disponible' ? 'success' : 'neutral'"
              size="sm"
            >
              {{ row.original.rapportAudit }}
            </UBadge>
          </template>

          <template #avisLabellisation-data="{ row }">
            <UBadge 
              :variant="row.original.avisLabellisation !== 'En attente' ? 'solid' : 'outline'"
              :color="row.original.avisLabellisation === 'FAVORABLE' ? 'success' : 
                     row.original.avisLabellisation === 'DEFAVORABLE' ? 'error' : 'neutral'"
              size="sm"
            >
              {{ row.original.avisLabellisation }}
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
