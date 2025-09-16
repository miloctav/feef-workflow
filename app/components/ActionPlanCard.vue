<template>
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
          Plan détaillant les mesures correctives suite à la performance insuffisante ({{ performanceGlobale }}%).
        </p>
        
        <!-- Informations selon l'état -->
        <div class="space-y-2">
          <!-- Plan d'action disponible -->
          <div v-if="planAction?.isAvailable" class="space-y-2">
            <!-- Date de transmission -->
            <div class="flex items-center gap-2 text-xs text-orange-700">
              <UIcon name="i-lucide-calendar-plus" class="w-3 h-3" />
              <span>Déposé le {{ planAction.dateTransmission }}</span>
            </div>
            
            <!-- Validation OE -->
            <div v-if="planAction?.valideParOE" class="flex items-center gap-2 text-xs text-green-700">
              <UIcon name="i-lucide-check-circle" class="w-3 h-3" />
              <span>Validé par l'OE le {{ planAction.dateValidation }}</span>
            </div>
            <div v-else-if="selectedPhase === 'phase2b'" class="space-y-2">
              <div class="flex items-center gap-2 text-xs text-amber-700">
                <UIcon name="i-lucide-clock" class="w-3 h-3" />
                <span>En attente de validation par l'OE</span>
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
              <p class="text-xs text-gray-500 text-center">Actions OE</p>
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
              <p class="text-xs text-gray-500 text-center">Action OE</p>
            </div>
          </div>
          
          <!-- Plan d'action non transmis -->
          <div v-else class="space-y-2">
            <div class="flex items-center gap-2 text-xs text-red-700">
              <UIcon name="i-lucide-calendar-x" class="w-3 h-3" />
              <span v-if="selectedPhase === 'phase2'">En attente que l'entreprise mette en ligne le plan d'action</span>
              <span v-else>À remettre avant le {{ planAction.dateLimiteDepot || 'À définir' }}</span>
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
        <div v-if="planAction?.isAvailable" class="mt-3">
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
</template>

<script setup lang="ts">
interface Props {
  planAction: {
    isAvailable?: boolean | undefined
    dateTransmission?: string | null | undefined
    valideParOE?: boolean | undefined
    dateValidation?: string | null | undefined
    dateLimiteDepot?: string | null | undefined
  } | undefined
  performanceGlobale: number | undefined
  selectedPhase: string
  needsPlanAction: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  viewPlanAction: []
}>()

function viewPlanAction() {
  emit('viewPlanAction')
}
</script>
