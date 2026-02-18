<script setup lang="ts">
import type { PerOeCardItem } from '~/composables/useDashboardCompare'

const props = defineProps<{
  shortText: string
  total: number
  perOe: PerOeCardItem[]
}>()

// Only show OEs with at least one audit
const visibleOes = computed(() => props.perOe.filter(o => o.value > 0))

// Width of each OE segment in the stacked bar
const barSegments = computed(() => {
  if (props.total === 0) return []
  return visibleOes.value.map(o => ({
    ...o,
    pct: Math.round((o.value / props.total) * 100),
  }))
})
</script>

<template>
  <UPageCard class="w-full py-2" spotlight>
    <template #default>
      <!-- Header: big total + label -->
      <div class="flex flex-row gap-2 items-start w-full mb-2">
        <span class="text-4xl font-bold shrink-0">{{ total }}</span>
        <span class="text-sm text-muted self-end pb-1">{{ shortText }}</span>
      </div>

      <!-- Stacked mini bar -->
      <div
        v-if="total > 0"
        class="w-full h-2 rounded-full overflow-hidden flex mb-2"
      >
        <UTooltip
          v-for="seg in barSegments"
          :key="String(seg.oeId)"
          :text="`${seg.oeName} : ${seg.value}`"
          class="h-full transition-all duration-300"
          :style="`width: ${seg.pct}%; background: ${seg.dot}`"
        />
      </div>
      <div
        v-else
        class="w-full h-2 rounded-full bg-gray-100 mb-2"
      />

      <!-- Legend: one line per OE -->
      <div class="flex flex-col gap-0.5">
        <div
          v-for="oe in visibleOes"
          :key="String(oe.oeId)"
          class="flex items-center gap-1.5 text-xs"
        >
          <span
            class="inline-block w-2 h-2 rounded-full shrink-0"
            :style="`background: ${oe.dot}`"
          />
          <span class="truncate max-w-[120px] text-gray-700">{{ oe.oeName }}</span>
          <span class="font-bold text-gray-900 ml-auto shrink-0">{{ oe.value }}</span>
          <UBadge
            v-if="oe.alertesRouges > 0"
            class="bg-red-100 text-red-700 border-none px-1 py-0 text-[10px] shrink-0"
          >
            {{ oe.alertesRouges }}
          </UBadge>
          <UBadge
            v-if="oe.alertesOranges > 0"
            class="bg-orange-100 text-orange-700 border-none px-1 py-0 text-[10px] shrink-0"
          >
            {{ oe.alertesOranges }}
          </UBadge>
        </div>
        <div
          v-if="visibleOes.length === 0"
          class="text-xs text-gray-400 italic"
        >
          Aucune donnée
        </div>
      </div>
    </template>
  </UPageCard>
</template>
