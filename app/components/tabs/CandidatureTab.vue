<template>
  <div class="bg-gray-50 rounded-b-lg p-6 min-h-[300px]">
    <!-- Sélecteur de phase de candidature -->
    <div class="bg-white p-4 rounded-lg border border-gray-200 mb-6">
      <div class="flex items-center gap-4 mb-4">
        <UIcon name="i-lucide-settings" class="w-5 h-5 text-gray-600" />
        <h4 class="font-medium text-gray-900">Simulateur de phase de candidature</h4>
      </div>
      
      <div class="flex gap-6">
        <label v-for="option in phaseOptions" :key="option.value" class="flex items-center gap-2 cursor-pointer">
          <input
            v-model="selectedPhase"
            :value="option.value"
            type="radio"
            name="phase"
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

    <!-- En-tête -->
    <div class="flex items-start gap-4 mb-6 justify-between">
      <div class="flex items-start gap-4">
        <UIcon name="i-lucide-file-text" class="w-6 h-6 text-primary mt-1" />
        <div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Résumé de candidature</h3>
          <p class="text-gray-600 text-sm">Informations détaillées du dossier d'inscription de l'entreprise</p>
        </div>
      </div>
      <template v-if="role === 'company'">
        <UButton color="primary" icon="i-lucide-edit" size="md" class="font-semibold">
          Modifier les informations sur l'entreprise
        </UButton>
      </template>
    </div>

    <div class="space-y-8">
      <!-- Section 0: Informations de candidature -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-info" class="w-5 h-5 text-indigo-600" />
            <h4 class="font-semibold">Informations de candidature</h4>
          </div>
        </template>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <!-- Audit souhaité -->
          <div
            class="text-center p-4 bg-indigo-50 rounded-lg border border-indigo-200 cursor-pointer group"
            @click="role === 'company' ? null : undefined"
          >
            <UIcon name="i-lucide-calendar-check" class="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <h5 class="text-sm font-medium text-gray-900 mb-1">Audit souhaité</h5>
            <div class="space-y-1">
              <p class="text-xs font-medium text-indigo-800">
                {{ company.auditSouhaite?.date || '12/12/2024' }}
              </p>
              <p class="text-xs text-gray-600">
                OE : {{ 'Appel d\'offre' }}
              </p>
              <template v-if="role === 'company'">
                <span class="flex items-center justify-center gap-1 text-xs text-gray-600 w-full mt-2">
                  Cliquer pour modifier
                  <UIcon name="i-lucide-edit" class="w-3 h-3" />
                </span>
              </template>
            </div>
          </div>

          <!-- Éligibilité -->
          <div :class="[
            'text-center p-4 rounded-lg border',
            simulatedData.eligibilite.dateValidation 
              ? 'bg-green-50 border-green-200' 
              : 'bg-orange-50 border-orange-200'
          ]">
            <UIcon 
              :name="simulatedData.eligibilite.dateValidation ? 'i-lucide-shield-check' : 'i-lucide-shield-alert'" 
              :class="[
                'w-6 h-6 mx-auto mb-2',
                simulatedData.eligibilite.dateValidation ? 'text-green-600' : 'text-orange-600'
              ]" 
            />
            <h5 class="text-sm font-medium text-gray-900 mb-1">Éligibilité</h5>
            <div class="space-y-2">
              <UBadge 
                :color="simulatedData.eligibilite.dateValidation ? 'success' : 'warning'" 
                variant="solid" 
                size="xs"
              >
                {{ simulatedData.eligibilite.dateValidation ? 'Validée' : 'En attente de validation' }}
              </UBadge>
              
              <div v-if="simulatedData.eligibilite.dateValidation">
                <p class="text-xs text-gray-600">{{ simulatedData.eligibilite.dateValidation }}</p>
                <p class="text-xs text-gray-500">{{ simulatedData.eligibilite.signataire.prenom }} {{ simulatedData.eligibilite.signataire.nom }}</p>
              </div>
              
              <div v-else>
                <UButton
                v-if="role === 'feef'"
                  color="success"
                  size="xs"
                  icon="i-lucide-check"
                  class="mt-2"
                >
                  Valider l'éligibilité
                </UButton>
                <p class="text-xs text-gray-500 mt-1">Action FEEF uniquement</p>
              </div>
            </div>
          </div>

          <!-- Contrat mis en ligne -->
          <div 
            :class="[
              'text-center p-4 rounded-lg border transition-all',
              !simulatedData.eligibilite.dateValidation
                ? 'bg-gray-100 border-gray-300 opacity-50'
                : simulatedData.contratLabellisation.envoiContrat 
                  ? 'bg-blue-50 border-blue-200 cursor-pointer hover:bg-blue-100 hover:shadow-md group' 
                  : 'bg-yellow-50 border-yellow-200'
            ]"
            @click="simulatedData.contratLabellisation.envoiContrat && simulatedData.eligibilite.dateValidation && role !== 'oe' ? openContract() : null"
          >
            <UIcon 
              :name="!simulatedData.eligibilite.dateValidation 
                ? 'i-lucide-lock' 
                : simulatedData.contratLabellisation.envoiContrat 
                  ? 'i-lucide-file-text' 
                  : 'i-lucide-upload'" 
              :class="[
                'w-6 h-6 mx-auto mb-2 transition-transform',
                !simulatedData.eligibilite.dateValidation 
                  ? 'text-gray-400'
                  : simulatedData.contratLabellisation.envoiContrat 
                    ? 'text-blue-600 group-hover:scale-110' 
                    : 'text-yellow-600'
              ]" 
            />
            <h5 class="text-sm font-medium text-gray-900 mb-1">Contrat mis en ligne</h5>
            <div class="space-y-2">
              <p class="text-xs font-medium" :class="
                !simulatedData.eligibilite.dateValidation 
                  ? 'text-gray-500' 
                  : simulatedData.contratLabellisation.envoiContrat 
                    ? 'text-blue-800' 
                    : 'text-yellow-700'
              ">
                {{ !simulatedData.eligibilite.dateValidation 
                  ? 'Éligibilité requise' 
                  : simulatedData.contratLabellisation.envoiContrat || 'Prêt à mettre en ligne' }}
              </p>
              
              <!-- Actions selon l'état -->
              <div v-if="simulatedData.contratLabellisation.envoiContrat && simulatedData.eligibilite.dateValidation">
                <span v-if="role !== 'oe'" class="flex items-center justify-center gap-1 text-xs text-gray-600 w-full">
                  Cliquer pour consulter
                  <UIcon name="i-lucide-external-link" class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
                <span v-else class="text-xs text-gray-400">Consultation du contrat non autorisée pour OE</span>
              </div>
              
              <div v-else-if="!simulatedData.eligibilite.dateValidation" class="text-xs text-gray-500">
                En attente de validation d'éligibilité
              </div>
              
              <div v-else>
                <template v-if="role !== 'oe'">
                  <UButton
                    v-if="role === 'feef'"
                    color="primary"
                    size="xs"
                    icon="i-lucide-upload"
                    class="mt-1"
                  >
                    Mettre en ligne
                  </UButton>
                  <p class="text-xs text-gray-500 mt-1">Action FEEF</p>
                </template>
              </div>
            </div>
          </div>

          <!-- Contrat signé -->
          <div
            :class="[
              'text-center p-4 rounded-lg border transition-all',
              !simulatedData.eligibilite.dateValidation
                ? 'bg-gray-100 border-gray-300 opacity-50'
                : simulatedData.contratLabellisation.contratSigne 
                  ? 'bg-purple-50 border-purple-200' 
                  : simulatedData.contratLabellisation.envoiContrat 
                    ? 'bg-yellow-50 border-yellow-200 cursor-pointer hover:bg-yellow-100 hover:shadow-md group' 
                    : 'bg-gray-50 border-gray-200 opacity-60',
              role === 'company' && selectedPhase === 'phase2' && simulatedData.contratLabellisation.envoiContrat && !simulatedData.contratLabellisation.contratSigne ? 'cursor-pointer hover:bg-yellow-100 hover:shadow-md group' : ''
            ]"
            @click="role === 'company' && selectedPhase === 'phase2' && simulatedData.contratLabellisation.envoiContrat && !simulatedData.contratLabellisation.contratSigne ? null : undefined"
          >
            <UIcon 
              :name="!simulatedData.eligibilite.dateValidation 
                ? 'i-lucide-lock'
                : simulatedData.contratLabellisation.contratSigne 
                  ? 'i-lucide-file-signature' 
                  : simulatedData.contratLabellisation.envoiContrat 
                    ? 'i-lucide-clock' 
                    : 'i-lucide-file-x'" 
              :class="[
                'w-6 h-6 mx-auto mb-2',
                !simulatedData.eligibilite.dateValidation 
                  ? 'text-gray-400'
                  : simulatedData.contratLabellisation.contratSigne 
                    ? 'text-purple-600' 
                    : simulatedData.contratLabellisation.envoiContrat 
                      ? 'text-yellow-600' 
                      : 'text-gray-400'
              ]" 
            />
            <h5 class="text-sm font-medium text-gray-900 mb-1">Contrat signé</h5>
            <div class="space-y-1">
              <UBadge 
                :color="!simulatedData.eligibilite.dateValidation 
                  ? 'neutral'
                  : simulatedData.contratLabellisation.contratSigne 
                    ? 'success' 
                    : simulatedData.contratLabellisation.envoiContrat 
                      ? 'warning' 
                      : 'neutral'" 
                variant="solid" 
                size="xs"
              >
                {{ !simulatedData.eligibilite.dateValidation 
                  ? 'Éligibilité requise'
                  : simulatedData.contratLabellisation.contratSigne 
                    ? 'Signé' 
                    : simulatedData.contratLabellisation.envoiContrat 
                      ? 'En attente de signature' 
                      : 'Contrat non disponible' }}
              </UBadge>
              <p class="text-xs text-gray-600">
                {{ !simulatedData.eligibilite.dateValidation 
                  ? 'En attente de validation'
                  : simulatedData.contratLabellisation.contratSigne || 'Non signé' }}
              </p>
              <template v-if="role === 'company' && selectedPhase === 'phase2'">
                <span class="flex items-center justify-center gap-1 text-xs text-gray-600 w-full mt-2">
                  Cliquer pour signer
                  <UIcon name="i-lucide-pen" class="w-3 h-3" />
                </span>
              </template>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Section 1: Activités de l'entreprise -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-factory" class="w-5 h-5 text-blue-600" />
            <h4 class="font-semibold">Activités de l'entreprise</h4>
          </div>
        </template>
        
        <ActivitesGrid :activites="company.activites" />

        <!-- Activités exclues (si applicable) -->
        <div v-if="company.activites.exclusionActivites" class="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-alert-triangle" class="w-5 h-5 text-red-600 mt-0.5" />
            <div class="flex-1">
              <h5 class="text-sm font-semibold text-red-800 mb-2">Activités exclues du périmètre</h5>
              <div class="space-y-2">
                <div v-if="company.activites.activitesExclues">
                  <label class="block text-xs font-medium text-red-700 mb-1">Activités concernées :</label>
                  <p class="text-sm text-red-900 bg-white p-2 rounded border border-red-200">
                    {{ company.activites.activitesExclues }}
                  </p>
                </div>
                <div v-if="company.activites.raisonExclusion">
                  <label class="block text-xs font-medium text-red-700 mb-1">Raison de l'exclusion :</label>
                  <p class="text-sm text-red-900 bg-white p-2 rounded border border-red-200">
                    {{ company.activites.raisonExclusion }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Section 2: Sous-traitance -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-handshake" class="w-5 h-5 text-purple-600" />
            <h4 class="font-semibold">Sous-traitance</h4>
          </div>
        </template>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Nature de la sous-traitance</label>
            <p class="text-sm text-gray-900 bg-white p-3 rounded border">
              {{ company.sousTraitance.nature }}
            </p>
          </div>

          <!-- Graphique de répartition géographique -->
          <div class="grid grid-cols-2 gap-6">
            <div>
              <h5 class="text-sm font-medium text-gray-700 mb-3">Répartition du CA sous-traitance</h5>
              <div class="space-y-2">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">Part totale</span>
                  <span class="font-medium">{{ company.sousTraitance.partCATotale }}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    class="bg-purple-600 h-2 rounded-full" 
                    :style="`width: ${company.sousTraitance.partCATotale}%`"
                  ></div>
                </div>
              </div>
            </div>

            <div>
              <h5 class="text-sm font-medium text-gray-700 mb-3">Répartition géographique</h5>
              
              <!-- Légende -->
              <div class="flex flex-wrap gap-4 mb-3">
                <div class="flex items-center gap-2 text-xs">
                  <div class="w-3 h-3 bg-blue-500 rounded"></div>
                  <span class="text-gray-600">France: {{ company.sousTraitance.partCAFrance }}%</span>
                </div>
                <div class="flex items-center gap-2 text-xs">
                  <div class="w-3 h-3 bg-green-500 rounded"></div>
                  <span class="text-gray-600">Europe: {{ company.sousTraitance.partCAEurope }}%</span>
                </div>
                <div class="flex items-center gap-2 text-xs">
                  <div class="w-3 h-3 bg-orange-500 rounded"></div>
                  <span class="text-gray-600">Hors Europe: {{ company.sousTraitance.partCAHorsEurope }}%</span>
                </div>
              </div>
              
              <!-- Graphique en barres empilées -->
              <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div class="h-full flex">
                  <!-- France -->
                  <div 
                    class="bg-blue-500 h-full transition-all duration-300"
                    :style="`width: ${company.sousTraitance.partCAFrance}%`"
                  ></div>
                  <!-- Europe -->
                  <div 
                    class="bg-green-500 h-full transition-all duration-300"
                    :style="`width: ${company.sousTraitance.partCAEurope}%`"
                  ></div>
                  <!-- Hors Europe -->
                  <div 
                    class="bg-orange-500 h-full transition-all duration-300"
                    :style="`width: ${company.sousTraitance.partCAHorsEurope}%`"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Section 3: Négoce (si applicable) -->
      <UCard v-if="company.negoce && company.negoce.partCATotale > 0">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-trending-up" class="w-5 h-5 text-orange-600" />
            <h4 class="font-semibold">Activité de négoce</h4>
          </div>
        </template>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Nature du négoce</label>
            <p class="text-sm text-gray-900 bg-white p-3 rounded border">
              {{ company.negoce.nature || 'Non précisé' }}
            </p>
          </div>

          <!-- Graphiques de répartition -->
          <div class="grid grid-cols-2 gap-6">
            <div>
              <h5 class="text-sm font-medium text-gray-700 mb-3">Répartition du CA négoce</h5>
              <div class="space-y-2">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">Part totale</span>
                  <span class="font-medium">{{ company.negoce.partCATotale }}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    class="bg-orange-600 h-2 rounded-full" 
                    :style="`width: ${company.negoce.partCATotale}%`"
                  ></div>
                </div>
              </div>
            </div>

            <div v-if="company.negoce.partCAFrance || company.negoce.partCAEurope || company.negoce.partCAHorsEurope">
              <h5 class="text-sm font-medium text-gray-700 mb-3">Répartition géographique</h5>
              
              <!-- Légende -->
              <div class="flex flex-wrap gap-4 mb-3">
                <div class="flex items-center gap-2 text-xs">
                  <div class="w-3 h-3 bg-blue-500 rounded"></div>
                  <span class="text-gray-600">France: {{ company.negoce.partCAFrance || 0 }}%</span>
                </div>
                <div class="flex items-center gap-2 text-xs">
                  <div class="w-3 h-3 bg-green-500 rounded"></div>
                  <span class="text-gray-600">Europe: {{ company.negoce.partCAEurope || 0 }}%</span>
                </div>
                <div class="flex items-center gap-2 text-xs">
                  <div class="w-3 h-3 bg-orange-500 rounded"></div>
                  <span class="text-gray-600">Hors Europe: {{ company.negoce.partCAHorsEurope || 0 }}%</span>
                </div>
              </div>
              
              <!-- Graphique en barres empilées -->
              <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div class="h-full flex">
                  <!-- France -->
                  <div 
                    class="bg-blue-500 h-full transition-all duration-300"
                    :style="`width: ${company.negoce.partCAFrance || 0}%`"
                  ></div>
                  <!-- Europe -->
                  <div 
                    class="bg-green-500 h-full transition-all duration-300"
                    :style="`width: ${company.negoce.partCAEurope || 0}%`"
                  ></div>
                  <!-- Hors Europe -->
                  <div 
                    class="bg-orange-500 h-full transition-all duration-300"
                    :style="`width: ${company.negoce.partCAHorsEurope || 0}%`"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Section 4: Typologie des produits -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-package" class="w-5 h-5 text-green-600" />
            <h4 class="font-semibold">Typologie des produits</h4>
          </div>
        </template>

        <div class="space-y-4">
          <!-- Nature des produits sur toute la largeur -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Nature des produits</label>
            <p class="text-sm text-gray-900 bg-white p-3 rounded border">
              {{ company.produits.natureProduits }}
            </p>
          </div>

          <!-- Informations détaillées et graphique -->
          <div class="grid grid-cols-2 gap-6">
            <!-- Informations sur les gammes et marques -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nombre de gammes</label>
                <div class="flex items-center gap-2">
                  <span class="text-2xl font-bold text-green-600">{{ company.produits.nombreGammes }}</span>
                  <span class="text-sm text-gray-500">gammes</span>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Marques</label>
                <p class="text-sm text-gray-900">{{ company.produits.marques }}</p>
              </div>
            </div>

            <!-- Graphique empilé alimentaire/non-alimentaire -->
            <div>
              <h5 class="text-sm font-medium text-gray-700 mb-3">Répartition par volume</h5>
              
              <!-- Légende -->
              <div class="flex flex-wrap gap-4 mb-3">
                <div class="flex items-center gap-2 text-xs">
                  <div class="w-3 h-3 bg-green-500 rounded"></div>
                  <span class="text-gray-600">Alimentaires: {{ company.produits.partVolumeAlimentaires }}%</span>
                </div>
                <div class="flex items-center gap-2 text-xs">
                  <div class="w-3 h-3 bg-blue-500 rounded"></div>
                  <span class="text-gray-600">Non-alimentaires: {{ company.produits.partVolumeNonAlimentaires }}%</span>
                </div>
              </div>
              
              <!-- Graphique en barres empilées -->
              <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div class="h-full flex">
                  <!-- Produits alimentaires -->
                  <div 
                    class="bg-green-500 h-full transition-all duration-300"
                    :style="`width: ${company.produits.partVolumeAlimentaires}%`"
                  ></div>
                  <!-- Produits non-alimentaires -->
                  <div 
                    class="bg-blue-500 h-full transition-all duration-300"
                    :style="`width: ${company.produits.partVolumeNonAlimentaires}%`"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Section 5: Labellisations et RSE -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-award" class="w-5 h-5 text-yellow-600" />
            <h4 class="font-semibold">Labellisations et démarches RSE</h4>
          </div>
        </template>

        <div class="space-y-6">
          <!-- Certification biologique -->
          <div class="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
            <UIcon name="i-lucide-leaf" class="w-6 h-6 text-green-600" />
            <div class="flex-1">
              <h5 class="font-medium text-gray-900 mb-1">Certification biologique</h5>
              <UBadge :color="company.labellisations.biologique ? 'success' : 'neutral'" variant="solid">
                {{ company.labellisations.biologique ? 'Certifié Bio' : 'Non certifié' }}
              </UBadge>
            </div>
          </div>

          <!-- Grille des autres labellisations -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Labellisations QSE -->
            <div class="space-y-3">
              <div class="flex items-center gap-2 mb-3">
                <UIcon name="i-lucide-shield-check" class="w-5 h-5 text-blue-600" />
                <h5 class="font-semibold text-gray-900">Qualité - Sécurité - Environnement</h5>
              </div>
              
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-2">Labellisation principale</label>
                <div class="bg-white p-3 rounded border border-gray-200">
                  <p class="text-sm text-gray-900 font-medium">
                    {{ company.labellisations.labellisationQSE || 'Aucune labellisation' }}
                  </p>
                </div>
              </div>

              <div v-if="company.labellisations.autreQSE" class="mt-3">
                <label class="block text-xs font-medium text-gray-600 mb-2">Autre QSE (spécifiée)</label>
                <div class="bg-blue-50 p-3 rounded border border-blue-200">
                  <p class="text-sm text-blue-900 font-medium">
                    {{ company.labellisations.autreQSE }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Labellisations RSE -->
            <div class="space-y-3">
              <div class="flex items-center gap-2 mb-3">
                <UIcon name="i-lucide-heart-handshake" class="w-5 h-5 text-purple-600" />
                <h5 class="font-semibold text-gray-900">Responsabilité Sociétale</h5>
              </div>
              
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-2">Labellisation principale</label>
                <div class="bg-white p-3 rounded border border-gray-200">
                  <p class="text-sm text-gray-900 font-medium">
                    {{ company.labellisations.labellisationRSE || 'Aucune démarche formalisée' }}
                  </p>
                </div>
              </div>

              <div v-if="company.labellisations.autreRSE" class="mt-3">
                <label class="block text-xs font-medium text-gray-600 mb-2">Autre RSE (spécifiée)</label>
                <div class="bg-purple-50 p-3 rounded border border-purple-200">
                  <p class="text-sm text-purple-900 font-medium">
                    {{ company.labellisations.autreRSE }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Commerce équitable -->
            <div class="space-y-3">
              <div class="flex items-center gap-2 mb-3">
                <UIcon name="i-lucide-handshake" class="w-5 h-5 text-orange-600" />
                <h5 class="font-semibold text-gray-900">Commerce Équitable</h5>
              </div>
              
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-2">Labellisation principale</label>
                <div class="bg-white p-3 rounded border border-gray-200">
                  <p class="text-sm text-gray-900 font-medium">
                    {{ company.labellisations.labellisationEquitable || 'Aucune certification' }}
                  </p>
                </div>
              </div>

              <div v-if="company.labellisations.autreEquitable" class="mt-3">
                <label class="block text-xs font-medium text-gray-600 mb-2">Autre équitable (spécifiée)</label>
                <div class="bg-orange-50 p-3 rounded border border-orange-200">
                  <p class="text-sm text-orange-900 font-medium">
                    {{ company.labellisations.autreEquitable }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      
      </UCard>
    </div>

    <!-- Document Viewer pour le contrat -->
    <DocumentViewer 
      v-model:open="isContractViewerOpen" 
      :document="contractDocument" 
    />
  </div>
</template>

<script setup lang="ts">
import ActivitesGrid from '~/components/ActivitesGrid.vue'

interface Props {
  company: any
  role?: 'oe' | 'feef' | "company"
}

const props = withDefaults(defineProps<Props>(), {
  role: 'feef'
})

// État pour le viewer du contrat
const isContractViewerOpen = ref(false)

// Phase de candidature sélectionnée
const selectedPhase = ref('phase0')

// Options pour les phases
const phaseOptions = [
  { value: 'phase0', label: 'Phase 0 - Éligibilité non validée' },
  { value: 'phase1', label: 'Phase 1 - Contrat non mis en ligne' },
  { value: 'phase2', label: 'Phase 2 - Contrat mis en ligne, non signé' },
  { value: 'phase3', label: 'Phase 3 - Contrat signé' }
]

// Descriptions des phases
const phaseDescriptions = {
  'phase0': 'Le dossier de candidature est en cours d\'examen. L\'éligibilité n\'est pas encore validée par la FEEF.',
  'phase1': 'L\'éligibilité est validée mais le contrat de labellisation n\'est pas encore disponible.',
  'phase2': 'Le contrat de labellisation a été mis en ligne et est disponible pour signature.',
  'phase3': 'Le contrat de labellisation a été signé par l\'entreprise. La candidature est complète.'
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
        eligibilite: {
          ...props.company.eligibilite,
          estEligible: false,
          dateValidation: null
        },
        contratLabellisation: {
          envoiContrat: null,
          contratSigne: null
        }
      }
    case 'phase1':
      return {
        ...baseData,
        eligibilite: props.company.eligibilite,
        contratLabellisation: {
          envoiContrat: null,
          contratSigne: null
        }
      }
    case 'phase2':
      return {
        ...baseData,
        eligibilite: props.company.eligibilite,
        contratLabellisation: {
          envoiContrat: '1/8/2025',
          contratSigne: null
        }
      }
    case 'phase3':
      return {
        ...baseData,
        eligibilite: props.company.eligibilite,
        contratLabellisation: {
          envoiContrat: '1/8/2025',
          contratSigne: '10/8/2025'
        }
      }
    default:
      return props.company.workflow
  }
})

// Document contrat
const contractDocument = computed(() => {
  return DOCUMENTS.find(doc => doc.id === 'contrat-labellisation')
})

// Fonction pour ouvrir le contrat
const openContract = () => {
  if (contractDocument.value && simulatedData.value.contratLabellisation.envoiContrat) {
    isContractViewerOpen.value = true
  }
}

// Fonction pour valider l'éligibilité (factice)
const validateEligibility = () => {
  // Simulation de la validation d'éligibilité
  selectedPhase.value = 'phase1'
}

// Fonction pour mettre en ligne le contrat (factice)
const publishContract = () => {
  // Simulation de la mise en ligne du contrat
  selectedPhase.value = 'phase2'
}
</script>
