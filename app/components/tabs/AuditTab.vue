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

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <p class="text-xs text-green-800">Transmis le : {{ simulatedData.workflow.audit.revueDocumentaire.dateTransmission }}</p>
                <p class="text-xs text-blue-800">Partagés le : {{ simulatedData.workflow.audit.revueDocumentaire.datePartage }}</p>
                <p class="text-xs text-gray-600">{{ simulatedData.workflow.audit.revueDocumentaire.documentsManquants || 0 }} docs manquants</p>
              </div>
              
              <div v-else>
                <p class="text-xs text-orange-700">{{ simulatedData.workflow.audit.revueDocumentaire.documentsManquants || 0 }} docs à transmettre</p>
                <p class="text-xs text-gray-500">Transmission en cours</p>
              </div>
            </div>
          </div>

          <!-- Plan d'audit -->
          <div :class="[
            'text-center p-4 rounded-lg border',
            simulatedData.workflow.audit.planAuditDisponible
              ? 'bg-blue-50 border-blue-200 cursor-pointer hover:bg-blue-100 hover:shadow-md group' 
              : simulatedData.workflow.audit.revueDocumentaire.documentsTransmis
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-gray-100 border-gray-300 opacity-50'
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
            <h5 class="text-sm font-medium text-gray-900 mb-1">Plan d'audit</h5>
            <div class="space-y-2">
              <UBadge 
                :color="!simulatedData.workflow.audit.revueDocumentaire.documentsTransmis
                  ? 'neutral'
                  : simulatedData.workflow.audit.planAuditDisponible 
                    ? 'success' 
                    : 'warning'" 
                variant="solid" 
                size="xs"
              >
                {{ !simulatedData.workflow.audit.revueDocumentaire.documentsTransmis
                  ? 'Documents requis'
                  : simulatedData.workflow.audit.planAuditDisponible 
                    ? 'Disponible' 
                    : 'En préparation' }}
              </UBadge>
              
              <div v-if="simulatedData.workflow.audit.planAuditDisponible">
                <p class="text-xs text-blue-800">{{ simulatedData.workflow.audit.dateTransmissionPlan }}</p>
                <p class="text-xs text-gray-600">Par {{ simulatedData.workflow.audit.planMisEnLignePar }}</p>
                <div class="flex items-center justify-center gap-1 text-xs text-gray-600">
                  <span>Cliquer pour consulter</span>
                  <UIcon name="i-lucide-external-link" class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              
              <div v-else-if="simulatedData.workflow.audit.revueDocumentaire.documentsTransmis">
                <UButton
                  @click="publishAuditPlan"
                  color="primary"
                  size="xs"
                  icon="i-lucide-upload"
                  class="mt-1"
                >
                  Mettre en ligne
                </UButton>
                <p class="text-xs text-gray-500 mt-1">Action FEEF/OE</p>
              </div>
              
              <div v-else>
                <p class="text-xs text-gray-500">En attente documents</p>
              </div>
            </div>
          </div>

          <!-- Dates d'audit -->
          <div :class="[
            'text-center p-4 rounded-lg border',
            !simulatedData.workflow.audit.revueDocumentaire.documentsTransmis
              ? 'bg-gray-100 border-gray-300 opacity-50'
              : simulatedData.workflow.audit.datesAuditPlanifiees 
                ? 'bg-indigo-50 border-indigo-200' 
                : 'bg-yellow-50 border-yellow-200'
          ]">
            <UIcon 
              :name="!simulatedData.workflow.audit.revueDocumentaire.documentsTransmis
                ? 'i-lucide-lock'
                : simulatedData.workflow.audit.datesAuditPlanifiees 
                  ? 'i-lucide-calendar-days' 
                  : 'i-lucide-calendar-plus'" 
              :class="[
                'w-6 h-6 mx-auto mb-2',
                !simulatedData.workflow.audit.revueDocumentaire.documentsTransmis
                  ? 'text-gray-400'
                  : simulatedData.workflow.audit.datesAuditPlanifiees 
                    ? 'text-indigo-600' 
                    : 'text-yellow-600'
              ]" 
            />
            <h5 class="text-sm font-medium text-gray-900 mb-1">Dates d'audit</h5>
            <div class="space-y-2">
              <UBadge 
                :color="!simulatedData.workflow.audit.revueDocumentaire.documentsTransmis
                  ? 'neutral'
                  : simulatedData.workflow.audit.datesAuditPlanifiees 
                    ? 'primary' 
                    : 'warning'" 
                variant="solid" 
                size="xs"
              >
                {{ !simulatedData.workflow.audit.revueDocumentaire.documentsTransmis
                  ? 'Documents requis'
                  : simulatedData.workflow.audit.datesAuditPlanifiees 
                    ? 'Planifiées' 
                    : 'À planifier' }}
              </UBadge>
              
              <div v-if="simulatedData.workflow.audit.datesAuditPlanifiees">
                <p class="text-xs text-indigo-800">{{ simulatedData.workflow.audit.dateDebutPlanifiee }} - {{ simulatedData.workflow.audit.dateFinPlanifiee }}</p>
                <p class="text-xs text-gray-600">{{ simulatedData.workflow.audit.auditeur.nom }} {{ simulatedData.workflow.audit.auditeur.prenom }}</p>
              </div>
              
              <div v-else-if="simulatedData.workflow.audit.revueDocumentaire.documentsTransmis">
                <UButton
                  color="primary"
                  size="xs"
                  icon="i-lucide-calendar"
                  class="mt-1"
                >
                  Planifier les dates
                </UButton>
                <p class="text-xs text-gray-500 mt-1">Action FEEF/OE</p>
              </div>
              
              <div v-else-if="simulatedData.workflow.audit.planAuditDisponible">
                <p class="text-xs text-gray-500">Planification en cours</p>
              </div>
              
              <div v-else>
                <p class="text-xs text-gray-500">En attente du plan</p>
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
                <p class="text-xs text-gray-500">Audit en cours</p>
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
    
    </div>
  </div>
</template>

<script setup lang="ts">
import { DOCUMENTS } from '~/utils/data'
import type { Documents } from '~/utils/data'

interface Props {
  company: any
}

const props = defineProps<Props>()

// État pour le DocumentViewer
const showDocumentViewer = ref(false)
const currentDocument = ref<Documents | undefined>()

// Phase d'audit sélectionnée
const selectedPhase = ref('phase0')

// Options pour les phases
const phaseOptions = [
  { value: 'phase0', label: 'Phase 0 - Transmission en cours' },
  { value: 'phase1', label: 'Phase 1 - Documents transmis' },
  { value: 'phase2', label: 'Phase 2 - Plan d\'audit disponible' },
  { value: 'phase3', label: 'Phase 3 - Audit terminé' }
]

// Descriptions des phases
const phaseDescriptions = {
  'phase0': 'La transmission des documents requis pour l\'audit est en cours.',
  'phase1': 'Tous les documents ont été transmis. L\'OE peut commencer l\'élaboration du plan d\'audit.',
  'phase2': 'Le plan d\'audit a été mis en ligne avec les dates et informations de déroulement.',
  'phase3': 'L\'audit a été réalisé et est maintenant terminé.'
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
            dateTransmissionPlan: '18/8/2025',
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
    case 'phase3':
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
            dateTransmissionPlan: '18/8/2025',
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

// Fonction pour mettre le plan d'audit en ligne (action FEEF/OE)
const publishAuditPlan = () => {
  selectedPhase.value = 'phase2'
}
</script>
