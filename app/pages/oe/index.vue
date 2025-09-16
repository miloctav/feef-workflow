<script setup lang="ts">
definePageMeta({
    layout: 'dashboard-oe'
})

// Données factices pour les statistiques
const stats = ref([
  {
    title: 'Entreprises labellisées',
    value: '130',
    icon: 'i-heroicons-building-office',
    bgColor: 'bg-green-500',
    bgLight: 'bg-green-50',
    textColor: 'text-green-600'
  },
  {
    title: 'Dossiers de candidature',
    value: '156',
    icon: 'i-heroicons-document-text',
    bgColor: 'bg-blue-500',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600'
  },
  {
    title: 'Alertes délai critiques',
    value: '7',
    icon: 'i-heroicons-exclamation-triangle',
    bgColor: 'bg-red-500',
    bgLight: 'bg-red-50',
    textColor: 'text-red-600'
  },
  {
    title: 'Alertes délai importantes',
    value: '24',
    icon: 'i-heroicons-clock',
    bgColor: 'bg-orange-500',
    bgLight: 'bg-orange-50',
    textColor: 'text-orange-600'
  },
  {
    title: 'Audits en cours',
    value: '45',
    icon: 'i-heroicons-eye',
    bgColor: 'bg-indigo-500',
    bgLight: 'bg-indigo-50',
    textColor: 'text-indigo-600'
  },
  {
    title: 'Audits à 3 mois',
    value: '128',
    icon: 'i-heroicons-calendar-days',
    bgColor: 'bg-yellow-500',
    bgLight: 'bg-yellow-50',
    textColor: 'text-yellow-600'
  },
  {
    title: 'Dernier import/export',
    value: '2024-09-10',
    icon: 'i-heroicons-arrow-down-tray',
    bgColor: 'bg-gray-500',
    bgLight: 'bg-gray-50',
    textColor: 'text-gray-600'
  }
])

const searchQuery = ref('')
</script>

<template>
  <UDashboardPanel id="dashboard">
    <template #header>
      <NavBar />
    </template>

    <template #body>
      <div class="p-6 space-y-6">
        <!-- Barre de recherche -->
        <div class="flex justify-center">
          <div class="w-full max-w-2xl">
            <UInput
              v-model="searchQuery"
              placeholder="Rechercher des entreprises ou dossiers..."
              icon="i-heroicons-magnifying-glass"
              size="lg"
              class="w-full"
              :trailing="false"
            />
          </div>
        </div>

        <!-- Titre de la section -->
        <div class="text-center">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            Tableau de bord OE
          </h1>
          <p class="text-gray-600 dark:text-gray-400 mt-2">
            Vue d'ensemble des activités de labellisation
          </p>
        </div>

        <!-- Grille de cartes statistiques -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            v-for="(stat, index) in stats"
            :key="index"
            :class="`text-center p-4 ${stat.bgLight} rounded-lg border ${stat.bgColor.replace('bg-', 'border-').replace('-500', '-200')} hover:shadow-lg transition-all duration-200`"
          >
            <UIcon 
              :name="stat.icon" 
              :class="`w-6 h-6 ${stat.textColor} mx-auto mb-2`"
            />
            <h5 class="text-sm font-medium text-gray-900 mb-1">{{ stat.title }}</h5>
            <div class="space-y-1">
              <p :class="`text-lg font-bold ${stat.textColor}`">
                {{ stat.value }}
              </p>
            </div>
          </div>
        </div>
        
      </div>
    </template>
  </UDashboardPanel>
</template>