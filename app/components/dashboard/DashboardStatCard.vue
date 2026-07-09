<script setup lang="ts">
withDefaults(defineProps<{
  /** Libellé affiché au-dessus de la valeur */
  label: string
  /** Valeur déjà formatée */
  value: string
  /** Explication du mode de calcul, affichée au survol de l'icône */
  hint: string
  /** Précision affichée sous la valeur (ex. « depuis 2022 ») */
  subtitle?: string
  /** Met la valeur en avant (chiffre large et coloré) */
  highlight?: boolean
  loading?: boolean
}>(), {
  subtitle: undefined,
  highlight: false,
  loading: false,
})
</script>

<template>
  <div
    class="bg-white rounded-xl shadow p-4 flex-1 flex flex-col items-center justify-center gap-1 min-w-0"
  >
    <div class="flex items-center gap-1.5 min-w-0">
      <span class="text-gray-500 text-sm text-center">{{ label }}</span>
      <InfoTooltip :text="hint" />
    </div>

    <USkeleton
      v-if="loading"
      :class="highlight ? 'h-8 w-16' : 'h-6 w-24'"
    />
    <span
      v-else
      :class="highlight ? 'text-2xl font-bold text-primary-600' : 'text-base font-semibold text-gray-800'"
    >{{ value }}</span>

    <span
      v-if="subtitle && !loading"
      class="text-xs text-gray-400"
    >{{ subtitle }}</span>
  </div>
</template>
