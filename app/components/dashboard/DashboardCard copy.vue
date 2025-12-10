<script setup lang="ts">
// Props: value, shortText, alertesRouges, alertesOranges, auditInitial, auditRenouvellement, auditSuivi, color, bgColor, lastValue, lastDate, trend
defineProps<{
  value: string | number
  shortText: string
  alertesRouges?: number
  alertesOranges?: number
  auditInitial?: number
  auditRenouvellement?: number
  auditSuivi?: number
  color?: string
  bgColor?: string
  lastValue?: number
  lastDate?: string
  trend?: 'up' | 'down'
}>()
</script>

<template>
  <UPageCard
    class="w-full py-0 h-full"
    spotlight
  >
    <template #default>
      <div class="flex flex-row gap-2 items-start w-full">
        <!-- Gros chiffre fixe -->
        <span class="text-4xl font-bold shrink-0">{{ value }}</span>
        <!-- Flèche tendance + tooltip -->
        <UTooltip
          v-if="trend && lastValue !== undefined && lastDate"
          :text="`${lastValue} le ${lastDate}`"
          placement="top"
        >
          <span>
            <UIcon
              :name="
                trend === 'up'
                  ? 'i-heroicons-arrow-up-right-20-solid'
                  : 'i-heroicons-arrow-down-right-20-solid'
              "
              :class="trend === 'up' ? 'text-red-500' : 'text-green-500'"
              class="w-5 h-5 ml-1"
            />
          </span>
        </UTooltip>
        <!-- Partie droite qui s'étend -->
        <div class="flex flex-col flex-1 min-w-0 w-full">
          <span class="text-sm text-muted truncate">
            {{ shortText }}
          </span>
          <div class="flex flex-row gap-1 mt-1 flex-wrap min-h-[20px]">
            <UBadge
              v-if="auditInitial && auditInitial > 0"
              class="bg-blue-100 text-blue-700 border-none text-xs px-1.5 py-0.5"
              >{{ auditInitial }} Initial</UBadge
            >
            <UBadge
              v-if="auditRenouvellement && auditRenouvellement > 0"
              class="bg-purple-100 text-purple-700 border-none text-xs px-1.5 py-0.5"
              >{{ auditRenouvellement }} Renouvellement</UBadge
            >
            <UBadge
              v-if="auditSuivi && auditSuivi > 0"
              class="bg-green-100 text-green-700 border-none text-xs px-1.5 py-0.5"
              >{{ auditSuivi }} Suivi</UBadge
            >
          </div>
          <div class="flex flex-row gap-1 mt-0.5 flex-wrap min-h-[20px]">
            <UBadge
              v-if="alertesRouges && alertesRouges > 0"
              class="bg-red-100 text-red-700 border-none text-xs px-1.5 py-0.5"
              >{{ alertesRouges }} alertes</UBadge
            >
            <UBadge
              v-if="alertesOranges && alertesOranges > 0"
              class="bg-orange-100 text-orange-700 border-none text-xs px-1.5 py-0.5"
              >{{ alertesOranges }} alertes</UBadge
            >
          </div>
        </div>
      </div>
    </template>
  </UPageCard>
</template>
