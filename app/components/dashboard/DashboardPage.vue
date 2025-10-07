<script setup lang="ts">
import type { SelectItem } from '@nuxt/ui';

interface Props {
  role?: 'oe' | 'feef' | 'auditeur'
}

const props = withDefaults(defineProps<Props>(), {
  role: 'feef'
})

const dossiersFinalisesParAn = [
  { annee: 2022, nombre: 18 },
  { annee: 2023, nombre: 27 },
  { annee: 2024, nombre: 31 },
  { annee: 2025, nombre: 8 }
]

const selectedAnnee = ref(dossiersFinalisesParAn.length > 0 ? dossiersFinalisesParAn[dossiersFinalisesParAn.length - 1].annee : 0)

// Données fictives pour la barre de progression
const dossierStats = {
  attente: 14,
  encours: 22,
  finalise: 8
}
const totalDossiers = dossierStats.attente + dossierStats.encours + dossierStats.finalise
const attentePct = Math.round((dossierStats.attente / totalDossiers) * 100)
const encoursPct = Math.round((dossierStats.encours / totalDossiers) * 100)
const finalisePct = 100 - attentePct - encoursPct

const oeOptions = ref<SelectItem[]>([
  { label: 'Tous', value: 'all' },
  { label: 'SGS', value: 'sgs' },
  { label: 'Ecocert', value: 'ecocert' }
])
const selectedOE = ref(oeOptions.value[0].value)
// Données factices par catégorie et card
const dashboardCategories = [
  {
    label: 'Demande de dossiers',
    cards: [
      { shortText: 'Candidature initialisée', value: 7, alertesRouges: 0, alertesOranges: 0, color: 'border-blue-500', bgColor: 'bg-blue-50' },
      { shortText: 'En attente validation FEEF', value: 12, alertesRouges: 1, alertesOranges: 0, color: 'border-green-500', bgColor: 'bg-green-50' },
      { shortText: 'En attente de signature du contrat', value: 4, alertesRouges: 0, alertesOranges: 1, color: 'border-orange-500', bgColor: 'bg-orange-50' }
    ]
  },
  {
    label: 'Engagement',
    cards: [
      { shortText: 'En attente de devis', value: 5, alertesRouges: 0, alertesOranges: 2, color: 'border-orange-500', bgColor: 'bg-orange-50' },
      { shortText: 'En attente de signature', value: 3, alertesRouges: 0, alertesOranges: 1, color: 'border-orange-500', bgColor: 'bg-orange-50' },
      { shortText: 'En planification audit', value: 7, alertesRouges: 0, alertesOranges: 0, color: 'border-green-500', bgColor: 'bg-green-50' }
    ]
  },
  {
    label: 'Audit',
    cards: [
      { shortText: 'Audit planifié', value: 8, alertesRouges: 0, alertesOranges: 0, color: 'border-blue-500', bgColor: 'bg-blue-50' },
      { shortText: 'Rapport attendu audit', value: 4, alertesRouges: 1, alertesOranges: 1, color: 'border-blue-500', bgColor: 'bg-blue-50' }
    ]
  },
  {
    label: 'Decision',
    cards: [
      { shortText: 'Rapport envoyé', value: 2, alertesRouges: 0, alertesOranges: 1, color: 'border-purple-500', bgColor: 'bg-purple-50' },
      { shortText: 'Plan d’action en attente', value: 6, alertesRouges: 2, alertesOranges: 0, color: 'border-orange-500', bgColor: 'bg-orange-50' },
      { shortText: 'En attente attestation', value: 1, alertesRouges: 0, alertesOranges: 0, color: 'border-green-500', bgColor: 'bg-green-50' }
    ]
  }
];

const categoryTotals = dashboardCategories.map(cat => cat.cards.reduce((sum, card) => sum + card.value, 0));

</script>

<template>
    <div v-if="role === 'auditeur'" class="p-4 space-y-4">
        <!-- Vue spécifique auditeur -->
        <AuditsTable />
    </div>
    <div v-else class="p-4 space-y-4">
        <!-- Titre dashboard + select OE -->
        <div class="flex flex-row items-center justify-center w-full mb-1">
          <span class="font-bold text-3xl">Tableau de bord</span>
        </div>
        <div v-if="role === 'feef'" class="flex flex-row items-center gap-2 min-w-[220px] mb-1">
          <label class="font-semibold text-gray-700 whitespace-nowrap">Organisme évaluateur</label>
          <USelect v-model="selectedOE" :items="oeOptions" value-key="value" class="w-32" />
        </div>
        <USeparator class="mb-3" />
        <!-- Bloc infos entreprises, import et export -->
        <div class="flex flex-row gap-4 px-4 mb-4">
          <div class="bg-white rounded-xl shadow p-4 flex-1 flex flex-col items-center justify-center">
            <span class="text-gray-500 text-sm mb-1">Nombre d'entreprises</span>
            <span class="text-2xl font-bold text-primary-600">128</span>
          </div>
          <template v-if="props.role === 'oe' || (selectedOE && selectedOE !== 'all')">
            <div class="bg-white rounded-xl shadow p-4 flex-1 flex flex-col items-center justify-center">
              <span class="text-gray-500 text-sm mb-1">Dernier import</span>
              <span class="text-base font-semibold text-gray-800">21/09/2025 à 14:32</span>
            </div>
            <div class="bg-white rounded-xl shadow p-4 flex-1 flex flex-col items-center justify-center">
              <span class="text-gray-500 text-sm mb-1">Dernier export</span>
              <span class="text-base font-semibold text-gray-800">20/09/2025 à 18:05</span>
            </div>
          </template>
        </div>
        <!-- Dossiers en cours (sans titre) -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 px-4 justify-start">
          <div v-for="(cat, i) in dashboardCategories" :key="cat.label" class="flex flex-col">
            <h2 class="text-lg font-bold text-gray-800 mb-2 text-center">
              <span class="text-primary-600">{{ categoryTotals[i] }}</span>
              &nbsp;{{ cat.label }}
            </h2>
            <div class="flex flex-col gap-3">
              <DashboardCard
                v-for="(card, j) in cat.cards"
                :key="j"
                v-bind="card"
                :lastValue="j % 3 === 0 ? undefined : card.value - (j % 2 === 0 ? 2 : -1)"
                :lastDate="j % 3 === 0 ? undefined : '20/09/2025 à 10:15'"
                :trend="j % 3 === 0 ? undefined : (card.value > (card.value - (j % 2 === 0 ? 2 : -1)) ? 'up' : 'down')"
              />
            </div>
          </div>
        </div>
        <!-- Barre de progression état des dossiers -->
        <div class="w-full px-4 mt-6">
          <h2 class="text-lg font-bold mb-2 text-center">État des dossiers</h2>
          <div class="relative w-full h-6 bg-gray-100 rounded-full shadow-lg overflow-hidden flex text-xs font-bold">
            <div class="h-full flex items-center justify-center text-orange-900 transition-all duration-500"
              :style="`width: ${attentePct}%; background: #fed7aa`">
              <span v-if="attentePct > 10" class="w-full text-center">
                <span class="font-medium text-gray-600 mr-1">En attente</span>
                {{ dossierStats.attente }}<span class="opacity-70">&nbsp;({{ attentePct }}%)</span>
              </span>
            </div>
            <div class="h-full flex items-center justify-center text-blue-900 transition-all duration-500"
              :style="`width: ${encoursPct}%; background: #bfdbfe`">
              <span v-if="encoursPct > 10" class="w-full text-center">
                <span class="font-medium text-gray-600 mr-1">En cours</span>
                {{ dossierStats.encours }}<span class="opacity-70">&nbsp;({{ encoursPct }}%)</span>
              </span>
            </div>
            <div class="h-full flex items-center justify-center text-green-900 transition-all duration-500"
              :style="`width: ${finalisePct}%; background: #bbf7d0`">
              <span v-if="finalisePct > 10" class="w-full text-center">
                <span class="font-medium text-gray-600 mr-1">Finalisé</span>
                {{ dossierStats.finalise }}<span class="opacity-70">&nbsp;({{ finalisePct }}%)</span>
              </span>
            </div>
          </div>
        </div>
        <USeparator class="my-4" />
        <!-- Bloc Statistiques -->
        <div>
          <div class="flex flex-row items-center gap-4 w-full">
            <div class="flex flex-col items-center w-1/2">
              <h2 class="text-lg font-bold mb-1 text-center">Audits prévus par mois</h2>
              <LineChartAudits />
            </div>
            <div class="flex flex-col items-center w-1/2">
              <h2 class="text-lg font-bold mb-1 text-center">Labellisés par année</h2>
              <BarChartLabellises />
            </div>
          </div>
        </div>
      </div>
</template>