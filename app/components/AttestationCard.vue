<template>
  <!-- Phase 5/6: Bouton de validation -->
  <div v-if="canValidate" class="text-center p-4 bg-green-50 rounded-lg border border-green-200 mb-6">
    <UIcon name="i-lucide-certificate" class="w-6 h-6 text-green-600 mx-auto mb-2" />
    <h5 class="text-sm font-medium text-gray-900 mb-1">Validation de labellisation</h5>
    <div class="space-y-3">
      <!-- Si rôle FEEF -->
      <div v-if="role === 'feef'">
        <p v-if="validationEnabled" class="text-xs font-medium text-green-800">
          Le contrat de licence de marque a été signé. Vous pouvez maintenant valider la labellisation.
        </p>
        <p v-else class="text-xs font-medium text-orange-800">
          En attente de la signature du contrat de licence de marque par l'entreprise.
        </p>
        <button
          @click="validationEnabled ? $emit('validate-labellisation') : null"
          :disabled="!validationEnabled"
          :class="[
            'px-4 py-2 text-sm font-medium rounded-md transition-colors',
            validationEnabled
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          ]"
        >
          Valider la labellisation
        </button>
      </div>

      <!-- Si autre rôle (OE, entreprise) -->
      <div v-else class="text-center">
        <p v-if="validationEnabled" class="text-xs font-medium text-blue-800">
          Le contrat de licence de marque a été signé. En attente de validation par la FEEF.
        </p>
        <p v-else class="text-xs font-medium text-orange-800">
          En attente de la signature du contrat de licence de marque puis de la validation par la FEEF.
        </p>
        <div class="mt-2 px-4 py-2 bg-blue-100 text-blue-800 text-sm font-medium rounded-md">
          En attente de validation par la FEEF
        </div>
      </div>
    </div>
  </div>

  <!-- Phase 7+: Attestation disponible -->
  <div v-else
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
const props = defineProps<{ canView?: boolean; canValidate?: boolean; validationEnabled?: boolean; pendingMessage?: string; selectedPhase: string; role?: 'oe' | 'feef' | 'company' }>()
defineEmits<{ 'view-attestation': []; 'validate-labellisation': [] }>()
</script>
