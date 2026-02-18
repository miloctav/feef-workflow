<script setup lang="ts">
import type { ProgressBarOe } from '~/composables/useDashboardCompare'

const props = defineProps<{
  progressBars: ProgressBarOe[]
  phaseConfig: Array<{
    key: string
    label: string
    description: string
    bgColor: string
    textColor: string
    detailLabels: Record<string, string>
  }>
}>()

// Only show OEs that have at least one dossier
const visibleBars = computed(() => props.progressBars.filter(oe => oe.total > 0))

const totalAll = computed(() =>
  visibleBars.value.reduce((s, oe) => s + oe.total, 0),
)
</script>

<template>
  <div class="w-full space-y-2">
    <!-- Shared legend -->
    <div class="flex justify-center gap-5 mb-3 flex-wrap">
      <UTooltip
        v-for="phase in phaseConfig"
        :key="phase.key"
        :text="phase.description"
      >
        <div class="flex items-center gap-1.5 cursor-help">
          <span
            class="inline-block w-3 h-3 rounded-full shrink-0"
            :style="`background: ${phase.bgColor}`"
          />
          <span class="text-sm text-gray-600">{{ phase.label }}</span>
        </div>
      </UTooltip>
    </div>

    <!-- No data -->
    <div
      v-if="visibleBars.length === 0"
      class="text-center text-gray-400 py-4 italic text-sm"
    >
      Aucune donnée
    </div>

    <!-- One row per OE (only those with at least one dossier) -->
    <div
      v-for="oe in visibleBars"
      :key="String(oe.oeId)"
      class="flex items-center gap-3"
    >
      <!-- OE label -->
      <div class="flex items-center gap-1.5 w-36 shrink-0">
        <span
          class="inline-block w-2.5 h-2.5 rounded-full shrink-0"
          :style="`background: ${oe.dot}`"
        />
        <span class="text-xs font-semibold text-gray-700 truncate">{{ oe.oeName }}</span>
      </div>

      <!-- Progress bar -->
      <div
        v-if="oe.total > 0"
        class="relative flex-1 h-6 bg-gray-100 rounded-full overflow-hidden flex text-xs font-medium"
      >
        <UTooltip
          v-for="(phase, i) in oe.phases"
          :key="phase.key"
          class="h-full transition-all duration-500"
          :style="`width: ${phase.pct}%`"
        >
          <div
            class="h-full w-full flex items-center justify-center"
            :class="[
              phaseConfig[i]?.textColor ?? '',
              i < oe.phases.length - 1 ? 'border-r border-white' : '',
            ]"
            :style="`background: ${phaseConfig[i]?.bgColor ?? '#e5e7eb'}`"
          >
            <span
              v-if="phase.pct > 10"
              class="px-1 truncate"
            >
              {{ phase.count }}
            </span>
          </div>
          <template #content>
            <div class="text-xs p-1 min-w-32">
              <div class="font-semibold mb-1">{{ phaseConfig[i]?.label }}</div>
              <div
                v-for="(count, key) in phase.detail"
                :key="key"
                class="flex justify-between gap-4"
              >
                <span>{{ phaseConfig[i]?.detailLabels[String(key)] || key }}</span>
                <span class="font-bold">{{ count }}</span>
              </div>
            </div>
          </template>
        </UTooltip>
      </div>

      <!-- Empty bar -->
      <div
        v-else
        class="flex-1 h-6 bg-gray-100 rounded-full flex items-center justify-center"
      >
        <span class="text-xs text-gray-400 italic">Aucun dossier</span>
      </div>

      <!-- Total badge -->
      <span class="text-xs font-bold text-gray-700 w-8 text-right shrink-0">{{ oe.total }}</span>
    </div>

    <div
      v-if="totalAll > 0"
      class="text-xs text-gray-500 text-right mt-1"
    >
      Total : {{ totalAll }} dossiers
    </div>
  </div>
</template>
