<script setup lang="ts">
defineProps<{
  /** Texte explicatif, affiché sur plusieurs lignes */
  text: string
}>()

// Le thème par défaut du tooltip force une hauteur de 6 et tronque le texte.
// On libère la hauteur et on passe par le slot #content pour éviter `truncate`.
const ui = {
  content: 'h-auto max-w-xs items-start p-0',
}
</script>

<template>
  <UTooltip
    :ui="ui"
    :delay-duration="150"
    :content="{ side: 'top' }"
  >
    <UIcon
      name="i-lucide-info"
      class="size-3.5 text-gray-400 hover:text-gray-600 transition-colors cursor-help shrink-0"
    />
    <template #content>
      <p class="px-2.5 py-2 text-xs leading-relaxed text-left font-normal normal-case text-highlighted">
        {{ text }}
      </p>
    </template>
  </UTooltip>
</template>
