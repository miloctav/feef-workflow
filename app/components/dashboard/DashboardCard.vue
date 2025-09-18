<script setup lang="ts">
// Props: value, shortText, alertesRouges, alertesOranges, color, bgColor
defineProps<{
  value: string | number
  shortText: string
  alertesRouges?: number
  alertesOranges?: number
  color?: string
  bgColor?: string
}>()
</script>

<template>
  <UPageCard class="w-full py-0" spotlight>
    <template #default>
      <div class="flex flex-row gap-3 items-start w-full">
        <!-- Gros chiffre fixe -->
        <span class="text-5xl font-bold shrink-0">{{ value }}</span>

        <!-- Partie droite qui s’étend -->
        <div class="flex flex-col flex-1 min-w-0 w-full">
          <span class="text-sm text-muted truncate">
            {{ shortText }}
          </span>
          <div class="flex flex-row gap-2 mt-1 flex-wrap">
            <UBadge v-if="alertesRouges && alertesRouges > 0" class="bg-red-100 text-red-700 border-none">{{
              alertesRouges }} alertes</UBadge>
            <UBadge v-if="alertesOranges && alertesOranges > 0" class="bg-orange-100 text-orange-700 border-none">{{
              alertesOranges }} alertes</UBadge>
          </div>
        </div>
      </div>
    </template>
  </UPageCard>
</template>
