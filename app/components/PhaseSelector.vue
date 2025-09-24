<template>
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
          v-model="localSelectedPhase"
          class="text-blue-600 focus:ring-blue-500" 
        />
        <span class="text-sm text-gray-700">{{ option.label }}</span>
      </label>
    </div>
    
    <div class="mt-3 p-3 bg-blue-50 rounded-lg">
      <p class="text-sm text-blue-800">{{ phaseDescriptions[localSelectedPhase as keyof typeof phaseDescriptions] }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  selectedPhase: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ 'update:selectedPhase': [value: string] }>()

const localSelectedPhase = ref(props.selectedPhase)

watch(() => props.selectedPhase, (newVal) => {
  localSelectedPhase.value = newVal
})

watch(localSelectedPhase, (newVal) => {
  emit('update:selectedPhase', newVal)
})

// Options pour les phases
const phaseOptions = [
  { value: 'phase0', label: 'Phase 0 - Pas de rapport déposé' },
  { value: 'phase2', label: 'Phase 1 - En attente plan d\'action' },
  { value: 'phase2b', label: 'Phase 2 - Validation plan d\'action' },
  { value: 'phase3', label: 'Phase 3 - Plan d\'action validé' },
  { value: 'phase4', label: 'Phase 4 - Avis OE et labellisation' },
  { value: 'phase5', label: 'Phase 5 - Contrat de licence de marque à signer' },
  { value: 'phase6', label: 'Phase 6 - Validation labellisation FEEF' },
  { value: 'phase7', label: 'Phase 7 - Attestation de labellisation disponible' }
]

// Descriptions des phases
const phaseDescriptions = {
  'phase0': 'Aucun rapport d\'audit n\'a encore été déposé par l\'Organisme Évaluateur (OE).',
  'phase2': 'Score insuffisant détecté, en attente du plan d\'action corrective de l\'entreprise.',
  'phase2b': 'Plan d\'action déposé par l\'entreprise, en attente de validation par la FEEF ou l\'OE.',
  'phase3': 'Plan d\'action mis en ligne et validé par l\'OE.',
  'phase4': 'Avis de l\'OE et avis de labellisation saisis et mis en ligne.',
  'phase5': 'La labellisation est validée par la FEEF. Le contrat de licence de marque doit être signé par l\'entreprise.',
  'phase6': 'Le contrat de licence est signé. La FEEF peut maintenant valider définitivement la labellisation.',
  'phase7': 'Labellisation validée par la FEEF. L\'attestation officielle de labellisation FEEF est disponible et peut être consultée.'
}
</script>
