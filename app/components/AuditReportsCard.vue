<template>
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
           :class="{ 'opacity-50 cursor-not-allowed': !rapport?.isAvailable }">
        <UIcon name="i-lucide-file-text" class="w-6 h-6 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
        <h5 class="text-sm font-medium text-gray-900 mb-1">Rapport d'audit</h5>
        <div class="space-y-1">
          <p class="text-xs font-medium text-purple-800">
              {{ rapport.dateTransmission ? 
                `Transmis le ${rapport.dateTransmission}, par Jean Martin` : 
                'Non disponible' }}
          </p>
          <div v-if="rapport?.isAvailable" class="flex items-center justify-center gap-1 text-xs text-gray-600">
            <span>Cliquer pour consulter</span>
            <UIcon name="i-lucide-external-link" class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div v-else>
            <p class="text-xs text-gray-500 mb-2">Rapport non disponible</p>
            <!-- Bouton pour mettre en ligne en phase 0 -->
            <div v-if="selectedPhase === 'phase0'">
              <UButton 
                v-if="props.role !== 'company'"
                color="primary" 
                size="xs"
                icon="i-lucide-upload"
                :disabled="props.role !== 'oe'"
                class="w-full"
              >
                Mettre en ligne
              </UButton>
              <p v-if="props.role !== 'company'" class="text-xs text-gray-500 mt-1">Action FEEF/OE</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Score global de performance -->
      <div class="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
        <UIcon name="i-lucide-target" class="w-6 h-6 text-green-600 mx-auto mb-2" />
        <h5 class="text-sm font-medium text-gray-900 mb-1">Score global</h5>
        <div class="space-y-1">
          <div v-if="performanceGlobale" class="text-2xl font-bold text-green-600">
            {{ performanceGlobale }}%
          </div>
          <UBadge 
            v-if="performanceGlobale"
            :color="performanceGlobale >= 80 ? 'success' : 
                   performanceGlobale >= 60 ? 'warning' : 'error'"
            variant="soft"
            size="xs"
          >
            {{ performanceGlobale >= 80 ? 'Excellent' : 
               performanceGlobale >= 60 ? 'Satisfaisant' : 'À améliorer' }}
          </UBadge>
          <p v-else class="text-xs text-gray-500">Score non attribué</p>
          
          <!-- Boutons d'action pour phase 0 -->
          <div v-if="selectedPhase === 'phase0'" class="mt-2">
            <UButton 
              v-if="props.role !== 'company'"
              color="primary" 
              size="xs"
              icon="i-lucide-edit"
              :disabled="props.role !== 'oe'"
              class="w-full"
            >
              Saisir le score
            </UButton>
            <p v-if="props.role !== 'company'" class="text-xs text-gray-500 mt-1">Action FEEF/OE</p>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
interface Props {
  rapport: {
    isAvailable?: boolean | undefined
    dateTransmission?: string | null | undefined
  } | undefined
  performanceGlobale: number | undefined
  selectedPhase: string
  role?: 'oe' | 'feef' | 'company'
}

const props = withDefaults(defineProps<Props>(), {
  role: 'feef'
})

const emit = defineEmits<{
  viewRapport: []
}>()

function viewRapport() {
  if (props.rapport?.isAvailable) {
    emit('viewRapport')
  }
}
</script>
