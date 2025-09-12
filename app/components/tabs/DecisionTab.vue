<template>
  <div class="bg-gray-50 rounded-b-lg p-6 min-h-[300px]">
    <!-- Sélecteur de phase de décision -->
    <div class="bg-white p-4 rounded-lg border border-gray-200 mb-6">
      <div class="flex items-center gap-4 mb-4">
        <UIcon name="i-lucide-settings" class="w-5 h-5 text-gray-600" />
        <h4 class="font-medium text-gray-900">Simulateur de phase de décision</h4>
      </div>
      
      <div class="flex gap-6 flex-wrap">
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
      <UIcon name="i-lucide-scale" class="w-6 h-6 text-primary mt-1" />
      <div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Phase de décision</h3>
        <p class="text-gray-600 text-sm">Analyse du rapport et émission de l'avis</p>
      </div>
    </div>
    
    <!-- Rapports d'audit -->
    <UCard class="mb-6">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-file-chart-column" class="w-5 h-5 text-purple-600" />
          <h4 class="font-semibold">Rapports d'audit</h4>
        </div>
      </template>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Rapport d'audit -->
        <div class="text-center p-4 bg-purple-50 rounded-lg border border-purple-200 cursor-pointer transition-all hover:bg-purple-100 hover:shadow-md group"
             @click="viewRapport"
             :class="{ 'opacity-50 cursor-not-allowed': !simulatedData.workflow.rapport.rapport?.isAvailable }">
          <UIcon name="i-lucide-file-text" class="w-6 h-6 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <h5 class="text-sm font-medium text-gray-900 mb-1">Rapport d'audit</h5>
          <div class="space-y-1">
            <p class="text-xs font-medium text-purple-800">
              {{ simulatedData.workflow.rapport.rapport?.dateTransmission ? 
                `Transmis le ${simulatedData.workflow.rapport.rapport.dateTransmission}` : 
                'Non disponible' }}
            </p>
            <div v-if="simulatedData.workflow.rapport.rapport?.isAvailable" class="flex items-center justify-center gap-1 text-xs text-gray-600">
              <span>Cliquer pour consulter</span>
              <UIcon name="i-lucide-external-link" class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div v-else>
              <p class="text-xs text-gray-500 mb-2">Rapport non disponible</p>
              <!-- Bouton pour mettre en ligne en phase 0 -->
              <div v-if="selectedPhase === 'phase0'">
                <UButton 
                  color="primary" 
                  size="xs"
                  icon="i-lucide-upload"
                  disabled
                  class="w-full"
                >
                  Mettre en ligne
                </UButton>
                <p class="text-xs text-gray-500 mt-1">Action FEEF/OE</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Score global de performance -->
        <div class="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
          <UIcon name="i-lucide-target" class="w-6 h-6 text-green-600 mx-auto mb-2" />
          <h5 class="text-sm font-medium text-gray-900 mb-1">Score global</h5>
          <div class="space-y-1">
            <div v-if="simulatedData.workflow.rapport.performanceGlobale" class="text-2xl font-bold text-green-600">
              {{ simulatedData.workflow.rapport.performanceGlobale }}%
            </div>
            <UBadge 
              v-if="simulatedData.workflow.rapport.performanceGlobale"
              :color="simulatedData.workflow.rapport.performanceGlobale >= 80 ? 'success' : 
                     simulatedData.workflow.rapport.performanceGlobale >= 60 ? 'warning' : 'error'"
              variant="soft"
              size="xs"
            >
              {{ simulatedData.workflow.rapport.performanceGlobale >= 80 ? 'Excellent' : 
                 simulatedData.workflow.rapport.performanceGlobale >= 60 ? 'Satisfaisant' : 'À améliorer' }}
            </UBadge>
            <p v-else class="text-xs text-gray-500">Score non attribué</p>
            
            <!-- Boutons d'action pour phase 0 -->
            <div v-if="selectedPhase === 'phase0'" class="mt-2">
              <UButton 
                color="primary" 
                size="xs"
                icon="i-lucide-edit"
                disabled
                class="w-full"
              >
                Saisir le score
              </UButton>
              <p class="text-xs text-gray-500 mt-1">Action FEEF/OE</p>
            </div>
          </div>
        </div>
      </div>
    </UCard>
    
    <!-- Plan d'action corrective -->
    <UCard v-if="needsPlanAction" class="mb-6">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-clipboard-check" class="w-5 h-5 text-orange-500" />
          <h4 class="font-semibold">Plan d'action corrective</h4>
        </div>
      </template>
      
      <div class="space-y-4">
        <!-- Plan d'action disponible ou en attente -->
        <div class="p-3 bg-orange-50 rounded-lg border border-orange-200">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-file-text" class="w-4 h-4 text-orange-600" />
              <span class="text-sm font-medium text-orange-900">Plan d'action corrective</span>
            </div>
          </div>
          
          <p class="text-xs text-orange-800 mb-2">
            Plan détaillant les mesures correctives suite à la performance insuffisante ({{ simulatedData.workflow.rapport.performanceGlobale }}%).
          </p>
          
          <!-- Informations selon l'état -->
          <div class="space-y-2">
            <!-- Plan d'action disponible -->
            <div v-if="simulatedData.workflow.rapport.planAction?.isAvailable" class="space-y-2">
              <!-- Date de transmission -->
              <div class="flex items-center gap-2 text-xs text-orange-700">
                <UIcon name="i-lucide-calendar-plus" class="w-3 h-3" />
                <span>Déposé le {{ simulatedData.workflow.rapport.planAction.dateTransmission }}</span>
              </div>
              
              <!-- Validation OE -->
              <div v-if="simulatedData.workflow.rapport.planAction?.valideParOE" class="flex items-center gap-2 text-xs text-green-700">
                <UIcon name="i-lucide-check-circle" class="w-3 h-3" />
                <span>Validé par l'OE le {{ simulatedData.workflow.rapport.planAction.dateValidation }}</span>
              </div>
              <div v-else-if="selectedPhase === 'phase2b'" class="space-y-2">
                <div class="flex items-center gap-2 text-xs text-amber-700">
                  <UIcon name="i-lucide-clock" class="w-3 h-3" />
                  <span>En attente de validation par la FEEF/OE</span>
                </div>
                <div class="flex gap-2">
                  <UButton 
                    color="success" 
                    size="xs"
                    icon="i-lucide-check"
                    class="flex-1"
                  >
                    Valider
                  </UButton>
                </div>
                <p class="text-xs text-gray-500 text-center">Actions FEEF/OE</p>
              </div>
              <div v-else class="space-y-2">
                <div class="flex items-center gap-2 text-xs text-amber-700">
                  <UIcon name="i-lucide-clock" class="w-3 h-3" />
                  <span>En cours d'examen par l'Organisme Évaluateur</span>
                </div>
                <UButton 
                  color="success" 
                  size="xs"
                  icon="i-lucide-check"
                  disabled
                  class="w-full"
                >
                  Valider le plan d'action
                </UButton>
                <p class="text-xs text-gray-500 text-center">Action FEEF/OE</p>
              </div>
            </div>
            
            <!-- Plan d'action non transmis -->
            <div v-else class="space-y-2">
              <div class="flex items-center gap-2 text-xs text-red-700">
                <UIcon name="i-lucide-calendar-x" class="w-3 h-3" />
                <span v-if="selectedPhase === 'phase2'">En attente que l'entreprise mette en ligne le plan d'action</span>
                <span v-else>À remettre avant le {{ simulatedData.workflow.rapport.planAction?.dateLimiteDepot || 'À définir' }}</span>
              </div>
              <UButton 
                v-if="selectedPhase !== 'phase2'"
                color="primary" 
                size="xs"
                icon="i-lucide-upload"
                disabled
                class="w-full"
              >
                Mettre en ligne le plan
              </UButton>
              <p v-if="selectedPhase !== 'phase2'" class="text-xs text-gray-500 text-center">Action Entreprise</p>
            </div>
          </div>
          
          <!-- Bouton pour consulter -->
          <div v-if="simulatedData.workflow.rapport.planAction?.isAvailable" class="mt-3">
            <UButton 
              @click="viewPlanAction"
              variant="outline" 
              color="primary" 
              size="xs"
              icon="i-lucide-eye"
              label="Consulter le plan d'action"
              class="w-full"
            />
          </div>
        </div>
      </div>
    </UCard>

    <!-- Avis de l'Organisme Évaluateur -->
    <UCard class="mb-6">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-shield-check" class="w-5 h-5 text-purple-600" />
            <h4 class="font-semibold">Avis de l'Organisme Évaluateur</h4>
          </div>
          <UBadge 
            v-if="simulatedData.workflow.avis.avis"
            :color="simulatedData.workflow.avis.avis === 'favorable' ? 'success' : simulatedData.workflow.avis.avis === 'défavorable' ? 'error' : 'warning'"
            variant="solid"
            size="sm"
          >
            {{ simulatedData.workflow.avis.avis === 'favorable' ? 'Favorable' : simulatedData.workflow.avis.avis === 'défavorable' ? 'Défavorable' : 'En cours' }}
          </UBadge>
        </div>
      </template>

      <!-- Contenu sur une seule ligne avec deux colonnes -->
      <div class="grid grid-cols-2 gap-6">
        <!-- Colonne 1: Date, points bloquants et argumentaire -->
        <div class="space-y-3">
          <!-- Informations sur la date et points bloquants -->
          <div v-if="simulatedData.workflow.avis.dateTransmission" class="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div class="space-y-2">
              <!-- Date de transmission -->
              <div class="flex items-center gap-2 text-sm">
                <UIcon name="i-lucide-calendar" class="w-4 h-4 text-purple-600" />
                <span class="text-purple-900 font-medium">{{ simulatedData.workflow.avis.dateTransmission }}</span>
              </div>
              
              <!-- Points bloquants -->
              <div v-if="simulatedData.workflow.avis.absencePointsBloquants !== undefined" class="flex items-center gap-2">
                <UIcon 
                  :name="simulatedData.workflow.avis.absencePointsBloquants ? 'i-lucide-check-circle' : 'i-lucide-alert-triangle'"
                  class="w-4 h-4"
                  :class="simulatedData.workflow.avis.absencePointsBloquants ? 'text-green-600' : 'text-red-600'"
                />
                <span class="text-sm font-medium"
                  :class="simulatedData.workflow.avis.absencePointsBloquants ? 'text-green-800' : 'text-red-800'"
                >
                  {{ simulatedData.workflow.avis.absencePointsBloquants ? 'Aucun point bloquant' : 'Points bloquants détectés' }}
                </span>
              </div>
            </div>
          </div>
          
          <div v-else class="space-y-2">
            <div class="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-clock" class="w-4 h-4 text-gray-600" />
                <span class="text-gray-700">En attente de l'avis de l'OE</span>
              </div>
            </div>
            
            <!-- Boutons d'action pour saisie avis (phases 3 et 4) -->
            <div v-if="selectedPhase === 'phase3' || (selectedPhase === 'phase4' && !simulatedData.workflow.avis.dateTransmission)">
              <UButton 
                color="primary" 
                size="xs"
                icon="i-lucide-edit"
                class="w-full"
                disabled
              >
                Saisir l'avis OE
              </UButton>
            </div>
            <div v-if="selectedPhase === 'phase3' || (selectedPhase === 'phase4' && !simulatedData.workflow.avis.dateTransmission)">
              <UButton 
                color="primary" 
                size="xs"
                icon="i-lucide-edit"
                class="w-full"
                disabled
              >
                Mettre en ligne l'avis de labellisation
              </UButton>
              <p class="text-xs text-gray-500 text-center mt-1">Action OE</p>
            </div>
          </div>

          <!-- Argumentaire de l'OE -->
          <div v-if="simulatedData.workflow.avis.argumentaire" class="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <h5 class="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
              <UIcon name="i-lucide-message-square-text" class="w-4 h-4" />
              Argumentaire
            </h5>
            <p class="text-sm text-purple-800 leading-relaxed">{{ simulatedData.workflow.avis.argumentaire }}</p>
          </div>
        </div>

        <!-- Colonne 2: Avis de labellisation -->
        <div class="space-y-3">
          <!-- Avis de labellisation (si favorable) -->
          <div v-if="simulatedData.workflow.avis.avis === 'favorable' && simulatedData.workflow.avis.avisLabellisation?.isAvailable" class="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div class="flex items-center gap-3 mb-2">
              <UIcon name="i-lucide-certificate" class="w-4 h-4 text-blue-600" />
              <span class="text-sm font-medium text-blue-900">Avis de labellisation</span>
            </div>
            <p class="text-xs text-blue-800 mb-2">
              Document officiel de labellisation émis par l'Organisme Évaluateur suite à l'avis favorable.
            </p>
            
            <!-- Date de dépôt -->
            <div v-if="simulatedData.workflow.avis.avisLabellisation.dateTransmission" class="flex items-center gap-2 mb-3 text-xs text-blue-700">
              <UIcon name="i-lucide-calendar-plus" class="w-3 h-3" />
              <span>Émis le {{ simulatedData.workflow.avis.avisLabellisation.dateTransmission }}</span>
            </div>
            
            <!-- Bouton pour consulter -->
            <UButton 
              @click="viewAvisLabellisation"
              variant="outline" 
              color="primary" 
              size="xs"
              icon="i-lucide-eye"
              label="Consulter l'avis de labellisation"
              class="w-full"
            />
          </div>
          
          <!-- Bouton pour ajouter avis de labellisation (phase 4 uniquement) -->
          <div v-else-if="selectedPhase === 'phase4' && simulatedData.workflow.avis.avis === 'favorable' && !simulatedData.workflow.avis.avisLabellisation?.isAvailable" class="space-y-2">
            <div class="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div class="flex items-center gap-3 mb-2">
                <UIcon name="i-lucide-certificate" class="w-4 h-4 text-blue-600" />
                <span class="text-sm font-medium text-blue-900">Avis de labellisation</span>
              </div>
              <p class="text-xs text-blue-800 mb-2">
                Document officiel de labellisation à émettre suite à l'avis favorable.
              </p>
            </div>
            
            <!-- Boutons pour phase 4 -->
            <div class="space-y-2">
              <UButton 
                color="primary" 
                size="xs"
                icon="i-lucide-plus"
                class="w-full"
              >
                Ajouter l'avis de labellisation
              </UButton>
              <UButton 
                color="success" 
                size="xs"
                icon="i-lucide-upload"
                class="w-full"
              >
                Mettre en ligne l'avis de labellisation
              </UButton>
              <p class="text-xs text-gray-500 text-center">Actions FEEF/OE</p>
            </div>
          </div>
        </div>
      </div>
    </UCard>
      
    <!-- Validation FEEF -->
    <UCard v-if="simulatedData.workflow.avis.avis === 'favorable' && simulatedData.workflow.avis.avisLabellisation?.isAvailable" class="mb-6">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-shield-check-2" class="w-5 h-5 text-emerald-600" />
            <h4 class="font-semibold">Validation FEEF</h4>
          </div>
          <UBadge 
            v-if="simulatedData.workflow.avis.decisionFEEF?.statut"
            :color="simulatedData.workflow.avis.decisionFEEF.statut === 'accepte' ? 'success' : 'warning'"
            variant="solid"
            size="sm"
          >
            {{ getDecisionFEEFLabel(simulatedData.workflow.avis.decisionFEEF.statut) }}
          </UBadge>
        </div>
      </template>
      
      <!-- Version: En attente de validation -->
      <div v-if="!simulatedData.workflow.avis.decisionFEEF?.statut || simulatedData.workflow.avis.decisionFEEF.statut === 'en_attente'">
        <div class="space-y-6">
          <!-- Action principale de validation -->
          <div class="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
            <div class="text-center space-y-4">
              <div class="flex justify-center">
                <div class="p-3 bg-emerald-100 rounded-full">
                  <UIcon name="i-lucide-certificate" class="w-6 h-6 text-emerald-600" />
                </div>
              </div>
              
              <div>
                <h4 class="text-lg font-semibold text-emerald-900 mb-2">Validation de la labellisation</h4>
                <p class="text-sm text-emerald-800 mb-4">
                  En validant, vous générerez automatiquement l'attestation de labellisation avec une validité de 1 an.
                </p>
              </div>
              
              <UButton 
                @click="validateLabellisation"
                color="success" 
                icon="i-lucide-check-circle"
                size="lg"
                :disabled="selectedPhase !== 'phase5'"
                class="px-8 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Valider la labellisation
              </UButton>
              <p v-if="selectedPhase !== 'phase5'" class="text-xs text-gray-500">Action disponible en phase 5</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Version: Labellisation validée -->
      <div v-else-if="simulatedData.workflow.avis.decisionFEEF.statut === 'accepte'">
        <div class="space-y-6">

          <!-- Layout adaptatif : selon l'état des signatures -->
          <div v-if="simulatedData.workflow.attestation.signatureFEEF?.isGenerated && !simulatedData.workflow.attestation.signatureFEEF?.dateSigned">
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
                    :color="simulatedData.workflow.attestation.signatureEntreprise?.isConfirmed ? 'success' : 'neutral'"
                    variant="soft" 
                    size="xs"
                  >
                    {{ simulatedData.workflow.attestation.signatureEntreprise?.isConfirmed ? 'Confirmée' : 'En attente' }}
                  </UBadge>
                </div>
                
                <div v-if="simulatedData.workflow.attestation.signatureEntreprise?.isConfirmed" class="space-y-2 text-sm text-emerald-800">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-calendar" class="w-3 h-3" />
                    <span>{{ simulatedData.workflow.attestation.signatureEntreprise.dateSigned }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-user" class="w-3 h-3" />
                    <span>{{ simulatedData.workflow.attestation.signatureEntreprise.signePar }}</span>
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
                    <p class="text-xs text-gray-600">Validité : {{ simulatedData.workflow.attestation.dateValidite }}</p>
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
                      <p class="text-xs text-gray-600">Validité : {{ simulatedData.workflow.attestation.dateValidite }}</p>
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
                      <span>{{ simulatedData.workflow.attestation.signatureFEEF?.dateSigned }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <UIcon name="i-lucide-user" class="w-3 h-3" />
                      <span>{{ simulatedData.workflow.attestation.signatureFEEF?.signePar }}</span>
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
                      :color="simulatedData.workflow.attestation.signatureEntreprise?.isConfirmed ? 'success' : 'neutral'"
                      variant="soft" 
                      size="xs"
                    >
                      {{ simulatedData.workflow.attestation.signatureEntreprise?.isConfirmed ? 'Confirmée' : 'En attente' }}
                    </UBadge>
                  </div>
                  
                  <div v-if="simulatedData.workflow.attestation.signatureEntreprise?.isConfirmed" class="space-y-2 text-sm text-emerald-800">
                    <div class="flex items-center gap-2">
                      <UIcon name="i-lucide-calendar" class="w-3 h-3" />
                      <span>{{ simulatedData.workflow.attestation.signatureEntreprise.dateSigned }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <UIcon name="i-lucide-user" class="w-3 h-3" />
                      <span>{{ simulatedData.workflow.attestation.signatureEntreprise.signePar }}</span>
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
    </div
    

  <!-- Document Viewer -->
  <DocumentViewer 
    :document="selectedDocument" 
    v-model:open="documentViewer" 
  />
  

</template>

<script setup lang="ts">
import { DOCUMENTS } from '~/utils/data'
import type { Company, Documents } from '~/utils/data'

interface Props {
  company: Company
}

const props = defineProps<Props>()

// Phase de décision sélectionnée
const selectedPhase = ref('phase0')

// Options pour les phases
const phaseOptions = [
  { value: 'phase0', label: 'Phase 0 - Pas de rapport déposé' },
  { value: 'phase2', label: 'Phase 1 - En attente plan d\'action' },
  { value: 'phase2b', label: 'Phase 2 - Validation plan d\'action' },
  { value: 'phase3', label: 'Phase 3 - Plan d\'action validé' },
  { value: 'phase4', label: 'Phase 4 - Avis OE et labellisation' },
  { value: 'phase5', label: 'Phase 5 - En attente validation FEEF' },
  { value: 'phase6', label: 'Phase 6 - Attestation finalisée' }
]

// Descriptions des phases
const phaseDescriptions = {
  'phase0': 'Aucun rapport d\'audit n\'a encore été déposé par l\'OE.',
  'phase2': 'Score insuffisant détecté, en attente du plan d\'action corrective.',
  'phase2b': 'Plan d\'action déposé par l\'entreprise, en attente de validation par la FEEF ou l\'OE.',
  'phase3': 'Plan d\'action mis en ligne et validé par l\'OE.',
  'phase4': 'Avis de l\'OE et avis de labellisation saisis et mis en ligne.',
  'phase5': 'En attente de la validation finale de la labellisation par la FEEF.',
  'phase6': 'Attestation de labellisation signée par l\'entreprise et la FEEF.'
}

// État pour le DocumentViewer
const documentViewer = ref(false)
const selectedDocument = ref<Documents | undefined>()

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

// Computed properties pour le statut de l'attestation
const attestationStatusColor = computed(() => {
  const feefSigned = simulatedData.value.workflow.attestation.signatureFEEF?.isGenerated
  const entrepriseSigned = simulatedData.value.workflow.attestation.signatureEntreprise?.isConfirmed
  
  if (feefSigned && entrepriseSigned) return 'bg-green-500'
  if (feefSigned || entrepriseSigned) return 'bg-orange-500'
  return 'bg-gray-400'
})

const attestationStatusTextColor = computed(() => {
  const feefSigned = simulatedData.value.workflow.attestation.signatureFEEF?.isGenerated
  const entrepriseSigned = simulatedData.value.workflow.attestation.signatureEntreprise?.isConfirmed
  
  if (feefSigned && entrepriseSigned) return 'text-green-700'
  if (feefSigned || entrepriseSigned) return 'text-orange-700'
  return 'text-gray-600'
})

const attestationStatusText = computed(() => {
  const feefSigned = simulatedData.value.workflow.attestation.signatureFEEF?.isGenerated
  const entrepriseSigned = simulatedData.value.workflow.attestation.signatureEntreprise?.isConfirmed
  
  if (feefSigned && entrepriseSigned) return 'Complète'
  if (feefSigned) return 'FEEF signée'
  if (entrepriseSigned) return 'Entreprise signée'
  return 'En attente'
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

// Fonctions utilitaires pour les couleurs et labels
function getPerformanceColor(performance: number | undefined): 'success' | 'warning' | 'error' {
  if (!performance) return 'error'
  if (performance >= 80) return 'success'
  if (performance >= 60) return 'warning'
  return 'error'
}

function getPerformanceLabel(performance: number | undefined): string {
  if (!performance) return 'Non évalué'
  if (performance >= 80) return 'Excellent'
  if (performance >= 60) return 'Satisfaisant'
  return 'Insuffisant'
}

function getRecommendationLabel(recommandation: string | undefined): string {
  switch (recommandation) {
    case 'favorable': return 'Favorable'
    case 'defavorable': return 'Défavorable'
    case 'conditionnelle': return 'Conditionnelle'
    default: return 'En analyse'
  }
}

function getDecisionLabel(decision: string | undefined): string {
  switch (decision) {
    case 'accordé': return 'Accordé'
    case 'refusé': return 'Refusé'
    case 'ajournement': return 'Ajournement'
    default: return 'En cours'
  }
}

function getDecisionFEEFLabel(statut: string | undefined): string {
  switch (statut) {
    case 'accepte': return 'Validée'
    case 'en_attente': return 'En attente'
    default: return 'En attente'
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
