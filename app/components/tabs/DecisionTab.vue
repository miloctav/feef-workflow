<template>
  <div class="bg-gray-50 rounded-b-lg p-6 min-h-[300px]">
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
      
      <div class="grid grid-cols-3 gap-4">
        <!-- Rapport simplifié -->
        <div class="text-center p-4 bg-purple-50 rounded-lg border border-purple-200 cursor-pointer transition-all hover:bg-purple-100 hover:shadow-md group"
             @click="viewRapportSimplifie"
             :class="{ 'opacity-50 cursor-not-allowed': !company.workflow.rapport.rapportSimplifie?.isAvailable }">
          <UIcon name="i-lucide-file-text" class="w-6 h-6 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <h5 class="text-sm font-medium text-gray-900 mb-1">Rapport simplifié</h5>
          <div class="space-y-1">
            <p class="text-xs font-medium text-purple-800">
              {{ company.workflow.rapport.rapportSimplifie?.dateTransmission ? 
                `Transmis le ${company.workflow.rapport.rapportSimplifie.dateTransmission}` : 
                'Non disponible' }}
            </p>
            <div v-if="company.workflow.rapport.rapportSimplifie?.isAvailable" class="flex items-center justify-center gap-1 text-xs text-gray-600">
              <span>Cliquer pour consulter</span>
              <UIcon name="i-lucide-external-link" class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p v-else class="text-xs text-gray-500">Synthèse non disponible</p>
          </div>
        </div>

        <!-- Rapport détaillé -->
        <div class="text-center p-4 bg-indigo-50 rounded-lg border border-indigo-200 cursor-pointer transition-all hover:bg-indigo-100 hover:shadow-md group"
             @click="viewRapportDetaille"
             :class="{ 'opacity-50 cursor-not-allowed': !company.workflow.rapport.rapportDetaille?.isAvailable }">
          <UIcon name="i-lucide-file-chart-line" class="w-6 h-6 text-indigo-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <h5 class="text-sm font-medium text-gray-900 mb-1">Rapport détaillé</h5>
          <div class="space-y-1">
            <p class="text-xs font-medium text-indigo-800">
              {{ company.workflow.rapport.rapportDetaille?.dateTransmission ? 
                `Transmis le ${company.workflow.rapport.rapportDetaille.dateTransmission}` : 
                'Non disponible' }}
            </p>
            <div v-if="company.workflow.rapport.rapportDetaille?.isAvailable" class="flex items-center justify-center gap-1 text-xs text-gray-600">
              <span>Cliquer pour consulter</span>
              <UIcon name="i-lucide-external-link" class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p v-else class="text-xs text-gray-500">Rapport complet non disponible</p>
          </div>
        </div>

        <!-- Score global de performance -->
        <div class="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
          <UIcon name="i-lucide-target" class="w-6 h-6 text-green-600 mx-auto mb-2" />
          <h5 class="text-sm font-medium text-gray-900 mb-1">Score global</h5>
          <div class="space-y-1">
            <div v-if="company.workflow.rapport.performanceGlobale" class="text-2xl font-bold text-green-600">
              {{ company.workflow.rapport.performanceGlobale }}%
            </div>
            <UBadge 
              v-if="company.workflow.rapport.performanceGlobale"
              :color="company.workflow.rapport.performanceGlobale >= 80 ? 'success' : 
                     company.workflow.rapport.performanceGlobale >= 60 ? 'warning' : 'error'"
              variant="soft"
              size="xs"
            >
              {{ company.workflow.rapport.performanceGlobale >= 80 ? 'Excellent' : 
                 company.workflow.rapport.performanceGlobale >= 60 ? 'Satisfaisant' : 'À améliorer' }}
            </UBadge>
            <p v-else class="text-xs text-gray-500">Score non attribué</p>
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
            Plan détaillant les mesures correctives suite à la performance insuffisante ({{ company.workflow.rapport.performanceGlobale }}%).
          </p>
          
          <!-- Informations selon l'état -->
          <div class="space-y-2">
            <!-- Plan d'action disponible -->
            <div v-if="company.workflow.rapport.planAction?.isAvailable" class="space-y-2">
              <!-- Date de transmission -->
              <div class="flex items-center gap-2 text-xs text-orange-700">
                <UIcon name="i-lucide-calendar-plus" class="w-3 h-3" />
                <span>Déposé le {{ company.workflow.rapport.planAction.dateTransmission }}</span>
              </div>
              
              <!-- Validation OE -->
              <div v-if="company.workflow.rapport.planAction?.valideParOE" class="flex items-center gap-2 text-xs text-green-700">
                <UIcon name="i-lucide-check-circle" class="w-3 h-3" />
                <span>Validé par l'OE le {{ company.workflow.rapport.planAction.dateValidation }}</span>
              </div>
              <div v-else class="flex items-center gap-2 text-xs text-amber-700">
                <UIcon name="i-lucide-clock" class="w-3 h-3" />
                <span>En cours d'examen par l'Organisme Évaluateur</span>
              </div>
            </div>
            
            <!-- Plan d'action non transmis -->
            <div v-else class="flex items-center gap-2 text-xs text-red-700">
              <UIcon name="i-lucide-calendar-x" class="w-3 h-3" />
              <span>À remettre avant le {{ company.workflow.rapport.planAction?.dateLimiteDepot || 'À définir' }}</span>
            </div>
          </div>
          
          <!-- Bouton pour consulter ou statut -->
          <div class="mt-3">
            <UButton 
              v-if="company.workflow.rapport.planAction?.isAvailable"
              @click="viewPlanAction"
              variant="outline" 
              color="primary" 
              size="xs"
              icon="i-lucide-eye"
              label="Consulter le plan d'action"
              class="w-full"
            />
            <div v-else class="text-center py-2 px-3 bg-red-50 rounded border border-red-200">
              <span class="text-xs font-medium text-red-800">En attente de transmission</span>
            </div>
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
            v-if="company.workflow.avis.avis"
            :color="company.workflow.avis.avis === 'favorable' ? 'success' : company.workflow.avis.avis === 'défavorable' ? 'error' : 'warning'"
            variant="solid"
            size="sm"
          >
            {{ company.workflow.avis.avis === 'favorable' ? 'Favorable' : company.workflow.avis.avis === 'défavorable' ? 'Défavorable' : 'En cours' }}
          </UBadge>
        </div>
      </template>

      <!-- Contenu sur une seule ligne avec deux colonnes -->
      <div class="grid grid-cols-2 gap-6">
        <!-- Colonne 1: Date, points bloquants et argumentaire -->
        <div class="space-y-3">
          <!-- Informations sur la date et points bloquants -->
          <div v-if="company.workflow.avis.dateTransmission" class="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div class="space-y-2">
              <!-- Date de transmission -->
              <div class="flex items-center gap-2 text-sm">
                <UIcon name="i-lucide-calendar" class="w-4 h-4 text-purple-600" />
                <span class="text-purple-900 font-medium">5/4/2025</span>
              </div>
              
              <!-- Points bloquants -->
              <div v-if="company.workflow.avis.absencePointsBloquants !== undefined" class="flex items-center gap-2">
                <UIcon 
                  :name="company.workflow.avis.absencePointsBloquants ? 'i-lucide-check-circle' : 'i-lucide-alert-triangle'"
                  class="w-4 h-4"
                  :class="company.workflow.avis.absencePointsBloquants ? 'text-green-600' : 'text-red-600'"
                />
                <span class="text-sm font-medium"
                  :class="company.workflow.avis.absencePointsBloquants ? 'text-green-800' : 'text-red-800'"
                >
                  Points bloquants existants
                </span>
              </div>
            </div>
          </div>
          
          <div v-else class="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-clock" class="w-4 h-4 text-gray-600" />
              <span class="text-gray-700">En attente de l'avis de l'OE</span>
            </div>
          </div>

          <!-- Argumentaire de l'OE -->
          <div v-if="company.workflow.avis.argumentaire" class="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <h5 class="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
              <UIcon name="i-lucide-message-square-text" class="w-4 h-4" />
              Argumentaire
            </h5>
            <p class="text-sm text-purple-800 leading-relaxed">{{ company.workflow.avis.argumentaire }}</p>
          </div>
        </div>

        <!-- Colonne 2: Document ou absence de document -->
        <div class="space-y-3">
          <!-- Document d'avis disponible -->

          <!-- Avis de labellisation (si favorable) -->
          <div v-if="company.workflow.avis.avis === 'favorable' && company.workflow.avis.avisLabellisation" class="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div class="flex items-center gap-3 mb-2">
              <UIcon name="i-lucide-certificate" class="w-4 h-4 text-blue-600" />
              <span class="text-sm font-medium text-blue-900">Avis de labellisation</span>
            </div>
            <p class="text-xs text-blue-800 mb-2">
              Document officiel de labellisation émis par l'Organisme Évaluateur suite à l'avis favorable.
            </p>
            
            <!-- Date de dépôt -->
            <div v-if="company.workflow.avis.avisLabellisation.dateTransmission" class="flex items-center gap-2 mb-3 text-xs text-blue-700">
              <UIcon name="i-lucide-calendar-plus" class="w-3 h-3" />
              <span>Émis le {{ company.workflow.avis.avisLabellisation.dateTransmission }}</span>
            </div>
            
            <!-- Bouton pour consulter -->
            <UButton 
              v-if="company.workflow.avis.avisLabellisation.isAvailable"
              @click="viewAvisLabellisation"
              variant="outline" 
              color="primary" 
              size="xs"
              icon="i-lucide-eye"
              label="Consulter l'avis de labellisation"
              class="w-full"
            />
          </div>
        </div>
      </div>
    </UCard>
      
    <!-- Validation FEEF -->
    <UCard v-if="company.workflow.avis.avis === 'favorable' && company.workflow.avis.avisLabellisation?.isAvailable" class="mb-6">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-shield-check-2" class="w-5 h-5 text-emerald-600" />
            <h4 class="font-semibold">Validation FEEF</h4>
          </div>
          <UBadge 
            v-if="company.workflow.avis.decisionFEEF?.statut"
            :color="company.workflow.avis.decisionFEEF.statut === 'accepte' ? 'success' : 'warning'"
            variant="solid"
            size="sm"
          >
            {{ getDecisionFEEFLabel(company.workflow.avis.decisionFEEF.statut) }}
          </UBadge>
        </div>
      </template>
      
      <!-- Version: En attente de validation -->
      <div v-if="!company.workflow.avis.decisionFEEF?.statut || company.workflow.avis.decisionFEEF.statut === 'en_attente'">
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
                  En validant, vous générerez automatiquement l'attestation de labellisation avec une validité de 2 ans.
                </p>
              </div>
              
              <UButton 
                @click="validateLabellisation"
                color="success" 
                icon="i-lucide-check-circle"
                size="lg"
                class="px-8 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Valider la labellisation
              </UButton>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Version: Labellisation validée -->
      <div v-else-if="company.workflow.avis.decisionFEEF.statut === 'accepte'">
        <div class="space-y-6">

          <!-- Layout adaptatif : selon l'état des signatures -->
          <div v-if="!company.workflow.attestation.signatureFEEF?.isGenerated">
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
                    :color="company.workflow.attestation.signatureEntreprise?.isConfirmed ? 'success' : 'neutral'"
                    variant="soft" 
                    size="xs"
                  >
                    {{ company.workflow.attestation.signatureEntreprise?.isConfirmed ? 'Confirmée' : 'En attente' }}
                  </UBadge>
                </div>
                
                <div v-if="company.workflow.attestation.signatureEntreprise?.isConfirmed" class="space-y-2 text-sm text-emerald-800">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-calendar" class="w-3 h-3" />
                    <span>{{ company.workflow.attestation.signatureEntreprise.dateSigned }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-user" class="w-3 h-3" />
                    <span>{{ company.workflow.attestation.signatureEntreprise.signePar }}</span>
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

            <!-- Attestation en mode simple quand pas encore signée -->
            <div class="mt-6 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-4 border border-gray-200">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg flex items-center justify-center">
                    <UIcon name="i-lucide-file-badge" class="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 class="font-semibold text-gray-900">Attestation de labellisation</h4>
                    <p class="text-xs text-gray-600">Validité : {{ company.workflow.attestation.dateValidite }}</p>
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
                      <p class="text-xs text-gray-600">Validité : {{ company.workflow.attestation.dateValidite }}</p>
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
                      <span>{{ company.workflow.attestation.signatureFEEF.dateSigned }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <UIcon name="i-lucide-user" class="w-3 h-3" />
                      <span>{{ company.workflow.attestation.signatureFEEF.signePar }}</span>
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
                      :color="company.workflow.attestation.signatureEntreprise?.isConfirmed ? 'success' : 'neutral'"
                      variant="soft" 
                      size="xs"
                    >
                      {{ company.workflow.attestation.signatureEntreprise?.isConfirmed ? 'Confirmée' : 'En attente' }}
                    </UBadge>
                  </div>
                  
                  <div v-if="company.workflow.attestation.signatureEntreprise?.isConfirmed" class="space-y-2 text-sm text-emerald-800">
                    <div class="flex items-center gap-2">
                      <UIcon name="i-lucide-calendar" class="w-3 h-3" />
                      <span>{{ company.workflow.attestation.signatureEntreprise.dateSigned }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <UIcon name="i-lucide-user" class="w-3 h-3" />
                      <span>{{ company.workflow.attestation.signatureEntreprise.signePar }}</span>
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

// État pour le DocumentViewer
const documentViewer = ref(false)
const selectedDocument = ref<Documents | undefined>()

// Computed properties pour les rapports d'audit
const rapportSimplifiedDocument = computed(() => 
  DOCUMENTS.find(doc => doc.id === 'rapport-audit-simplifie')
)

const rapportDetailledDocument = computed(() => 
  DOCUMENTS.find(doc => doc.id === 'rapport-audit-detaille')  
)

const planActionDocument = computed(() => 
  DOCUMENTS.find(doc => doc.id === 'plan-action')
)

// Computed property pour déterminer si un plan d'action est nécessaire
const needsPlanAction = computed(() => {
  const performance = props.company.workflow.rapport.performanceGlobale
  return performance !== undefined && performance < 65
})

// Computed properties pour le statut de l'attestation
const attestationStatusColor = computed(() => {
  const feefSigned = props.company.workflow.attestation.signatureFEEF?.isGenerated
  const entrepriseSigned = props.company.workflow.attestation.signatureEntreprise?.isConfirmed
  
  if (feefSigned && entrepriseSigned) return 'bg-green-500'
  if (feefSigned || entrepriseSigned) return 'bg-orange-500'
  return 'bg-gray-400'
})

const attestationStatusTextColor = computed(() => {
  const feefSigned = props.company.workflow.attestation.signatureFEEF?.isGenerated
  const entrepriseSigned = props.company.workflow.attestation.signatureEntreprise?.isConfirmed
  
  if (feefSigned && entrepriseSigned) return 'text-green-700'
  if (feefSigned || entrepriseSigned) return 'text-orange-700'
  return 'text-gray-600'
})

const attestationStatusText = computed(() => {
  const feefSigned = props.company.workflow.attestation.signatureFEEF?.isGenerated
  const entrepriseSigned = props.company.workflow.attestation.signatureEntreprise?.isConfirmed
  
  if (feefSigned && entrepriseSigned) return 'Complète'
  if (feefSigned) return 'FEEF signée'
  if (entrepriseSigned) return 'Entreprise signée'
  return 'En attente'
})

const attestationDocument = computed(() => 
  DOCUMENTS.find(doc => doc.id === 'attestation-labellisation')
)

// Méthodes pour consulter les rapports
function viewRapportSimplifie() {
  if (props.company.workflow.rapport.rapportSimplifie?.isAvailable) {
    let doc = rapportSimplifiedDocument.value
    if (!doc) {
      doc = {
        id: 'rapport-audit-simplifie',
        name: 'Rapport d\'audit simplifié',
        description: 'Rapport simplifié de l\'audit de labellisation',
        labelingCaseState: 'DECISION',
        isAvailable: true,
        dateUpload: props.company.workflow.rapport.rapportSimplifie?.dateTransmission,
        uploadedBy: 'Organisme Évaluateur',
        fileSize: '2.3 MB',
        fileType: 'PDF'
      }
    }
    selectedDocument.value = doc
    documentViewer.value = true
  }
}

function viewRapportDetaille() {
  if (props.company.workflow.rapport.rapportDetaille?.isAvailable) {
    let doc = rapportDetailledDocument.value
    if (!doc) {
      doc = {
        id: 'rapport-audit-detaille',
        name: 'Rapport d\'audit détaillé',
        description: 'Rapport détaillé de l\'audit de labellisation',
        labelingCaseState: 'DECISION',
        isAvailable: true,
        dateUpload: props.company.workflow.rapport.rapportDetaille?.dateTransmission,
        uploadedBy: 'Organisme Évaluateur',
        fileSize: '4.7 MB',
        fileType: 'PDF'
      }
    }
    selectedDocument.value = doc
    documentViewer.value = true
  }
}

function viewPlanAction() {
  if (props.company.workflow.rapport.planAction?.isAvailable) {
    let doc = planActionDocument.value
    if (!doc) {
      doc = {
        id: 'plan-action',
        name: 'Plan d\'action correctives',
        description: 'Plan d\'action pour les mesures correctives requises',
        labelingCaseState: 'DECISION',
        isAvailable: true,
        dateUpload: props.company.workflow.rapport.planAction?.dateTransmission,
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
    dateUpload: props.company.workflow.avis.avisLabellisation?.dateTransmission,
    uploadedBy: 'Organisme Évaluateur - Direction',
    fileSize: '1.8 MB',
    fileType: 'PDF'
  }
  
  if (props.company.workflow.avis.avisLabellisation?.isAvailable) {
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
  // Simuler la validation de la labellisation
  const today = new Date().toLocaleDateString('fr-FR')
  const validityDate = new Date()
  validityDate.setFullYear(validityDate.getFullYear() + 3) // Validité 3 ans
  
  // Mettre à jour les données de l'entreprise (simulation)
  if (props.company.workflow.avis.decisionFEEF) {
    props.company.workflow.avis.decisionFEEF.statut = 'accepte'
    props.company.workflow.avis.decisionFEEF.dateDecision = today
    props.company.workflow.avis.decisionFEEF.validePar = 'Katrin BARROIS - Directrice FEEF'
  }
  
  // Générer automatiquement l'attestation
  props.company.workflow.attestation.dateTransmission = today
  props.company.workflow.attestation.dateValidite = validityDate.toLocaleDateString('fr-FR')
  
  console.log('Labellisation validée avec succès!')
}

function signAttestationFEEF() {
  const today = new Date().toLocaleDateString('fr-FR')
  
  // Simuler la signature de l'attestation par la FEEF
  if (props.company.workflow.attestation.signatureFEEF) {
    props.company.workflow.attestation.signatureFEEF.dateSigned = today
    props.company.workflow.attestation.signatureFEEF.signePar = 'Katrin BARROIS - Directrice FEEF'
    props.company.workflow.attestation.signatureFEEF.isGenerated = true
  }
  
  console.log('Attestation signée par la FEEF')
}

function checkEntrepriseSignature() {
  // Simuler la vérification de la signature entreprise
  // En réalité, cela pourrait vérifier un système externe
  console.log('Vérification de la signature entreprise...')
  
  // Pour la démonstration, on peut simuler une signature
  if (Math.random() > 0.5) {
    const today = new Date().toLocaleDateString('fr-FR')
    if (props.company.workflow.attestation.signatureEntreprise) {
      props.company.workflow.attestation.signatureEntreprise.dateSigned = today
      props.company.workflow.attestation.signatureEntreprise.signePar = props.company.dirigeant.prenom + ' ' + props.company.dirigeant.nom + ' - ' + props.company.dirigeant.fonction
      props.company.workflow.attestation.signatureEntreprise.isConfirmed = true
    }
    console.log('Signature entreprise confirmée')
  } else {
    console.log('Aucune signature trouvée')
  }
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
      dateUpload: props.company.workflow.attestation.dateTransmission,
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
