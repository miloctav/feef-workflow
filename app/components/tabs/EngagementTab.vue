<template>
  <div class="bg-gray-50 rounded-b-lg p-6 min-h-[300px]">
    <!-- Sélecteur de phase d'engagement -->
    <div class="bg-white p-4 rounded-lg border border-gray-200 mb-6">
      <div class="flex items-center gap-4 mb-4">
        <UIcon name="i-lucide-settings" class="w-5 h-5 text-gray-600" />
        <h4 class="font-medium text-gray-900">Simulateur de phase d'engagement</h4>
      </div>
      
      <div class="flex gap-6">
        <label v-for="option in phaseOptions" :key="option.value" class="flex items-center gap-2 cursor-pointer">
          <input
            v-model="selectedPhase"
            :value="option.value"
            type="radio"
            name="engagementPhase"
            class="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
          />
          <span class="text-sm text-gray-700">{{ option.label }}</span>
        </label>
      </div>
      
      <div class="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
        <p class="text-sm text-blue-800">
          <UIcon name="i-lucide-info" class="w-4 h-4 inline mr-1" />
          {{ phaseDescriptions[selectedPhase as keyof typeof phaseDescriptions] }}
        </p>
      </div>
    </div>

    <div class="flex items-start gap-4 mb-6">
      <UIcon name="i-lucide-handshake" class="w-6 h-6 text-primary mt-1" />
      <div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Phase d'engagement</h3>
        <p class="text-gray-600 text-sm">Suivi du contrat avec l'Organisme Évaluateur</p>
      </div>
    </div>
    <div class="space-y-8">
      <!-- Section 0: Informations d'engagement -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-users" class="w-5 h-5 text-indigo-600" />
            <h4 class="font-semibold">Informations d'engagement</h4>
          </div>
        </template>

        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <!-- Choix de l'OE -->
          <div :class="[
            'text-center p-4 rounded-lg border',
            simulatedData.workflow.partageOE !== 'Non choisi'
              ? 'bg-green-50 border-green-200' 
              : 'bg-orange-50 border-orange-200'
          ]">
            <UIcon 
              :name="simulatedData.workflow.partageOE !== 'Non choisi' ? 'i-lucide-building-2' : 'i-lucide-help-circle'" 
              :class="[
                'w-6 h-6 mx-auto mb-2',
                simulatedData.workflow.partageOE !== 'Non choisi' ? 'text-green-600' : 'text-orange-600'
              ]" 
            />
            <h5 class="text-sm font-medium text-gray-900 mb-1">Organisme Évaluateur</h5>
            <div class="space-y-2">
              <UBadge 
                :color="simulatedData.workflow.partageOE !== 'Non choisi' ? 'success' : 'warning'" 
                variant="solid" 
                size="xs"
              >
                {{ simulatedData.workflow.partageOE !== 'Non choisi' ? 'Choisi' : 'À sélectionner' }}
              </UBadge>
              
              <div v-if="simulatedData.workflow.partageOE !== 'Non choisi'">
                <p class="text-xs font-medium text-green-800">{{ simulatedData.workflow.partageOE }}</p>
                <p class="text-xs text-gray-600">{{ simulatedData.workflow.audit.type || 'Type d\'audit défini' }}</p>
                <p class="text-xs text-blue-600 mt-1">
                  <UIcon name="i-lucide-calendar" class="w-3 h-3 mr-1 inline" />
                  Audit souhaité : {{ company.auditSouhaite?.moisAudit || 'Non défini' }}
                </p>
              </div>
              
              <div v-else>
                <p class="text-xs text-gray-500">Choix de l'OE par l'entreprise</p>
                <p class="text-xs text-gray-400 mt-1">En attente de sélection</p>
              </div>
            </div>
          </div>

          <!-- Devis mis en ligne -->
          <div 
            :class="[
              'text-center p-4 rounded-lg border transition-all',
              simulatedData.workflow.partageOE === 'Non choisi'
                ? 'bg-gray-100 border-gray-300 opacity-50'
                : simulatedData.workflow.contratOE.devisEnLigne 
                  ? 'bg-blue-50 border-blue-200 cursor-pointer hover:bg-blue-100 hover:shadow-md group' 
                  : 'bg-yellow-50 border-yellow-200'
            ]"
            @click="simulatedData.workflow.contratOE.devisEnLigne && simulatedData.workflow.partageOE !== 'Non choisi' ? viewContract() : null"
          >
            <UIcon 
              :name="simulatedData.workflow.partageOE === 'Non choisi'
                ? 'i-lucide-lock' 
                : simulatedData.workflow.contratOE.devisEnLigne 
                  ? 'i-lucide-file-text' 
                  : 'i-lucide-upload'" 
              :class="[
                'w-6 h-6 mx-auto mb-2 transition-transform',
                simulatedData.workflow.partageOE === 'Non choisi'
                  ? 'text-gray-400'
                  : simulatedData.workflow.contratOE.devisEnLigne 
                    ? 'text-blue-600 group-hover:scale-110' 
                    : 'text-yellow-600'
              ]" 
            />
            <h5 class="text-sm font-medium text-gray-900 mb-1">Devis en ligne</h5>
            <div class="space-y-2">
              <p class="text-xs font-medium" :class="
                simulatedData.workflow.partageOE === 'Non choisi'
                  ? 'text-gray-500' 
                  : simulatedData.workflow.contratOE.devisEnLigne 
                    ? 'text-blue-800' 
                    : 'text-yellow-700'
              ">
                {{ simulatedData.workflow.partageOE === 'Non choisi'
                  ? 'OE requis' 
                  : simulatedData.workflow.contratOE.devisEnLigne || 'Prêt à mettre en ligne' }}
              </p>
              
              <!-- Actions selon l'état -->
              <div v-if="simulatedData.workflow.contratOE.devisEnLigne && simulatedData.workflow.partageOE !== 'Non choisi'" class="space-y-1">
                <div class="flex items-center justify-center gap-1 text-xs text-gray-600">
                  <span>Cliquer pour consulter</span>
                  <UIcon name="i-lucide-external-link" class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p class="text-xs text-gray-500">
                  <UIcon name="i-lucide-user" class="w-3 h-3 mr-1 inline" />
                  Mis en ligne par : {{ simulatedData.workflow.contratOE.devisMisEnLignePar }}
                </p>
              </div>
              
              <div v-else-if="simulatedData.workflow.partageOE === 'Non choisi'" class="text-xs text-gray-500">
                En attente de choix d'OE
              </div>
              
              <div v-else>
                <UButton
                  @click="publishQuote"
                  color="primary"
                  size="xs"
                  icon="i-lucide-upload"
                  class="mt-1"
                >
                  Mettre en ligne
                </UButton>
                <p class="text-xs text-gray-500 mt-1">Action OE/FEEF</p>
              </div>
            </div>
          </div>

          <!-- Devis signé -->
          <div :class="[
            'text-center p-4 rounded-lg border',
            simulatedData.workflow.partageOE === 'Non choisi'
              ? 'bg-gray-100 border-gray-300 opacity-50'
              : simulatedData.workflow.contratOE.contratSigne 
                ? 'bg-purple-50 border-purple-200' 
                : simulatedData.workflow.contratOE.devisEnLigne 
                  ? 'bg-yellow-50 border-yellow-200' 
                  : 'bg-gray-50 border-gray-200 opacity-60'
          ]">
            <UIcon 
              :name="simulatedData.workflow.partageOE === 'Non choisi'
                ? 'i-lucide-lock'
                : simulatedData.workflow.contratOE.contratSigne 
                  ? 'i-lucide-file-signature' 
                  : simulatedData.workflow.contratOE.devisEnLigne 
                    ? 'i-lucide-clock' 
                    : 'i-lucide-file-x'" 
              :class="[
                'w-6 h-6 mx-auto mb-2',
                simulatedData.workflow.partageOE === 'Non choisi'
                  ? 'text-gray-400'
                  : simulatedData.workflow.contratOE.contratSigne 
                    ? 'text-purple-600' 
                    : simulatedData.workflow.contratOE.devisEnLigne 
                      ? 'text-yellow-600' 
                      : 'text-gray-400'
              ]" 
            />
            <h5 class="text-sm font-medium text-gray-900 mb-1">Devis signé</h5>
            <div class="space-y-2">
              <UBadge 
                :color="simulatedData.workflow.partageOE === 'Non choisi'
                  ? 'neutral'
                  : simulatedData.workflow.contratOE.contratSigne 
                    ? 'success' 
                    : simulatedData.workflow.contratOE.devisEnLigne 
                      ? 'warning' 
                      : 'neutral'" 
                variant="solid" 
                size="xs"
              >
                {{ simulatedData.workflow.partageOE === 'Non choisi'
                  ? 'OE requis'
                  : simulatedData.workflow.contratOE.contratSigne 
                    ? 'Signé' 
                    : simulatedData.workflow.contratOE.devisEnLigne 
                      ? 'En attente de signature' 
                      : 'Devis non disponible' }}
              </UBadge>
              
              <div v-if="simulatedData.workflow.contratOE.contratSigne">
                <p class="text-xs text-gray-600">{{ simulatedData.workflow.contratOE.contratSigne }}</p>
                <p v-if="simulatedData.workflow.contratOE.signePar" class="text-xs text-gray-500">{{ simulatedData.workflow.contratOE.signePar }}</p>
              </div>
              
              <div v-else-if="simulatedData.workflow.contratOE.devisEnLigne && simulatedData.workflow.partageOE !== 'Non choisi'">
                <p class="text-xs text-gray-500">Signature par l'entreprise</p>
                <p class="text-xs text-gray-400 mt-1">En attente de l'entreprise</p>
              </div>
              
              <div v-else>
                <p class="text-xs text-gray-600">Non signé</p>
              </div>
            </div>
          </div>
        </div>
      </UCard>

    <!-- DocumentViewer pour consulter le contrat -->
    <DocumentViewer
      :document="currentDocument"
      v-model:open="showDocumentViewer"
    />

    </div>
  </div>
</template>

<script setup lang="ts">
import { DOCUMENTS, ORGANISMES_EVALUATEURS } from '~/utils/data'
import type { Documents } from '~/utils/data'

interface Props {
  company: any
}

const props = defineProps<Props>()

// État pour le DocumentViewer
const showDocumentViewer = ref(false)
const currentDocument = ref<Documents | undefined>()

// Phase d'engagement sélectionnée
const selectedPhase = ref('phase0')

// Options pour les organismes évaluateurs
const oeOptions = ORGANISMES_EVALUATEURS
const editedOE = ref('')

// Options pour les phases
const phaseOptions = [
  { value: 'phase0', label: 'Phase 0 - OE non choisi' },
  { value: 'phase1', label: 'Phase 1 - OE choisi' },
  { value: 'phase2', label: 'Phase 2 - Devis en ligne' },
  { value: 'phase3', label: 'Phase 3 - Devis signé' }
]

// Descriptions des phases
const phaseDescriptions = {
  'phase0': 'L\'entreprise n\'a pas encore choisi son Organisme Évaluateur parmi les options disponibles.',
  'phase1': 'L\'entreprise a sélectionné son Organisme Évaluateur. Le devis peut être préparé et mis en ligne.',
  'phase2': 'Le devis a été mis en ligne par l\'OE ou la FEEF et est disponible pour signature.',
  'phase3': 'Le devis a été signé par l\'entreprise. La phase d\'engagement est complète.'
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
          partageOE: 'Non choisi',
          audit: {
            type: 'Non défini',
            dureeAudit: 'Non définie'
          },
          contratOE: {
            contratSigne: null,
            signePar: null,
            devisEnLigne: null,
            devisValide: null,
            paiement: null
          }
        }
      }
    case 'phase1':
      return {
        ...baseData,
        workflow: {
          partageOE: props.company.workflow.partageOE,
          audit: {
            type: props.company.workflow.audit.type,
            dureeAudit: props.company.workflow.audit.dureeAudit
          },
          contratOE: {
            contratSigne: null,
            signePar: null,
            devisEnLigne: null,
            devisValide: null,
            paiement: null
          }
        }
      }
    case 'phase2':
      return {
        ...baseData,
        workflow: {
          partageOE: props.company.workflow.partageOE,
          audit: {
            type: props.company.workflow.audit.type,
            dureeAudit: props.company.workflow.audit.dureeAudit
          },
          contratOE: {
            contratSigne: null,
            signePar: null,
            devisEnLigne: '15/8/2025',
            devisMisEnLignePar: 'Marie Dubois (FEEF)',
            devisValide: null,
            paiement: null
          }
        }
      }
    case 'phase3':
      return {
        ...baseData,
        workflow: {
          partageOE: props.company.workflow.partageOE,
          audit: {
            type: props.company.workflow.audit.type,
            dureeAudit: props.company.workflow.audit.dureeAudit
          },
          contratOE: {
            contratSigne: '20/8/2025',
            signePar: props.company.workflow.contratOE.signePar,
            devisEnLigne: '15/8/2025',
            devisMisEnLignePar: 'Marie Dubois (FEEF)',
            devisValide: '16/8/2025',
            paiement: '21/8/2025'
          }
        }
      }
    default:
      return props.company
  }
})

// Trouver le devis OE dans les documents
const contractDocument = computed(() => {
  return DOCUMENTS.find(doc => doc.id === 'contrat-labellisation')
})

// Fonction pour ouvrir le devis dans le DocumentViewer
const viewContract = () => {
  if (contractDocument.value && simulatedData.value.workflow.contratOE.devisEnLigne) {
    currentDocument.value = contractDocument.value
    showDocumentViewer.value = true
  }
}

// Fonctions pour les actions FEEF/OE (factices)
const publishQuote = () => {
  selectedPhase.value = 'phase2'
}
</script>
