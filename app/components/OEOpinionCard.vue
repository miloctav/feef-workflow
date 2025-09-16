<template>
  <UCard class="mb-6">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-shield-check" class="w-5 h-5 text-purple-600" />
          <h4 class="font-semibold">Avis de l'Organisme Évaluateur</h4>
        </div>
        <UBadge 
          v-if="avis?.avis"
          :color="avis.avis === 'favorable' ? 'success' : avis.avis === 'défavorable' ? 'error' : 'warning'"
          variant="solid"
          size="sm"
        >
          {{ avis.avis === 'favorable' ? 'Favorable' : avis.avis === 'défavorable' ? 'Défavorable' : 'En cours' }}
        </UBadge>
      </div>
    </template>

    <!-- Contenu sur une seule ligne avec deux colonnes -->
    <div class="grid grid-cols-2 gap-6">
      <!-- Colonne 1: Date, points bloquants et argumentaire -->
      <div class="space-y-3">
        <!-- Informations sur la date et points bloquants -->
        <div v-if="avis?.dateTransmission" class="p-3 bg-purple-50 rounded-lg border border-purple-200">
          <div class="space-y-2">
            <!-- Date de transmission -->
            <div class="flex items-center gap-2 text-sm">
              <UIcon name="i-lucide-calendar" class="w-4 h-4 text-purple-600" />
              <span class="text-purple-900 font-medium">{{ avis.dateTransmission }}</span>
            </div>
            
            <!-- Points bloquants -->
            <div v-if="avis?.absencePointsBloquants !== undefined" class="flex items-center gap-2">
              <UIcon 
                :name="avis.absencePointsBloquants ? 'i-lucide-check-circle' : 'i-lucide-alert-triangle'"
                class="w-4 h-4"
                :class="avis.absencePointsBloquants ? 'text-green-600' : 'text-red-600'"
              />
              <span class="text-sm font-medium"
                :class="avis.absencePointsBloquants ? 'text-green-800' : 'text-red-800'"
              >
                {{ avis.absencePointsBloquants ? 'Aucun point bloquant' : 'Points bloquants détectés' }}
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
          <div v-if="selectedPhase === 'phase3' || (selectedPhase === 'phase4' && !avis?.dateTransmission)">
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
          <div v-if="selectedPhase === 'phase3' || (selectedPhase === 'phase4' && !avis?.dateTransmission)">
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
        <div v-if="avis?.argumentaire" class="p-3 bg-purple-50 rounded-lg border border-purple-200">
          <h5 class="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
            <UIcon name="i-lucide-message-square-text" class="w-4 h-4" />
            Argumentaire
          </h5>
          <p class="text-sm text-purple-800 leading-relaxed">{{ avis.argumentaire }}</p>
        </div>
      </div>

      <!-- Colonne 2: Avis de labellisation -->
      <div class="space-y-3">
        <!-- Avis de labellisation (si favorable) -->
        <div v-if="avis?.avis === 'favorable' && avis?.avisLabellisation?.isAvailable" class="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div class="flex items-center gap-3 mb-2">
            <UIcon name="i-lucide-certificate" class="w-4 h-4 text-blue-600" />
            <span class="text-sm font-medium text-blue-900">Avis de labellisation</span>
          </div>
          <p class="text-xs text-blue-800 mb-2">
            Document officiel de labellisation émis par l'Organisme Évaluateur suite à l'avis favorable.
          </p>
          
          <!-- Date de dépôt -->
          <div v-if="avis.avisLabellisation.dateTransmission" class="flex items-center gap-2 mb-3 text-xs text-blue-700">
            <UIcon name="i-lucide-calendar-plus" class="w-3 h-3" />
            <span>Émis le {{ avis.avisLabellisation.dateTransmission }}</span>
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
        <div v-else-if="selectedPhase === 'phase4' && avis?.avis === 'favorable' && !avis?.avisLabellisation?.isAvailable" class="space-y-2">
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
</template>

<script setup lang="ts">
interface Props {
  avis: {
    avis?: string | null | undefined
    dateTransmission?: string | null | undefined
    argumentaire?: string | null | undefined
    absencePointsBloquants?: boolean | undefined
    avisLabellisation?: {
      isAvailable?: boolean | undefined
      dateTransmission?: string | null | undefined
    }
  }
  selectedPhase: string
}

defineProps<Props>()

const emit = defineEmits<{
  viewAvisLabellisation: []
}>()

function viewAvisLabellisation() {
  emit('viewAvisLabellisation')
}
</script>
