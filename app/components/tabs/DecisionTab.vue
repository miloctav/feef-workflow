<template>
  <div class="bg-gray-50 rounded-b-lg p-6 min-h-[300px]">
    <!-- Sélecteur de phase de décision -->
    <PhaseSelector 
      v-model:selectedPhase="selectedPhase" 
    />

    <div class="flex items-start gap-4 mb-6">
      <UIcon name="i-lucide-scale" class="w-6 h-6 text-primary mt-1" />
      <div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Phase de décision</h3>
        <p class="text-gray-600 text-sm">Analyse du rapport et émission de l'avis</p>
      </div>
    </div>
    
    <!-- Rapports d'audit -->
    <AuditReportsCard 
      :rapport="simulatedData.workflow.rapport.rapport"
      :performance-globale="simulatedData.workflow.rapport.performanceGlobale"
      :selected-phase="selectedPhase"
      :role="props.role"
      @view-rapport="viewRapport"
    />
    
    <!-- Plan d'action corrective -->
    <ActionPlanCard 
      :plan-action="simulatedData.workflow.rapport.planAction"
      :performance-globale="simulatedData.workflow.rapport.performanceGlobale"
      :selected-phase="selectedPhase"
      :needs-plan-action="needsPlanAction"
      :role="props.role"
      @view-plan-action="viewPlanAction"
    />

    <!-- Avis de l'Organisme Évaluateur -->
    <OEOpinionCard 
      :avis="simulatedData.workflow.avis"
      :selected-phase="selectedPhase"
      @view-avis-labellisation="viewAvisLabellisation"
      :role="props.role"
    />
      
    <!-- Validation FEEF -->
    <FEEFValidationCard 
      v-if="['phase4'].includes(selectedPhase)"
      :avis="simulatedData.workflow.avis"
      :decision-f-e-e-f="simulatedData.workflow.avis.decisionFEEF"
      :attestation="simulatedData.workflow.attestation"
      :selected-phase="selectedPhase"
      @validate-labellisation="validateLabellisation"
      @sign-attestation-f-e-e-f="signAttestationFEEF"
      @check-entreprise-signature="checkEntrepriseSignature"
      @view-attestation="viewAttestation"
      :role="props.role"
    />

    <div v-if="['phase5','phase6'].includes(selectedPhase)" class="flex gap-6">
      <div class="w-1/2">
        <LicenseContractCard
          :is-signed="selectedPhase === 'phase6' || licenseSigned"
          :signed-date="licenseSignedDate"
          :selected-phase="selectedPhase"
          :role="props.role"
          @view-license="viewLicenseContract"
        />
      </div>
      <div class="w-1/2">
        <AttestationCard
          :can-view="selectedPhase === 'phase6'"
          :selected-phase="selectedPhase"
          @view-attestation="viewAttestation"
        />
      </div>
    </div>
    </div>

  <!-- Document Viewer -->
  <DocumentViewer 
    :document="selectedDocument" 
    v-model:open="documentViewer" 
  />

</template>

<script setup lang="ts">
import { select } from '#build/ui';
import { DOCUMENTS } from '~/utils/data'
import type { Company, Documents } from '~/utils/data'

interface Props {
  company: Company
  role?: 'oe' | 'feef' | 'company'
}

const props = withDefaults(defineProps<Props>(), {
  role: 'feef'
})

// Phase de décision sélectionnée
const selectedPhase = ref('phase0')

// Contrat de licence de marque
const licenseSigned = ref(false)
const licenseSignedDate = ref<string | undefined>()

// État pour le DocumentViewer
const documentViewer = ref(false)
const selectedDocument = ref<Documents | undefined>()

// Méthode pour voir le contrat de licence
function viewLicenseContract() {
  selectedDocument.value = {
    id: 'contrat-licence-marque',
    name: 'Contrat de licence de marque',
    description: 'Contrat officiel de licence de marque à signer par l\'entreprise',
    labelingCaseState: 'DECISION',
    isAvailable: true,
    dateUpload: licenseSignedDate.value,
    uploadedBy: 'FEEF - Direction',
    fileSize: '1.2 MB',
    fileType: 'PDF'
  }
  documentViewer.value = true
}

// Données simulées basées sur la phase
const simulatedData = computed(() => {
  const baseData = {
    ...props.company
  }

  switch (selectedPhase.value) {
    case 'phase0':
      return {
        ...baseData,
        workflow: {
          ...baseData.workflow,
          rapport: {
            rapport: { isAvailable: false, dateTransmission: null },
            performanceGlobale: undefined,
            planAction: { isAvailable: false, dateLimiteDepot: null }
          },
          avis: {
            avis: null,
            dateTransmission: null,
            argumentaire: null,
            absencePointsBloquants: undefined,
            avisLabellisation: { isAvailable: false, dateTransmission: null },
            decisionFEEF: { statut: null, dateDecision: null }
          },
          attestation: {
            dateTransmission: null,
            dateValidite: null,
            signatureFEEF: { isGenerated: false, dateSigned: null, signePar: null },
            signatureEntreprise: { isConfirmed: false, dateSigned: null, signePar: null }
          }
        }
      }
    case 'phase2':
      return {
        ...baseData,
        workflow: {
          ...baseData.workflow,
          rapport: {
            rapport: { isAvailable: true, dateTransmission: '15/8/2025' },
            performanceGlobale: 58,
            planAction: { isAvailable: false, dateLimiteDepot: '30/9/2025' }
          },
          avis: {
            avis: null,
            dateTransmission: null,
            argumentaire: null,
            absencePointsBloquants: undefined,
            avisLabellisation: { isAvailable: false, dateTransmission: null },
            decisionFEEF: { statut: null, dateDecision: null }
          },
          attestation: {
            dateTransmission: null,
            dateValidite: null,
            signatureFEEF: { isGenerated: false, dateSigned: null, signePar: null },
            signatureEntreprise: { isConfirmed: false, dateSigned: null, signePar: null }
          }
        }
      }
    case 'phase2b':
      return {
        ...baseData,
        workflow: {
          ...baseData.workflow,
          rapport: {
            rapport: { isAvailable: true, dateTransmission: '15/8/2025' },
            performanceGlobale: 58,
            planAction: { 
              isAvailable: true, 
              dateTransmission: '25/9/2025', 
              valideParOE: false, 
              dateValidation: null,
              enAttenteValidation: true
            }
          },
          avis: {
            avis: null,
            dateTransmission: null,
            argumentaire: null,
            absencePointsBloquants: undefined,
            avisLabellisation: { isAvailable: false, dateTransmission: null },
            decisionFEEF: { statut: null, dateDecision: null }
          },
          attestation: {
            dateTransmission: null,
            dateValidite: null,
            signatureFEEF: { isGenerated: false, dateSigned: null, signePar: null },
            signatureEntreprise: { isConfirmed: false, dateSigned: null, signePar: null }
          }
        }
      }
    case 'phase3':
      return {
        ...baseData,
        workflow: {
          ...baseData.workflow,
          rapport: {
            rapport: { isAvailable: true, dateTransmission: '15/8/2025' },
            performanceGlobale: 58,
            planAction: { isAvailable: true, dateTransmission: '25/9/2025', valideParOE: true, dateValidation: '28/9/2025' }
          },
          avis: {
            avis: null,
            dateTransmission: null,
            argumentaire: null,
            absencePointsBloquants: undefined,
            avisLabellisation: { isAvailable: false, dateTransmission: null },
            decisionFEEF: { statut: null, dateDecision: null }
          },
          attestation: {
            dateTransmission: null,
            dateValidite: null,
            signatureFEEF: { isGenerated: false, dateSigned: null, signePar: null },
            signatureEntreprise: { isConfirmed: false, dateSigned: null, signePar: null }
          }
        }
      }
    case 'phase4':
      return {
        ...baseData,
        workflow: {
          ...baseData.workflow,
          rapport: {
            rapport: { isAvailable: true, dateTransmission: '15/8/2025' },
            performanceGlobale: 78,
            planAction: { isAvailable: false, dateLimiteDepot: null }
          },
          avis: {
            avis: 'favorable',
            dateTransmission: '5/10/2025',
            argumentaire: 'Suite à l\'audit réalisé, l\'entreprise démontre une maîtrise satisfaisante des exigences du référentiel. Les quelques points d\'amélioration identifiés ne constituent pas d\'obstacles à l\'attribution du label.',
            absencePointsBloquants: true,
            avisLabellisation: { isAvailable: true, dateTransmission: '5/10/2025' },
            decisionFEEF: { statut: 'en_attente', dateDecision: null }
          },
          attestation: {
            dateTransmission: null,
            dateValidite: null,
            signatureFEEF: { isGenerated: false, dateSigned: null, signePar: null },
            signatureEntreprise: { isConfirmed: false, dateSigned: null, signePar: null }
          }
        }
      }
    case 'phase5':
      return {
        ...baseData,
        workflow: {
          ...baseData.workflow,
          rapport: {
            rapport: { isAvailable: true, dateTransmission: '15/8/2025' },
            performanceGlobale: 78,
            planAction: { isAvailable: false, dateLimiteDepot: null }
          },
          avis: {
            avis: 'favorable',
            dateTransmission: '5/10/2025',
            argumentaire: 'Suite à l\'audit réalisé, l\'entreprise démontre une maîtrise satisfaisante des exigences du référentiel. Les quelques points d\'amélioration identifiés ne constituent pas d\'obstacles à l\'attribution du label.',
            absencePointsBloquants: true,
            avisLabellisation: { isAvailable: true, dateTransmission: '5/10/2025' },
            decisionFEEF: { statut: 'accepte', dateDecision: '8/10/2025', validePar: 'Katrin BARROIS - Directrice FEEF' }
          },
          attestation: {
            dateTransmission: '8/10/2025',
            dateValidite: '8/10/2028',
            signatureFEEF: { isGenerated: true, dateSigned: null, signePar: null },
            signatureEntreprise: { isConfirmed: false, dateSigned: null, signePar: null }
          }
        }
      }
    case 'phase6':
      return {
        ...baseData,
        workflow: {
          ...baseData.workflow,
          rapport: {
            rapport: { isAvailable: true, dateTransmission: '15/8/2025' },
            performanceGlobale: 78,
            planAction: { isAvailable: false, dateLimiteDepot: null }
          },
          avis: {
            avis: 'favorable',
            dateTransmission: '5/10/2025',
            argumentaire: 'Suite à l\'audit réalisé, l\'entreprise démontre une maîtrise satisfaisante des exigences du référentiel. Les quelques points d\'amélioration identifiés ne constituent pas d\'obstacles à l\'attribution du label.',
            absencePointsBloquants: true,
            avisLabellisation: { isAvailable: true, dateTransmission: '5/10/2025' },
            decisionFEEF: { statut: 'accepte', dateDecision: '8/10/2025', validePar: 'Katrin BARROIS - Directrice FEEF' }
          },
          attestation: {
            dateTransmission: '8/10/2025',
            dateValidite: '8/10/2028',
            signatureFEEF: { isGenerated: true, dateSigned: '8/10/2025', signePar: 'Katrin BARROIS - Directrice FEEF' },
            signatureEntreprise: { isConfirmed: true, dateSigned: '9/10/2025', signePar: `${props.company.dirigeant.prenom} ${props.company.dirigeant.nom} - ${props.company.dirigeant.fonction}` }
          }
        }
      }
    default:
      return baseData
  }
})

// Computed properties pour le rapport d'audit
const rapportDocument = computed(() => 
  DOCUMENTS.find(doc => doc.id === 'rapport-audit')
)

const planActionDocument = computed(() => 
  DOCUMENTS.find(doc => doc.id === 'plan-action')
)

// Computed property pour déterminer si un plan d'action est nécessaire
const needsPlanAction = computed(() => {
  const performance = simulatedData.value.workflow.rapport.performanceGlobale
  // Afficher la section plan d'action si le score existe et est insuffisant, ou si on est en phase 2+
  return (performance !== undefined && performance < 65) || ['phase2', 'phase3'].includes(selectedPhase.value)
})

const attestationDocument = computed(() => 
  DOCUMENTS.find(doc => doc.id === 'attestation-labellisation')
)

// Méthodes pour consulter le rapport
function viewRapport() {
  if (simulatedData.value.workflow.rapport.rapport?.isAvailable) {
    let doc = rapportDocument.value
    if (!doc) {
      doc = {
        id: 'rapport-audit',
        name: 'Rapport d\'audit',
        description: 'Rapport complet de l\'audit de labellisation',
        labelingCaseState: 'DECISION',
        isAvailable: true,
        dateUpload: simulatedData.value.workflow.rapport.rapport?.dateTransmission || undefined,
        uploadedBy: 'Organisme Évaluateur',
        fileSize: '3.5 MB',
        fileType: 'PDF'
      }
    }
    selectedDocument.value = doc
    documentViewer.value = true
  }
}

function viewPlanAction() {
  if (simulatedData.value.workflow.rapport.planAction?.isAvailable) {
    let doc = planActionDocument.value
    if (!doc) {
      doc = {
        id: 'plan-action',
        name: 'Plan d\'action correctives',
        description: 'Plan d\'action pour les mesures correctives requises',
        labelingCaseState: 'DECISION',
        isAvailable: true,
        dateUpload: simulatedData.value.workflow.rapport.planAction?.dateTransmission || undefined,
        uploadedBy: 'Entreprise',
        fileSize: '1.9 MB',
        fileType: 'PDF'
      }
    }
    selectedDocument.value = doc
    documentViewer.value = true
  }
}

function viewAvisLabellisation() {
  // Créer un document temporaire pour l'avis de labellisation
  const avisLabellisationDoc: Documents = {
    id: 'avis-labellisation',
    name: 'Avis de labellisation',
    description: 'Avis officiel de labellisation émis par l\'Organisme Évaluateur',
    labelingCaseState: 'DECISION' as const,
    isAvailable: true,
    dateUpload: simulatedData.value.workflow.avis.avisLabellisation?.dateTransmission || undefined,
    uploadedBy: 'Organisme Évaluateur - Direction',
    fileSize: '1.8 MB',
    fileType: 'PDF'
  }
  
  if (simulatedData.value.workflow.avis.avisLabellisation?.isAvailable) {
    selectedDocument.value = avisLabellisationDoc
    documentViewer.value = true
  }
}

function viewAvisOE() {
  // Créer un document temporaire pour l'avis de l'OE
  const avisOEDoc: Documents = {
    id: 'avis-oe',
    name: 'Avis de l\'Organisme Évaluateur',
    description: 'Avis officiel émis par l\'Organisme Évaluateur suite à l\'audit',
    labelingCaseState: 'DECISION' as const,
    isAvailable: true,
    dateUpload: props.company.workflow.avis.dateTransmission,
    uploadedBy: 'Organisme Évaluateur - Direction',
    fileSize: '2.1 MB',
    fileType: 'PDF'
  }
  
  if (props.company.workflow.avis.dateTransmission) {
    selectedDocument.value = avisOEDoc
    documentViewer.value = true
  }
}


// États pour la validation FEEF

// Méthodes pour la validation FEEF
function validateLabellisation() {
  // Avancer vers la phase 6 (attestation finalisée)
  selectedPhase.value = 'phase6'
  console.log('Labellisation validée avec succès!')
}

function signAttestationFEEF() {
  const today = new Date().toLocaleDateString('fr-FR')
  
  // Simuler la signature de l'attestation par la FEEF
  // En mode simulation, on fait juste évoluer vers la phase appropriée
  console.log('Attestation signée par la FEEF')
}

function checkEntrepriseSignature() {
  // Simuler la vérification de la signature entreprise
  console.log('Vérification de la signature entreprise...')
}

function viewAttestation() {
  // Créer un document temporaire pour l'attestation si nécessaire
  let attestationDoc = attestationDocument.value
  
  if (!attestationDoc) {
    // Créer un document temporaire pour l'attestation
    attestationDoc = {
      id: 'attestation-labellisation',
      name: 'Attestation de labellisation',
      description: 'Attestation officielle de labellisation FEEF',
      labelingCaseState: 'DECISION',
      isAvailable: true,
      dateUpload: simulatedData.value.workflow.attestation.dateTransmission || undefined,
      uploadedBy: 'FEEF - Direction',
      fileSize: '1.5 MB',
      fileType: 'PDF'
    }
  }
  
  // Ouvrir l'attestation dans le DocumentViewer
  if (attestationDoc) {
    selectedDocument.value = attestationDoc
    documentViewer.value = true
  }
}


</script>
