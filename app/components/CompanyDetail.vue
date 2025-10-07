<script setup lang="ts">
import ContactCard from '~/components/ContactCard.vue';
import ActivitesGrid from '~/components/ActivitesGrid.vue';
import { getCompanyById } from '~/utils/data';
import type { PropType } from 'vue';

defineProps({
  company: {
    type: Object as PropType<any>,
    required: true
  },
  role: {
    type: String as PropType<"oe" | "feef" | "company">,
    required: false,
    default: 'feef'
  }
});
</script>

<template>
    <div class="w-4/5 mx-auto">
    <UCard class="mb-6">
      <div class="flex items-start gap-6">
        <!-- Icône entreprise à gauche -->
        <div class="flex-shrink-0 flex flex-col items-center gap-3">
          <UIcon 
            name="i-lucide-building-2" 
            class="w-16 h-16 text-primary"
          />
          <UButton
            v-if="role === 'company'"
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-plus"
            class="text-xs"
          >
            Nouveau dossier
          </UButton>
        </div>
        <!-- Informations à droite -->
        <div class="flex-1 grid grid-cols-3 gap-6">
          <!-- Colonne gauche -->
          <div>
            <h1 class="font-bold text-xl text-gray-900 mb-4">Raison sociale</h1>
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-600">SIREN:</span>
                <span class="text-gray-900">{{ company.raisonSociale.siren }}</span>
              </div>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-phone" class="w-4 h-4 text-gray-500" />
                <div class="text-gray-900">{{ company.raisonSociale.telephone }}</div>
              </div>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-map-pin" class="w-4 h-4 text-gray-500" />
                <span class="text-sm font-medium text-gray-600">Sites:</span>
                <span class="text-gray-900">{{ company.sites.nombreSites }}</span>
              </div>
            </div>
          </div>
          <!-- Colonne centre -->
          <div>
            <div class="h-10 mb-4"></div>
            <div class="space-y-1 text-gray-700">
              <div>{{ company.raisonSociale.adresse }}</div>
              <div>{{ company.raisonSociale.cp }} {{ company.raisonSociale.ville }}</div>
              <div class="text-gray-600">{{ company.raisonSociale.region }}</div>
            </div>
          </div>
          <!-- Colonne droite - Dossiers -->
          <div>
            <h2 class="font-bold text-xl text-gray-900 mb-4">Dossiers</h2>
            <div class="space-y-2">
              <div class="flex flex-wrap gap-2 items-center">
                <NuxtLink 
                  :to="`/${role}/labeling-cases/${company.id}`"
                  class="text-sm font-medium text-gray-900 hover:text-primary hover:underline cursor-pointer"
                >
                  {{ company.workflow.type }} (2025)
                </NuxtLink>
                <UBadge 
                  :variant="'subtle'" 
                  :color="company.workflow.state === 'CANDIDATURE' ? 'neutral' : 
                          company.workflow.state === 'ENGAGEMENT' ? 'warning' : 
                          company.workflow.state === 'AUDIT' ? 'info' :
                          company.workflow.state === 'DECISION' ? 'primary' :
                          company.workflow.state === 'LABELISE' ? 'success' : 'error'"
                  size="sm"
                >
                  {{ company.workflow.state }}
                </UBadge>
              </div>
              <div v-if="company.workflow.type === 'Renouvellement'" class="flex flex-wrap gap-2 items-center">
                <NuxtLink 
                  :to="`/${role}/labeling-cases/prev-${company.id}`"
                  class="text-sm font-medium text-gray-700 hover:text-primary hover:underline cursor-pointer"
                >
                  Initial (2022)
                </NuxtLink>
                <UBadge 
                  variant="subtle" 
                  color="success"
                  size="sm"
                >
                  LABELISE
                </UBadge>
              </div>
              <div v-if="company.workflow.state === 'LABELISE'" class="flex flex-wrap gap-2 items-center opacity-60">
                <span class="text-sm font-medium text-gray-500 cursor-not-allowed">
                  Renouvellement (2028)
                </span>
                <UBadge 
                  variant="outline" 
                  color="neutral"
                  size="sm"
                >
                  À venir
                </UBadge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Périmètre de labellisation -->
      <div v-if="company.perimetreLabellisation" class="mt-6 pt-6 border-t border-gray-200">
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

    <!-- Section: Information sur le groupe -->
    <UCard v-if="company.appartenanceGroupe.estGroupe || company.appartenanceGroupe.appartientGroupe" class="mb-6">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-building" class="w-6 h-6 text-primary" />
            <h2 class="font-bold text-xl text-gray-900">
              {{ company.appartenanceGroupe.estGroupe ? 'Groupe ' + company.appartenanceGroupe.nomGroupe : 'Appartenance au groupe' }}
            </h2>
          </div>
          <UButton
            v-if="company.appartenanceGroupe.estGroupe && role === 'feef'"
            color="primary"
            variant="outline"
            size="sm"
            icon="i-lucide-plus"
          >
            Ajouter une entreprise
          </UButton>
        </div>
      </template>

      <!-- Si c'est un groupe -->
      <div v-if="company.appartenanceGroupe.estGroupe" class="space-y-6">
        <!-- Statut de labellisation du groupe -->
        <div class="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <UIcon name="i-lucide-shield-check" class="w-6 h-6 text-blue-600" />
          <div class="flex-1">
            <h3 class="font-semibold text-gray-900 mb-1">Maître de la labellisation</h3>
            <p class="text-sm text-gray-700">Ce groupe pilote la démarche de labellisation pour l'ensemble de ses entreprises</p>
          </div>
          <UBadge color="primary" variant="solid" size="lg">
            Groupe pilote
          </UBadge>
        </div>

        <!-- Liste des entreprises du groupe -->
        <div v-if="company.appartenanceGroupe.entreprisesGroupe && company.appartenanceGroupe.entreprisesGroupe.length > 0">
          <h3 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <UIcon name="i-lucide-building-2" class="w-5 h-5 text-gray-600" />
            Entreprises du groupe
          </h3>
          <div class="space-y-2">
            <div
              v-for="entrepriseId in company.appartenanceGroupe.entreprisesGroupe"
              :key="entrepriseId"
              class="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-sm transition-all"
            >
              <UIcon name="i-lucide-building-2" class="w-5 h-5 text-gray-500" />
              <NuxtLink
                :to="`/${role}/companies/${entrepriseId}`"
                class="flex-1 font-medium text-gray-900 hover:text-primary"
              >
                {{ getCompanyById(entrepriseId)?.raisonSociale.nom || entrepriseId }}
              </NuxtLink>
              
            </div>
          </div>
        </div>

        <!-- Structures labellisées et en cours -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-if="company.appartenanceGroupe.structuresLabellisees && company.appartenanceGroupe.structuresLabellisees.length > 0">
            <h3 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <UIcon name="i-lucide-badge-check" class="w-4 h-4 text-green-600" />
              Structures labellisées
            </h3>
            <div class="space-y-2">
              <UBadge
                v-for="structure in company.appartenanceGroupe.structuresLabellisees"
                :key="structure"
                variant="subtle"
                color="success"
                class="mr-2"
              >
                {{ structure }}
              </UBadge>
            </div>
          </div>
          <div v-if="company.appartenanceGroupe.structuresEnCoursLabellisation && company.appartenanceGroupe.structuresEnCoursLabellisation.length > 0">
            <h3 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <UIcon name="i-lucide-clock" class="w-4 h-4 text-orange-600" />
              En cours de labellisation
            </h3>
            <div class="space-y-2">
              <UBadge
                v-for="structure in company.appartenanceGroupe.structuresEnCoursLabellisation"
                :key="structure"
                variant="subtle"
                color="warning"
                class="mr-2"
              >
                {{ structure }}
              </UBadge>
            </div>
          </div>
        </div>

        <!-- Engagement groupe -->
        <div v-if="company.appartenanceGroupe.wantEngageALLGroupe">
          <h3 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <UIcon name="i-lucide-target" class="w-4 h-4 text-blue-600" />
            Engagement du groupe
          </h3>
          <p class="text-gray-700 text-sm p-3 bg-gray-50 rounded-lg">
            {{ company.appartenanceGroupe.wantEngageALLGroupe }}
          </p>
        </div>
      </div>

      <!-- Si l'entreprise appartient à un groupe -->
      <div v-else-if="company.appartenanceGroupe.appartientGroupe" class="space-y-4">
        <!-- Info sur le groupe parent -->
        <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <UIcon name="i-lucide-building" class="w-8 h-8 text-gray-600" />
          <div class="flex-1">
            <h3 class="font-semibold text-gray-900 mb-1">Groupe parent</h3>
            <NuxtLink
              v-if="company.appartenanceGroupe.groupeParentId"
              :to="`/${role}/companies/${company.appartenanceGroupe.groupeParentId}`"
              class="text-lg font-bold text-primary hover:underline"
            >
              {{ company.appartenanceGroupe.nomGroupe }}
            </NuxtLink>
            <p v-else class="text-lg font-bold text-gray-900">
              {{ company.appartenanceGroupe.nomGroupe }}
            </p>
          </div>
        </div>

        <!-- Statut de labellisation -->
        <div class="flex items-center gap-3 p-4 rounded-lg border" :class="company.appartenanceGroupe.maitreLabelisation ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200'">
          <UIcon :name="company.appartenanceGroupe.maitreLabelisation ? 'i-lucide-shield-check' : 'i-lucide-link'" class="w-6 h-6" :class="company.appartenanceGroupe.maitreLabelisation ? 'text-blue-600' : 'text-purple-600'" />
          <div class="flex-1">
            <h3 class="font-semibold text-gray-900 mb-1">
              {{ company.appartenanceGroupe.maitreLabelisation ? 'Maître de la labellisation' : 'Suit la labellisation du groupe' }}
            </h3>
            <p class="text-sm text-gray-700">
              {{ company.appartenanceGroupe.maitreLabelisation
                ? 'Cette entreprise gère sa propre démarche de labellisation'
                : 'Cette entreprise suit la démarche de labellisation du groupe ' + company.appartenanceGroupe.nomGroupe
              }}
            </p>
          </div>
          <UBadge :color="company.appartenanceGroupe.maitreLabelisation ? 'primary' : 'purple'" variant="solid" size="lg">
            {{ company.appartenanceGroupe.maitreLabelisation ? 'Autonome' : 'Groupe' }}
          </UBadge>
        </div>
      </div>
    </UCard>
    <div class="grid grid-cols-3 gap-6 mb-6">
      <ContactCard 
        :contact="company.dirigeant" 
        icon="i-lucide-crown"
      />
      <ContactCard 
        :contact="company.pilote" 
        icon="i-lucide-user-cog"
      />
      <ContactCard 
        :contact="company.comptabilite" 
        icon="i-lucide-calculator"
      />
    </div>
    <UCard class="mb-6">
      <template #header>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-users" class="w-6 h-6 text-primary" />
          <h2 class="font-bold text-xl text-gray-900">{{ company.salaries.nombreTotalSalaries }} Salariés</h2>
        </div>
      </template>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="flex items-center gap-6">
          <div class="relative w-32 h-32 flex-shrink-0">
            <svg viewBox="0 0 42 42" class="w-full h-full">
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#e5e7eb" stroke-width="3"/>
              <circle 
                cx="21" 
                cy="21" 
                r="15.915" 
                fill="transparent" 
                :stroke="'#3b82f6'" 
                stroke-width="3"
                :stroke-dasharray="`${(company.salaries.personnelAdministratif / company.salaries.nombreTotalSalaries) * 100} ${100 - (company.salaries.personnelAdministratif / company.salaries.nombreTotalSalaries) * 100}`"
                stroke-dashoffset="25"
                transform="rotate(-90 21 21)"
              />
              <circle 
                cx="21" 
                cy="21" 
                r="15.915" 
                fill="transparent" 
                :stroke="'#10b981'" 
                stroke-width="3"
                :stroke-dasharray="`${(company.salaries.personnelProduction / company.salaries.nombreTotalSalaries) * 100} ${100 - (company.salaries.personnelProduction / company.salaries.nombreTotalSalaries) * 100}`"
                :stroke-dashoffset="`${25 - (company.salaries.personnelAdministratif / company.salaries.nombreTotalSalaries) * 100}`"
                transform="rotate(-90 21 21)"
              />
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="text-center">
                <div class="text-xl font-bold text-gray-900">{{ company.salaries.nombreTotalSalaries }}</div>
                <div class="text-xs text-gray-600">Total</div>
              </div>
            </div>
          </div>
          <div class="space-y-2 text-sm">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Administratif: {{ company.salaries.personnelAdministratif }}</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Production: {{ company.salaries.personnelProduction }}</span>
            </div>
            <div class="text-gray-600 text-sm mt-3 pt-2 border-t">
              <span class="font-medium">Personnel siège:</span> {{ company.salaries.nombreSalariesSiege }}
            </div>
          </div>
        </div>
        <div class="space-y-2">
          <div class="flex items-center gap-3 p-2 bg-gray-50 rounded-lg w-fit">
            <UIcon name="i-lucide-shield-check" class="w-4 h-4 text-gray-600" />
            <span class="text-sm font-medium">CSE</span>
            <UBadge 
              :variant="company.salaries.presenceCSE ? 'solid' : 'outline'" 
              :color="company.salaries.presenceCSE ? 'success' : 'neutral'"
              size="sm"
            >
              {{ company.salaries.presenceCSE ? 'Oui' : 'Non' }}
            </UBadge>
          </div>
          <div class="flex items-center gap-3 p-2 bg-gray-50 rounded-lg w-fit">
            <UIcon name="i-lucide-leaf" class="w-4 h-4 text-gray-600" />
            <span class="text-sm font-medium">Ressources RSE</span>
            <span class="font-semibold text-gray-900 text-sm">{{ company.salaries.ressourcesRSE }} ETP/an</span>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Section: Activités de l'entreprise -->
    <UCard class="mb-6">
      <template #header>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-factory" class="w-6 h-6 text-primary" />
          <h2 class="font-bold text-xl text-gray-900">Activités de l'entreprise</h2>
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

    <!-- Section: Sous-traitance -->
    <UCard class="mb-6">
      <template #header>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-handshake" class="w-6 h-6 text-primary" />
          <h2 class="font-bold text-xl text-gray-900">Sous-traitance</h2>
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

    <!-- Section: Négoce (si applicable) -->
    <UCard v-if="company.negoce && company.negoce.partCATotale > 0" class="mb-6">
      <template #header>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-trending-up" class="w-6 h-6 text-primary" />
          <h2 class="font-bold text-xl text-gray-900">Activité de négoce</h2>
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

    <!-- Section: Typologie des produits -->
    <UCard class="mb-6">
      <template #header>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-package" class="w-6 h-6 text-primary" />
          <h2 class="font-bold text-xl text-gray-900">Typologie des produits</h2>
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

    <!-- Section: Labellisations et RSE -->
    <UCard class="mb-6">
      <template #header>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-award" class="w-6 h-6 text-primary" />
          <h2 class="font-bold text-xl text-gray-900">Labellisations et démarches RSE</h2>
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
</template>
