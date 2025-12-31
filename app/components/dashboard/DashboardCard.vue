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
  auditTypes?: {
    initial: number
    renewal: number
    monitoring: number
  }
}>()
</script>

<template>
  <UPageCard
    class="w-full py-0"
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
        <!-- Partie droite qui s’étend -->
        <div class="flex flex-col flex-1 min-w-0 w-full">
          <span class="text-sm text-muted truncate">
            {{ shortText }}
          </span>
          <!-- Audit type badges on first line -->
          <div
            v-if="
              auditTypes &&
              (auditTypes.initial > 0 || auditTypes.renewal > 0 || auditTypes.monitoring > 0)
            "
            class="flex flex-row gap-1 mt-0.5 flex-wrap"
          >
            <UBadge
              v-if="auditTypes.initial > 0"
              class="bg-blue-100 text-blue-700 border-none text-xs px-1.5 py-0.5"
              >{{ auditTypes.initial }} Initial</UBadge
            >
            <UBadge
              v-if="auditTypes.renewal > 0"
              class="bg-green-100 text-green-700 border-none text-xs px-1.5 py-0.5"
              >{{ auditTypes.renewal }} Renouvellement</UBadge
            >
            <UBadge
              v-if="auditTypes.monitoring > 0"
              class="bg-purple-100 text-purple-700 border-none text-xs px-1.5 py-0.5"
              >{{ auditTypes.monitoring }} Suivi</UBadge
            >
          </div>
          <!-- Alert badges on second line -->
          <div
            v-if="(alertesRouges && alertesRouges > 0) || (alertesOranges && alertesOranges > 0)"
            class="flex flex-row gap-1 mt-0.5 flex-wrap"
          >
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
