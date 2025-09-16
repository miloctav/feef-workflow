<script setup lang="ts">
import ContactCard from '~/components/ContactCard.vue';
import type { PropType } from 'vue';

defineProps({
  company: {
    type: Object as PropType<any>,
    required: true
  },
  role: {
    type: String as PropType<"oe" | "feef">,
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
            v-if="role === 'feef'"
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-users"
            class="text-xs"
          >
            Gérer les comptes
          </UButton>
          <UButton
            v-if="role === 'feef'"
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-edit"
            class="text-xs"
          >
            Modifier les infos
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
    <UCard v-if="company.appartenanceGroupe.appartientGroupe" class="mb-6">
      <template #header>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-building" class="w-6 h-6 text-primary" />
          <h2 class="font-bold text-xl text-gray-900">Groupe {{ company.appartenanceGroupe.nomGroupe }}</h2>
        </div>
      </template>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <div v-if="company.appartenanceGroupe.wantEngageALLGroupe">
          <h3 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <UIcon name="i-lucide-target" class="w-4 h-4 text-blue-600" />
            Engagement groupe
          </h3>
          <p class="text-gray-700 text-sm">
            {{ company.appartenanceGroupe.wantEngageALLGroupe }}
          </p>
        </div>
      </div>
    </UCard>
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
  </div>
</template>
