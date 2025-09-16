<template>
  <div
    class="text-center p-4 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer transition-all hover:bg-blue-100 hover:shadow-md group mb-6"
    @click="canView ? $emit('view-attestation') : null" :class="{ 'opacity-50 cursor-not-allowed': !canView }">
    <UIcon name="i-lucide-certificate"
      class="w-6 h-6 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
    <h5 class="text-sm font-medium text-gray-900 mb-1">Attestation de labellisation</h5>
    <div class="space-y-1">
      <p v-if="props.selectedPhase === 'phase5'" class="text-xs font-medium text-blue-800">
        L'attestation officielle de labellisation FEEF est disponible après la signature du contrat de licence de
        marque.
      </p>
      <div v-if="pendingMessage" class="text-xs text-yellow-700 mt-1">{{ pendingMessage }}</div>
      <div class="flex items-center justify-center gap-1 text-xs text-gray-600 mt-2">
        <span>Statut :</span>
        <span :class="canView ? 'text-green-600' : 'text-yellow-600'">
          {{ canView ? 'Disponible' : 'Indisponible' }}
        </span>
      </div>
      <div v-if="canView" class="flex flex-col items-center justify-center gap-1 text-xs text-gray-600">
        <div class="flex items-center gap-1">
          <span>Cliquer pour consulter</span>
          <UIcon name="i-lucide-external-link" class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div class="mt-1 text-green-700">Valide jusqu'au 16/09/2028</div>
      </div>
      <div v-else class="text-xs text-gray-400">Non disponible</div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ canView?: boolean; pendingMessage?: string; selectedPhase: string }>()
defineEmits<{ 'view-attestation': [] }>()
</script>
