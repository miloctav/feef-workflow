<template>
  <div class="text-center p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border-2 border-yellow-300 shadow-md cursor-pointer transition-all hover:bg-yellow-200 hover:shadow-lg group mb-6" @click="$emit('view-license')" :class="{ 'opacity-50 cursor-not-allowed': !isSigned }">
    <div class="flex items-center gap-3 mb-2 justify-center">
      <UIcon name="i-lucide-file-signature" class="w-6 h-6 text-yellow-600" />
      <h4 class="font-semibold text-yellow-900">Contrat de licence de marque</h4>
    </div>
    <p class="text-gray-700 text-sm mb-2">Ce contrat doit être signé par l'entreprise pour obtenir l'attestation de labellisation.</p>
    <div class="flex items-center gap-2 justify-center mb-2">
      <span class="text-xs text-gray-500">Statut :</span>
      <span :class="statusClass">{{ statusText }}</span>
    </div>
    <div class="mt-3">
      <span class="text-yellow-700 underline text-sm group-hover:text-yellow-900">Cliquer pour consulter le contrat</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  isSigned: boolean
  signedDate?: string
}

const props = defineProps<Props>()

const statusText = computed(() => {
  return props.isSigned ? 'Signé' : 'En attente de signature par l\'entreprise'
})
const statusClass = computed(() => {
  return props.isSigned ? 'text-green-600' : 'text-yellow-600'
})
</script>
