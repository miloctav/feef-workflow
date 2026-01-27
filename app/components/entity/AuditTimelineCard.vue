<script setup lang="ts">
import {
  AuditStatusFlow,
  getAuditStatusLabel,
  getAuditStatusDescription,
  type AuditStatusType,
} from '~~/shared/types/enums'

interface Audit {
  id: string
  status: AuditStatusType
}

const props = defineProps<{
  audit: Audit | null
}>()

const timelineItems = computed(() => {
  const currentStatusIndex = props.audit ? AuditStatusFlow.indexOf(props.audit.status) : -1

  return AuditStatusFlow.map((status, index) => {
    let state: 'completed' | 'current' | 'upcoming' = 'upcoming'
    let icon = 'i-lucide-circle'

    if (currentStatusIndex === -1) {
      // Pas d'audit : tous à venir
      state = 'upcoming'
      icon = 'i-lucide-circle'
    } else if (index < currentStatusIndex) {
      // Étapes complétées
      state = 'completed'
      icon = 'i-lucide-check-circle-2'
    } else if (index === currentStatusIndex) {
      // Étape actuelle
      state = 'current'
      icon = 'i-lucide-clock'
    } else {
      // Étapes futures
      state = 'upcoming'
      icon = 'i-lucide-circle'
    }

    return {
      label: getAuditStatusLabel(status),
      description: getAuditStatusDescription(status),
      icon,
      state,
      isLast: index === AuditStatusFlow.length - 1,
    }
  })
})
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-route"
          class="w-5 h-5 text-primary"
        />
        <h3 class="font-semibold text-gray-900">Parcours de labellisation</h3>
      </div>
    </template>

    <div class="py-4">
      <!-- Message si pas d'audit -->
      <div
        v-if="!audit"
        class="text-center py-8 text-gray-500"
      >
        <UIcon
          name="i-lucide-info"
          class="w-6 h-6 mx-auto mb-2"
        />
        <p class="text-sm">Le parcours de labellisation démarrera dès qu'un audit sera créé</p>
      </div>

      <!-- Timeline horizontale compacte -->
      <div
        v-else
        class="px-2"
      >
        <div class="flex items-start justify-between">
          <div
            v-for="(item, index) in timelineItems"
            :key="index"
            class="flex items-start flex-1"
            :class="{ 'justify-center': !item.isLast }"
          >
            <!-- Étape -->
            <div class="flex flex-col items-center flex-shrink-0">
              <!-- Cercle/Icône avec tooltip -->
              <UTooltip :text="item.description">
                <div
                  class="relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 cursor-help"
                  :class="{
                    'bg-success text-white': item.state === 'completed',
                    'bg-primary text-white ring-4 ring-primary/20 scale-110': item.state === 'current',
                    'bg-gray-200 text-gray-400': item.state === 'upcoming',
                  }"
                >
                  <UIcon
                    :name="item.icon"
                    class="w-4 h-4"
                  />
                </div>
              </UTooltip>

              <!-- Label -->
              <div class="mt-2 text-center max-w-[90px]">
                <p
                  class="text-[10px] leading-tight font-medium transition-colors duration-300"
                  :class="{
                    'text-success': item.state === 'completed',
                    'text-primary font-semibold': item.state === 'current',
                    'text-gray-500': item.state === 'upcoming',
                  }"
                >
                  {{ item.label }}
                </p>
              </div>
            </div>

            <!-- Ligne de connexion -->
            <div
              v-if="!item.isLast"
              class="flex items-center pt-[18px] flex-1 min-w-[8px] max-w-[40px]"
            >
              <div
                class="h-0.5 w-full transition-colors duration-300"
                :class="{
                  'bg-success': item.state === 'completed',
                  'bg-primary': item.state === 'current',
                  'bg-gray-200': item.state === 'upcoming',
                }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Légende -->
      <div
        v-if="audit"
        class="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-gray-200"
      >
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full bg-success" />
          <span class="text-xs text-gray-600">Complété</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full bg-primary ring-2 ring-primary/20" />
          <span class="text-xs text-gray-600">En cours</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full bg-gray-200" />
          <span class="text-xs text-gray-600">À venir</span>
        </div>
      </div>
    </div>
  </UCard>
</template>
