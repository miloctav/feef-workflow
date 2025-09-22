<script setup lang="ts">
// Props: value, shortText, alertesRouges, alertesOranges, color, bgColor, lastValue, lastDate, trend
defineProps<{
  value: string | number
  shortText: string
  alertesRouges?: number
  alertesOranges?: number
  color?: string
  bgColor?: string
  lastValue?: number
  lastDate?: string
  trend?: 'up' | 'down'
}>()
</script>

<template>
  <UPageCard class="w-full py-0" spotlight>
    <template #default>
      <div class="flex flex-row gap-3 items-start w-full">
        <!-- Gros chiffre fixe -->
        <span class="text-5xl font-bold shrink-0">{{ value }}</span>
        <!-- Flèche tendance + tooltip -->
        <UTooltip
          v-if="trend && lastValue !== undefined && lastDate"
          :text="`${lastValue} le ${lastDate}`"
          placement="top"
        >
          <span>
            <UIcon
              :name="trend === 'up' ? 'i-heroicons-arrow-up-right-20-solid' : 'i-heroicons-arrow-down-right-20-solid'"
              :class="trend === 'up' ? 'text-green-500' : 'text-red-500'"
              class="w-6 h-6 ml-1"
            />
          </span>
        </UTooltip>
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
