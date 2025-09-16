<template>
  <UCard v-if="shouldShowCard" class="mb-6">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-file-badge-2" class="w-5 h-5 text-emerald-600" />
          <h4 class="font-semibold">Validation FEEF</h4>
        </div>
        <UBadge 
          v-if="decisionFEEF?.statut"
          :color="decisionFEEF.statut === 'accepte' ? 'success' : 'warning'"
          variant="solid"
          size="sm"
        >
          {{ getDecisionFEEFLabel(decisionFEEF.statut) }}
        </UBadge>
      </div>
    </template>
    
    <!-- Version: En attente de validation -->
    <div v-if="!decisionFEEF?.statut || decisionFEEF.statut === 'en_attente'">
      <div class="space-y-6">
        <!-- Action principale de validation -->
        <div class="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
          <div class="text-center space-y-4">
            <div class="flex justify-center">
              <div class="p-3 bg-emerald-100 rounded-full">
                <UIcon name="i-lucide-file-badge-2" class="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            
            <div v-if="props.role === 'feef'">
              <h4 class="text-lg font-semibold text-emerald-900 mb-2">Validation de la labellisation</h4>
              <p class="text-sm text-emerald-800 mb-4">
                En validant, vous générerez automatiquement l'attestation de labellisation avec une validité de 1 an.
              </p>
            </div>
            
            <UButton 
                v-if="!(props.role === 'oe' && selectedPhase === 'phase4')"
                @click="validateLabellisation"
                color="success" 
                icon="i-lucide-check-circle"
                size="lg"
                :disabled="selectedPhase !== 'phase5'"
                class="px-8 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Valider la labellisation
              </UButton>
              <p v-if="selectedPhase !== 'phase5' && !(props.role === 'oe' && selectedPhase === 'phase4')" class="text-xs text-gray-500">Action disponible en phase 5</p>
              <div v-if="props.role === 'oe' && selectedPhase === 'phase4'" class="text-sm text-emerald-800 font-semibold py-4">
                En attente de validation par la FEEF
              </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Version: Labellisation validée -->
    <div v-else-if="decisionFEEF.statut === 'accepte'">
      <div class="space-y-6">
        <!-- Layout adaptatif : selon l'état des signatures -->
        <div v-if="attestation.signatureFEEF?.isGenerated && !attestation.signatureFEEF?.dateSigned">
          <!-- Mode signatures en attente -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Signature FEEF -->
            <div class="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-pen-tool" class="w-4 h-4 text-blue-600" />
                  <span class="font-medium text-blue-900">Signature FEEF</span>
                </div>
                <UBadge color="warning" variant="soft" size="xs">En attente</UBadge>
              </div>
              
              <div class="pt-2">
                <UButton 
                  @click="signAttestationFEEF"
                  color="primary" 
                  size="xs"
                  icon="i-lucide-pen"
                  label="Signer l'attestation"
                  class="w-full"
                  :disabled="selectedPhase !== 'phase5'"
                />
              </div>
            </div>

            <!-- Signature Entreprise -->
            <div class="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-building-2" class="w-4 h-4 text-emerald-600" />
                  <span class="font-medium text-emerald-900">Signature Entreprise</span>
                </div>
                <UBadge 
                  :color="attestation.signatureEntreprise?.isConfirmed ? 'success' : 'neutral'"
                  variant="soft" 
                  size="xs"
                >
                  {{ attestation.signatureEntreprise?.isConfirmed ? 'Confirmée' : 'En attente' }}
                </UBadge>
              </div>
              
              <div v-if="attestation.signatureEntreprise?.isConfirmed" class="space-y-2 text-sm text-emerald-800">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-calendar" class="w-3 h-3" />
                  <span>{{ attestation.signatureEntreprise.dateSigned }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-user" class="w-3 h-3" />
                  <span>{{ attestation.signatureEntreprise.signePar }}</span>
                </div>
              </div>
              
              <div v-else class="pt-2">
                <UButton 
                  @click="checkEntrepriseSignature"
                  color="neutral" 
                  variant="outline"
                  size="xs"
                  icon="i-lucide-hourglass"
                  label="En attente de signature"
                  class="w-full"
                />
              </div>
            </div>
          </div>

          <!-- Attestation en mode simple quand pas encore signée -->
          <div class="mt-6 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-4 border border-gray-200">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg flex items-center justify-center">
                  <UIcon name="i-lucide-file-badge" class="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h4 class="font-semibold text-gray-900">Attestation de labellisation</h4>
                  <p class="text-xs text-gray-600">Validité : {{ attestation.dateValidite }}</p>
                </div>
              </div>
              
              <div class="flex items-center gap-1">
                <div class="w-2 h-2 rounded-full" 
                     :class="attestationStatusColor"></div>
                <span class="text-xs font-medium" 
                      :class="attestationStatusTextColor">
                  {{ attestationStatusText }}
                </span>
              </div>
            </div>
            
            <!-- Zone cliquable pour voir l'attestation -->
            <div 
              @click="viewAttestation"
              class="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg cursor-pointer hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 transition-all duration-200 group"
            >
              <div class="flex items-center gap-3">
                <div class="flex-shrink-0">
                  <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-200">
                    <Icon name="i-lucide-file-text" class="w-5 h-5 text-white" />
                  </div>
                </div>
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-900 group-hover:text-blue-900 transition-colors duration-200">
                    Attestation de labellisation
                  </p>
                  <p class="text-xs text-gray-600 group-hover:text-blue-700 transition-colors duration-200">
                    Cliquer pour voir l'aperçu du document
                  </p>
                </div>
                <div class="flex-shrink-0">
                  <Icon name="i-lucide-chevron-right" class="w-4 h-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all duration-200" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else>
          <!-- Mode 2 colonnes quand attestation signée -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Colonne 1: Attestation -->
            <div class="bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-4 border border-gray-200">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg flex items-center justify-center">
                    <UIcon name="i-lucide-file-badge" class="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 class="font-semibold text-gray-900">Attestation</h4>
                    <p class="text-xs text-gray-600">Validité : {{ attestation.dateValidite }}</p>
                  </div>
                </div>
                
                <div class="flex items-center gap-1">
                  <div class="w-2 h-2 rounded-full bg-green-400"></div>
                  <span class="text-xs font-medium text-green-700">Finalisée</span>
                </div>
              </div>
              
              <!-- Zone cliquable pour voir l'attestation -->
              <div 
                @click="viewAttestation"
                class="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg cursor-pointer hover:from-green-100 hover:to-emerald-100 hover:border-green-300 transition-all duration-200 group"
              >
                <div class="flex items-center gap-3">
                  <div class="flex-shrink-0">
                    <div class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center group-hover:bg-green-600 transition-colors duration-200">
                      <Icon name="i-lucide-file-check" class="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div class="flex-1">
                    <p class="text-sm font-medium text-gray-900 group-hover:text-green-900 transition-colors duration-200">
                      Document final
                    </p>
                    <p class="text-xs text-gray-600 group-hover:text-green-700 transition-colors duration-200">
                      Cliquer pour voir l'attestation
                    </p>
                  </div>
                  <div class="flex-shrink-0">
                    <Icon name="i-lucide-chevron-right" class="w-4 h-4 text-gray-400 group-hover:text-green-500 group-hover:translate-x-0.5 transition-all duration-200" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Colonne 2: Signatures -->
            <div class="space-y-4">
              <!-- Signature FEEF -->
              <div class="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-shield-check" class="w-4 h-4 text-blue-600" />
                    <span class="font-medium text-blue-900">Signature FEEF</span>
                  </div>
                  <UBadge color="success" variant="soft" size="xs">Signée</UBadge>
                </div>
                
                <div class="space-y-2 text-sm text-blue-800">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-calendar" class="w-3 h-3" />
                    <span>{{ attestation.signatureFEEF?.dateSigned }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-user" class="w-3 h-3" />
                    <span>{{ attestation.signatureFEEF?.signePar }}</span>
                  </div>
                </div>
              </div>

              <!-- Signature Entreprise -->
              <div class="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-building-2" class="w-4 h-4 text-emerald-600" />
                    <span class="font-medium text-emerald-900">Signature Entreprise</span>
                  </div>
                  <UBadge 
                    :color="attestation.signatureEntreprise?.isConfirmed ? 'success' : 'neutral'"
                    variant="soft" 
                    size="xs"
                  >
                    {{ attestation.signatureEntreprise?.isConfirmed ? 'Confirmée' : 'En attente' }}
                  </UBadge>
                </div>
                
                <div v-if="attestation.signatureEntreprise?.isConfirmed" class="space-y-2 text-sm text-emerald-800">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-calendar" class="w-3 h-3" />
                    <span>{{ attestation.signatureEntreprise.dateSigned }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-user" class="w-3 h-3" />
                    <span>{{ attestation.signatureEntreprise.signePar }}</span>
                  </div>
                </div>
                
                <div v-else class="pt-2">
                  <UButton 
                    @click="checkEntrepriseSignature"
                    color="neutral" 
                    variant="outline"
                    size="xs"
                    icon="i-lucide-search"
                    label="Vérifier signature"
                    class="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
interface Props {
  avis: {
    avis?: string | null | undefined
    avisLabellisation?: {
      isAvailable?: boolean | undefined
    }
  }
  decisionFEEF: {
    statut?: string | null | undefined
  } | null | undefined
  attestation: {
    dateValidite?: string | null | undefined
    signatureFEEF?: {
      isGenerated?: boolean | undefined
      dateSigned?: string | null | undefined
      signePar?: string | null | undefined
    }
    signatureEntreprise?: {
      isConfirmed?: boolean | undefined
      dateSigned?: string | null | undefined
      signePar?: string | null | undefined
    }
  }
  selectedPhase: string
  role?: "oe" | "feef"
}

const props = withDefaults(defineProps<Props>(), {
  role: 'feef'
})

const emit = defineEmits<{
  validateLabellisation: []
  signAttestationFEEF: []
  checkEntrepriseSignature: []
  viewAttestation: []
}>()

// Computed properties pour le statut de l'attestation
const attestationStatusColor = computed(() => {
  const feefSigned = props.attestation?.signatureFEEF?.isGenerated
  const entrepriseSigned = props.attestation?.signatureEntreprise?.isConfirmed
  
  if (feefSigned && entrepriseSigned) return 'bg-green-500'
  if (feefSigned || entrepriseSigned) return 'bg-orange-500'
  return 'bg-gray-400'
})

const attestationStatusTextColor = computed(() => {
  const feefSigned = props.attestation?.signatureFEEF?.isGenerated
  const entrepriseSigned = props.attestation?.signatureEntreprise?.isConfirmed
  
  if (feefSigned && entrepriseSigned) return 'text-green-700'
  if (feefSigned || entrepriseSigned) return 'text-orange-700'
  return 'text-gray-600'
})

const attestationStatusText = computed(() => {
  const feefSigned = props.attestation?.signatureFEEF?.isGenerated
  const entrepriseSigned = props.attestation?.signatureEntreprise?.isConfirmed
  
  if (feefSigned && entrepriseSigned) return 'Complète'
  if (feefSigned) return 'FEEF signée'
  if (entrepriseSigned) return 'Entreprise signée'
  return 'En attente'
})

// Computed property pour déterminer si la carte doit être affichée
const shouldShowCard = computed(() => {
  return props.avis?.avis === 'favorable' && props.avis?.avisLabellisation?.isAvailable
})

// Fonctions utilitaires
function getDecisionFEEFLabel(statut: string | undefined): string {
  switch (statut) {
    case 'accepte': return 'Validée'
    case 'en_attente': return 'En attente'
    default: return 'En attente'
  }
}

function validateLabellisation() {
  emit('validateLabellisation')
}

function signAttestationFEEF() {
  emit('signAttestationFEEF')
}

function checkEntrepriseSignature() {
  emit('checkEntrepriseSignature')
}

function viewAttestation() {
  emit('viewAttestation')
}
</script>
