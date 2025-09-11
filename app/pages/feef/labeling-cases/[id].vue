<script setup lang="ts">
import { getCompanyById } from '~/utils/data'
import type { Alert } from '~/utils/data'

definePageMeta({
  layout: "dashboard-feef",
});

const route = useRoute()
const company = getCompanyById(route.params.id as string)

if (!company) {
  throw createError({ statusCode: 404, statusMessage: 'Dossier de labellisation non trouvé' })
}

function getEtatColor(etat: string): "neutral" | "primary" | "warning" | "secondary" | "success" | "info" | "error" {
  const colors: Record<string, "neutral" | "primary" | "warning" | "secondary" | "success" | "info" | "error"> = {
    'candidacy': 'neutral',
    'engagement': 'primary', 
    'audit': 'warning',
    'decision': 'secondary',
    'labeled': 'success'
  };
  return colors[etat] || 'neutral';
}

// Ordre des étapes pour déterminer lesquelles sont complétées
const stepOrder = ['candidacy', 'engagement', 'audit', 'decision', 'labeled'];

// Configuration des étapes du stepper
const stepperItems = computed(() => {
  const currentStepIndex = stepOrder.indexOf(company.workflow.state);
  
  return [
    {
      title: 'Candidature',
      icon: 'i-lucide-file-text',
      value: 'candidacy',
      completed: currentStepIndex >= 0,
      dates: [
        {
          label: 'Date validation éligibilité',
          value: company.eligibilite.dateValidation,
          icon: 'i-lucide-check-circle'
        },
        {
          label: 'Envoi contrat de labellisation',
          value: company.workflow.contratLabellisation.envoiContrat,
          icon: 'i-lucide-send'
        },
        {
          label: 'Contrat de labellisation signé',
          value: company.workflow.contratLabellisation.contratSigne,
          icon: 'i-lucide-pen-tool'
        }
      ]
    },
    {
      title: 'Engagement',
      icon: 'i-lucide-handshake',
      value: 'engagement',
      completed: currentStepIndex >= 1,
      dates: [
        {
          label: 'Devis OE signé',
          value: company.workflow.contratOE.contratSigne,
          icon: 'i-lucide-file-signature'
        }
      ]
    },
    {
      title: 'Audit',
      icon: 'i-lucide-search',
      value: 'audit',
      completed: currentStepIndex >= 2,
      dates: [
        {
          label: 'Plan audit transmis',
          value: company.workflow.audit.dateTransmissionPlan,
          icon: 'i-lucide-calendar-days'
        },
        {
          label: 'Période audit planifiée',
          value: company.workflow.audit.dateDebutPlanifiee && company.workflow.audit.dateFinPlanifiee ? 
            `${company.workflow.audit.dateDebutPlanifiee} - ${company.workflow.audit.dateFinPlanifiee}` : undefined,
          icon: 'i-lucide-calendar-check'
        },
        {
          label: 'Audit réalisé',
          value: company.workflow.audit.dateDebutReelle && company.workflow.audit.dateFinReelle ? 
            `${company.workflow.audit.dateDebutReelle} - ${company.workflow.audit.dateFinReelle}` : undefined,
          icon: 'i-lucide-clipboard-check'
        }
      ]
    },
    {
      title: 'Décision',
      icon: 'i-lucide-scale',
      value: 'decision',
      completed: currentStepIndex >= 3,
      dates: [
        {
          label: 'Rapport simplifié transmis',
          value: company.workflow.rapport.rapportSimplifie?.dateTransmission,
          icon: 'i-lucide-file-text'
        },
        {
          label: 'Rapport détaillé transmis',
          value: company.workflow.rapport.rapportDetaille?.dateTransmission,
          icon: 'i-lucide-file-chart-line'
        },
        {
          label: 'Avis de labellisation émis',
          value: company.workflow.avis.dateTransmission,
          icon: 'i-lucide-message-square'
        }
      ]
    },
    {
      title: 'Labellisé',
      icon: 'i-lucide-award',
      value: 'labeled',
      completed: currentStepIndex >= 4,
      dates: [
        {
          label: 'Attestation transmise',
          value: company.workflow.attestation.dateTransmission,
          icon: 'i-lucide-certificate'
        },
        {
          label: 'Validité de l\'attestation',
          value: company.workflow.attestation.dateValidite,
          icon: 'i-lucide-calendar'
        }
      ]
    }
  ]
});

// Étape actuelle basée sur l'état du workflow
const currentStepValue = computed(() => {
  return company.workflow.state;
});

// Fonction pour déterminer le statut d'une étape
function getStepStatus(stepValue: string): 'completed' | 'current' | 'pending' {
  if (!company) return 'pending';
  
  const currentIndex = stepOrder.indexOf(company.workflow.state);
  const stepIndex = stepOrder.indexOf(stepValue);
  
  console.log(`Step: ${stepValue}, Current: ${company.workflow.state}, CurrentIndex: ${currentIndex}, StepIndex: ${stepIndex}`);
  
  if (stepIndex < currentIndex) {
    return 'completed';
  } else if (stepIndex === currentIndex) {
    return 'current';
  } else {
    return 'pending';
  }
}

// Configuration des tabs
const tabItems = ref([
  {
    label: 'Documents',
    icon: 'i-lucide-folder',
    slot: 'documents',
    value: 'documents'
  },
  {
    label: 'Candidature',
    icon: 'i-lucide-file-text',
    slot: 'candidature',
    value: 'candidature'
  },
  {
    label: 'Engagement',
    icon: 'i-lucide-handshake',
    slot: 'engagement',
    value: 'engagement'
  },
  {
    label: 'Audit',
    icon: 'i-lucide-search',
    slot: 'audit',
    value: 'audit'
  },
  {
    label: 'Décision',
    icon: 'i-lucide-scale',
    slot: 'decision',
    value: 'decision'
  }
]);

// Mapping des types d'alertes vers les couleurs Nuxt UI - couleurs douces
const alertColorMapping: Record<string, 'warning' | 'info' | 'success'> = {
  warning: 'warning', 
  info: 'info',
  success: 'success'
};

// Gestion des alertes
function dismissAlert(alertId: string) {
  if (company && company.workflow.alerts) {
    const index = company.workflow.alerts.findIndex(alert => alert.id === alertId);
    if (index !== -1) {
      company.workflow.alerts.splice(index, 1);
    }
  }
}
</script>

<template>
  <UDashboardPanel id="labeling-case-detail">
    <template #header>
      <NavBar />
    </template>
    
    <template #body>
      <!-- Container principal avec 80% de largeur -->
      <div class="w-4/5 mx-auto">
        <!-- Card principale avec informations du dossier -->
        <UCard class="mb-6">
          <div class="flex items-start gap-6">
            <!-- Icône dossier à gauche avec badge type -->
            <div class="flex-shrink-0 flex flex-col items-center gap-3">
              <UIcon 
                name="i-lucide-folder-check" 
                class="w-16 h-16 text-primary"
              />
              <UBadge 
                :variant="company.workflow.type === 'Initial' ? 'solid' : 'outline'"
                :color="company.workflow.type === 'Initial' ? 'primary' : 'warning'"
                size="lg"
              >
                {{ company.workflow.type }}
              </UBadge>
            </div>
            
            <!-- Informations principales -->
            <div class="flex-1 grid grid-cols-3 gap-6">
              <!-- Colonne 1: Entreprise -->
              <div>
                <h1 class="font-bold text-xl text-gray-900 mb-4">Entreprise</h1>
                
                <div class="space-y-3">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-gray-600">Nom:</span>
                    <NuxtLink :to="`/feef/companies/${company.id}`" class="text-gray-900 font-medium hover:text-primary hover:underline cursor-pointer">
                      {{ company.raisonSociale.nom }}
                    </NuxtLink>
                  </div>
                  
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-gray-600">SIREN:</span>
                    <span class="text-gray-900">{{ company.raisonSociale.siren }}</span>
                  </div>
                  
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-gray-600">Localisation:</span>
                    <span class="text-gray-900">{{ company.raisonSociale.ville }}, {{ company.raisonSociale.region }}</span>
                  </div>
                </div>
              </div>
              
              <!-- Colonne 2: Pilote -->
              <div>
                <h2 class="font-bold text-xl text-gray-900 mb-4">Pilote démarche</h2>
                
                <div class="space-y-3">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-gray-600">Nom:</span>
                    <span class="text-gray-900 font-medium">{{ company.pilote.prenom }} {{ company.pilote.nom }}</span>
                  </div>
                  
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-gray-600">Fonction:</span>
                    <span class="text-gray-900">{{ company.pilote.fonction }}</span>
                  </div>
                  
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-phone" class="w-4 h-4 text-gray-500" />
                    <span class="text-gray-900">{{ company.pilote.telephone }}</span>
                  </div>
                  
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-mail" class="w-4 h-4 text-gray-500" />
                    <a :href="`mailto:${company.pilote.email}`" class="text-primary hover:underline">
                      {{ company.pilote.email }}
                    </a>
                  </div>
                </div>
              </div>
              
              <!-- Colonne 3: Organisme Évaluateur -->
              <div>
                <h2 class="font-bold text-xl text-gray-900 mb-4">Organisme Évaluateur</h2>
                
                <div class="space-y-3">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-gray-600">OE:</span>
                    <span class="text-gray-900 font-medium">{{ company.workflow.partageOE }}</span>
                  </div>
                  
                  <div v-if="company.workflow.audit.auditeur.nom" class="flex items-center gap-2">
                    <span class="text-sm font-medium text-gray-600">Auditeur:</span>
                    <span class="text-gray-900">{{ company.workflow.audit.auditeur.prenom }} {{ company.workflow.audit.auditeur.nom }}</span>
                  </div>
                  

                </div>
              </div>
            </div>
          </div>
          
          <!-- Périmètre de labellisation -->
          <div v-if="company.perimetreLabellisation" class="mt-6 pt-4 border-t border-gray-200">
            <div class="flex items-start gap-3">
              <UIcon name="i-lucide-target" class="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 class="font-semibold text-gray-900 mb-2">Périmètre de labellisation</h3>
                <p class="text-gray-700 text-sm leading-relaxed">
                  {{ company.perimetreLabellisation }}
                </p>
              </div>
            </div>
          </div>

        </UCard>
        
        <!-- Section des alertes -->
        <div v-if="company.workflow.alerts && company.workflow.alerts.length > 0" class="mb-6">
          <div class="space-y-2">
            <UAlert
              v-for="alert in company.workflow.alerts"
              :key="alert.id"
              :color="alertColorMapping[alert.type]"
              variant="subtle"
              :description="alert.description"
              :icon="alert.icon"
              :close="alert.dismissible"
              @update:open="dismissAlert(alert.id)"
            />
          </div>
        </div>
        
      </div>
      
      <!-- Stepper des étapes de labellisation - pleine largeur -->
      <div class="w-full px-8 mb-6">
        <UStepper 
          :items="stepperItems" 
          :model-value="3"
          color="primary"
          size="lg"
          class="w-full"
        >
          <template #indicator="{ item }">
            <div 
              :class="[
                'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors',
                getStepStatus(item.value) === 'completed'
                  ? 'bg-green-500 border-green-500 text-white'
                  : getStepStatus(item.value) === 'current'
                  ? 'bg-primary border-primary text-white'
                  : 'bg-white border-gray-300 text-gray-400'
              ]"
            >
              <UIcon 
                v-if="getStepStatus(item.value) === 'completed'"
                name="i-lucide-check" 
                class="w-4 h-4" 
              />
              <UIcon 
                v-else
                :name="item.icon" 
                class="w-4 h-4" 
              />
            </div>
          </template>
          
          <template #description="{ item }">
            <div class="space-y-1 text-sm">
              <div v-if="item.dates && item.dates.length > 0" class="space-y-1">
                <div v-for="date in item.dates" :key="date.label" class="flex items-center gap-2 text-xs">
                  <UIcon :name="date.icon" class="w-3 h-3 text-gray-500" />
                  <span class="text-gray-600">{{ date.label }}:</span>
                  <span class="text-gray-900 font-medium">{{ date.value || 'Non défini' }}</span>
                </div>
              </div>
            </div>
          </template>
        </UStepper>
      </div>
      
      <!-- Tabs pour les différentes sections -->
      <div class="w-full px-6 mb-6">
        <UTabs :items="tabItems" default-value="documents" class="w-full" orientation="horizontal">
          <template #documents>
            <DocumentsTab :company="company" />
          </template>
          
          <template #candidature>
            <CandidatureTab :company="company" />
          </template>
          
          <template #engagement>
            <EngagementTab :company="company" />
          </template>
          
          <template #audit>
            <AuditTab :company="company" />
          </template>
          
          <template #decision>
            <DecisionTab :company="company" />
          </template>
        </UTabs>
      </div>
    </template>
  </UDashboardPanel>
</template>
