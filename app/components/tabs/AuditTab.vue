<template>
  <div class="bg-gray-50 rounded-b-lg p-6 min-h-[300px]">
    <!-- Sélecteur de phase d'audit -->
    <div class="bg-white p-4 rounded-lg border border-gray-200 mb-6">
      <div class="flex items-center gap-4 mb-4">
        <UIcon name="i-lucide-settings" class="w-5 h-5 text-gray-600" />
        <h4 class="font-medium text-gray-900">Simulateur de phase d'audit</h4>
      </div>
      
      <div class="flex gap-6">
        <label v-for="option in phaseOptions" :key="option.value" class="flex items-center gap-2 cursor-pointer">
          <input 
            type="radio" 
            :value="option.value" 
            v-model="selectedPhase" 
            class="text-blue-600 focus:ring-blue-500" 
          />
          <span class="text-sm text-gray-700">{{ option.label }}</span>
        </label>
      </div>
      
      <div class="mt-3 p-3 bg-blue-50 rounded-lg">
        <p class="text-sm text-blue-800">{{ phaseDescriptions[selectedPhase as keyof typeof phaseDescriptions] }}</p>
      </div>
    </div>

    <div class="flex items-start gap-4 mb-6">
      <UIcon name="i-lucide-search" class="w-6 h-6 text-primary mt-1" />
      <div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Phase d'audit</h3>
        <p class="text-gray-600 text-sm">Suivi de l'audit réalisé par l'Organisme Évaluateur</p>
      </div>
    </div>
    
    <div class="space-y-8">
      <!-- Section 0: Informations d'audit -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-clipboard-check" class="w-5 h-5 text-purple-600" />
            <h4 class="font-semibold">Informations d'audit</h4>
          </div>
        </template>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Transmission des documents -->
          <div :class="[
            'text-center p-4 rounded-lg border',
            simulatedData.workflow.audit.revueDocumentaire.documentsTransmis
              ? 'bg-green-50 border-green-200' 
              : 'bg-orange-50 border-orange-200'
          ]">
            <UIcon 
              :name="simulatedData.workflow.audit.revueDocumentaire.documentsTransmis ? 'i-lucide-file-check' : 'i-lucide-file-x'" 
              :class="[
                'w-6 h-6 mx-auto mb-2',
                simulatedData.workflow.audit.revueDocumentaire.documentsTransmis ? 'text-green-600' : 'text-orange-600'
              ]" 
            />
            <h5 class="text-sm font-medium text-gray-900 mb-1">Documents</h5>
            <div class="space-y-2">
              <UBadge 
                :color="simulatedData.workflow.audit.revueDocumentaire.documentsTransmis ? 'success' : 'warning'" 
                variant="solid" 
                size="xs"
              >
                {{ simulatedData.workflow.audit.revueDocumentaire.documentsTransmis ? 'Transmis' : 'En cours' }}
              </UBadge>
              
              <div v-if="simulatedData.workflow.audit.revueDocumentaire.documentsTransmis">
                <p class="text-xs text-blue-800">Partagés le : {{ simulatedData.workflow.audit.revueDocumentaire.datePartage }}</p>
                <p class="text-xs text-gray-600">{{ simulatedData.workflow.audit.revueDocumentaire.documentsManquants || 0 }} docs manquants</p>
              </div>
              
              <div v-else>
                <p class="text-xs text-orange-700">{{ simulatedData.workflow.audit.revueDocumentaire.documentsManquants || 0 }} docs à transmettre</p>
                <p class="text-xs text-gray-500">Transmission en cours</p>
              </div>
            </div>
          </div>

          <!-- Plan d'audit et Dates -->
          <div :class="[
            'text-center p-4 rounded-lg border',
            simulatedData.workflow.audit.planAuditDisponible
              ? 'bg-blue-50 border-blue-200 cursor-pointer hover:bg-blue-100 hover:shadow-md group' 
              : 'bg-yellow-50 border-yellow-200'
          ]"
          @click="simulatedData.workflow.audit.planAuditDisponible ? viewAuditPlan() : null"
          >
            <UIcon 
              :name="!simulatedData.workflow.audit.revueDocumentaire.documentsTransmis
                ? 'i-lucide-lock'
                : simulatedData.workflow.audit.planAuditDisponible 
                  ? 'i-lucide-calendar-check' 
                  : 'i-lucide-clock'" 
              :class="[
                'w-6 h-6 mx-auto mb-2 transition-transform',
                !simulatedData.workflow.audit.revueDocumentaire.documentsTransmis
                  ? 'text-gray-400'
                  : simulatedData.workflow.audit.planAuditDisponible 
                    ? 'text-blue-600 group-hover:scale-110' 
                    : 'text-yellow-600'
              ]" 
            />
            <h5 class="text-sm font-medium text-gray-900 mb-1">Plan d'audit et Dates</h5>
            <div class="space-y-2">
              <UBadge 
                :color="!simulatedData.workflow.audit.revueDocumentaire.documentsTransmis
                  ? 'warning'
                  : simulatedData.workflow.audit.planAuditDisponible 
                    ? 'success' 
                    : 'warning'" 
                variant="solid" 
                size="xs"
              >
                {{ !simulatedData.workflow.audit.revueDocumentaire.documentsTransmis
                  ? 'En attente'
                  : simulatedData.workflow.audit.planAuditDisponible 
                    ? 'Disponible' 
                    : 'En préparation' }}
              </UBadge>
                <!-- Bouton pour OE en phase0 -->
                <div v-if="props.role === 'oe' && selectedPhase === 'phase0'">
                  <UButton color="primary" size="sm" icon="i-lucide-plus" @click.stop="addAuditPlanDates">
                    Ajouter le plan et les dates d'audit
                  </UButton>
                </div>
              
              <div v-if="simulatedData.workflow.audit.planAuditDisponible">
                <!-- Informations du plan d'audit -->
                <div class="mb-2">
                  <p class="text-xs font-medium text-gray-900">Plan d'audit disponible</p>
                  <p class="text-xs text-gray-700">{{ simulatedData.workflow.audit.dateTransmissionPlan }}</p>
                </div>
                
                <!-- Informations des dates d'audit -->
                <div v-if="simulatedData.workflow.audit.datesAuditPlanifiees" class="mb-2">
                  <p class="text-xs font-medium text-gray-900">Dates d'audit prévisionnelles</p>
                  <p class="text-xs text-gray-700">{{ simulatedData.workflow.audit.dateDebutPlanifiee }} - {{ simulatedData.workflow.audit.dateFinPlanifiee }}</p>
                </div>
                
                <div class="flex items-center justify-center gap-1 text-xs text-gray-600">
                  <span>Cliquer pour consulter le plan</span>
                  <UIcon name="i-lucide-external-link" class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              
              
            </div>
          </div>

          <!-- Audit terminé -->
          <div :class="[
            'text-center p-4 rounded-lg border',
            !simulatedData.workflow.audit.datesAuditPlanifiees
              ? 'bg-gray-100 border-gray-300 opacity-50'
              : simulatedData.workflow.audit.auditTermine 
                ? 'bg-emerald-50 border-emerald-200' 
                : 'bg-amber-50 border-amber-200'
          ]">
            <UIcon 
              :name="!simulatedData.workflow.audit.datesAuditPlanifiees
                ? 'i-lucide-lock'
                : simulatedData.workflow.audit.auditTermine 
                  ? 'i-lucide-check-circle-2' 
                  : 'i-lucide-play'" 
              :class="[
                'w-6 h-6 mx-auto mb-2',
                !simulatedData.workflow.audit.datesAuditPlanifiees
                  ? 'text-gray-400'
                  : simulatedData.workflow.audit.auditTermine 
                    ? 'text-emerald-600' 
                    : 'text-amber-600'
              ]" 
            />
            <h5 class="text-sm font-medium text-gray-900 mb-1">Audit</h5>
            <div class="space-y-2">
              <UBadge 
                :color="!simulatedData.workflow.audit.datesAuditPlanifiees
                  ? 'neutral'
                  : simulatedData.workflow.audit.auditTermine 
                    ? 'success' 
                    : 'warning'" 
                variant="solid" 
                size="xs"
              >
                {{ !simulatedData.workflow.audit.datesAuditPlanifiees
                  ? 'Dates requises'
                  : simulatedData.workflow.audit.auditTermine 
                    ? 'Terminé' 
                    : 'En cours' }}
              </UBadge>
              
              <div v-if="simulatedData.workflow.audit.auditTermine">
                <p class="text-xs text-emerald-800">{{ simulatedData.workflow.audit.dateDebutReelle }} - {{ simulatedData.workflow.audit.dateFinReelle }}</p>
                <p class="text-xs text-gray-600">Audit réalisé</p>
                <UButton
                  color="neutral"
                  size="xs"
                  icon="i-lucide-edit"
                  class="mt-1"
                  disabled
                >
                  Modifier les dates
                </UButton>
                <p class="text-xs text-gray-500 mt-1">Action FEEF/OE</p>
              </div>
              
              <div v-else-if="simulatedData.workflow.audit.datesAuditPlanifiees">
                <p class="text-xs text-emerald-800">{{ simulatedData.workflow.audit.dateDebutPlanifiee }} - {{ simulatedData.workflow.audit.dateFinPlanifiee }}</p>
                <p class="text-xs text-gray-500">Audit en préparation</p>
                <UButton
                  color="neutral"
                  size="xs"
                  icon="i-lucide-edit"
                  class="mt-1"
                  disabled
                >
                  Modifier les dates
                </UButton>
                <p class="text-xs text-gray-500 mt-1">Action FEEF/OE</p>
              </div>
              
              <div v-else>
                <p class="text-xs text-gray-500">En attente dates</p>
              </div>
            </div>
          </div>
        </div>
      </UCard>

    <!-- DocumentViewer pour consulter les documents d'audit -->
    <DocumentViewer
      :document="currentDocument"
      v-model:open="showDocumentViewer"
    />
    Ajouter la liste des documents demandés par l'OE
    </div>
    
  </div>
</template>

<script setup lang="ts">
import { DOCUMENTS } from '~/utils/data'
import type { Documents } from '~/utils/data'

interface Props {
  company: any
  role?: 'oe' | 'feef'
}

const props = withDefaults(defineProps<Props>(), {
  role: 'feef'
})

// État pour le DocumentViewer
const showDocumentViewer = ref(false)
const currentDocument = ref<Documents | undefined>()

// Phase d'audit sélectionnée
const selectedPhase = ref('phase0')

// Options pour les phases
const phaseOptions = [
  { value: 'phase0', label: 'Phase 0 - Transmission en cours' },
  { value: 'phase1', label: 'Phase 1 - Documents et plan d\'audit transmis' },
  { value: 'phase2', label: 'Phase 2 - Audit terminé' }
]

// Descriptions des phases
const phaseDescriptions = {
  'phase0': 'La transmission des documents requis pour l\'audit est en cours.',
  'phase1': 'Tous les documents ont été transmis avec le plan d\'audit et les dates d\'audit planifiées par l\'OE.',
  'phase2': 'L\'audit a été réalisé et est maintenant terminé.'
}

// Données simulées basées sur la phase
const simulatedData = computed(() => {
  const baseData = {
    auditSouhaite: props.company.auditSouhaite
  }

  switch (selectedPhase.value) {
    case 'phase0':
      return {
        ...baseData,
        workflow: {
          audit: {
            revueDocumentaire: {
              documentsTransmis: false,
              dateTransmission: null,
              datePartage: null,
              documentsManquants: 3
            },
            planAuditDisponible: false,
            dateTransmissionPlan: null,
            planMisEnLignePar: null,
            datesAuditPlanifiees: false,
            dateDebutPlanifiee: null,
            dateFinPlanifiee: null,
            auditTermine: false,
            dateDebutReelle: null,
            dateFinReelle: null,
            auditeur: {
              nom: 'Dupont',
              prenom: 'Jean'
            }
          }
        }
      }
    case 'phase1':
      return {
        ...baseData,
        workflow: {
          audit: {
            revueDocumentaire: {
              documentsTransmis: true,
              dateTransmission: '10/8/2025',
              datePartage: '12/8/2025',
              documentsManquants: 0
            },
            planAuditDisponible: true,
            dateTransmissionPlan: '12/8/2025',
            planMisEnLignePar: 'Pierre Martin (SGS)',
            datesAuditPlanifiees: true,
            dateDebutPlanifiee: '25/8/2025',
            dateFinPlanifiee: '27/8/2025',
            auditTermine: false,
            dateDebutReelle: null,
            dateFinReelle: null,
            auditeur: {
              nom: 'Dupont',
              prenom: 'Jean'
            }
          }
        }
      }
    case 'phase2':
      return {
        ...baseData,
        workflow: {
          audit: {
            revueDocumentaire: {
              documentsTransmis: true,
              dateTransmission: '10/8/2025',
              datePartage: '12/8/2025',
              documentsManquants: 0
            },
            planAuditDisponible: true,
            dateTransmissionPlan: '12/8/2025',
            planMisEnLignePar: 'Pierre Martin (SGS)',
            datesAuditPlanifiees: true,
            dateDebutPlanifiee: '25/8/2025',
            dateFinPlanifiee: '27/8/2025',
            auditTermine: true,
            dateDebutReelle: '25/8/2025',
            dateFinReelle: '27/8/2025',
            auditeur: {
              nom: 'Dupont',
              prenom: 'Jean'
            }
          }
        }
      }
    default:
      return props.company
  }
})

// Trouver le plan d'audit dans les documents
const auditPlanDocument = computed(() => {
  return DOCUMENTS.find(doc => doc.id === 'plan-audit')
})

// Fonction pour ouvrir le plan d'audit dans le DocumentViewer
const viewAuditPlan = () => {
  if (auditPlanDocument.value && simulatedData.value.workflow.audit.planAuditDisponible) {
    currentDocument.value = auditPlanDocument.value
    showDocumentViewer.value = true
  }
}

// Fonction pour OE pour ajouter le plan et les dates d'audit en phase0
function addAuditPlanDates() {
  
}
</script>
