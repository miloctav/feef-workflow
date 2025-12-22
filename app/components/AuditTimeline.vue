<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-clock" class="w-5 h-5 text-blue-500" />
        <h4 class="font-semibold">Historique des événements</h4>
      </div>
    </template>

    <!-- Loading state -->
    <div v-if="pending" class="flex justify-center items-center py-8">
      <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-gray-400" />
      <span class="ml-2 text-sm text-gray-500">Chargement de l'historique...</span>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="py-8 text-center">
      <UIcon name="i-lucide-alert-circle" class="w-8 h-8 text-red-500 mx-auto mb-2" />
      <p class="text-sm text-red-600">Impossible de charger l'historique</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="!events || events.length === 0" class="py-8 text-center">
      <UIcon name="i-lucide-inbox" class="w-8 h-8 text-gray-400 mx-auto mb-2" />
      <p class="text-sm text-gray-500">Aucun événement enregistré</p>
    </div>

    <!-- Timeline -->
    <div v-else class="relative">
      <!-- Vertical line -->
      <div class="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

      <!-- Events list -->
      <div class="space-y-6">
        <div
          v-for="event in events"
          :key="event.id"
          class="relative flex gap-4 items-start"
        >
          <!-- Icon circle -->
          <div
            class="relative z-10 flex items-center justify-center w-8 h-8 rounded-full ring-4 ring-white"
            :class="getEventColorClass(event.category)"
          >
            <UIcon :name="getEventIcon(event.type)" class="w-4 h-4 text-white" />
          </div>

          <!-- Event content -->
          <div class="flex-1 pb-6">
            <div class="bg-gray-50 rounded-lg p-4">
              <!-- Event title and timestamp -->
              <div class="flex items-start justify-between gap-4 mb-2">
                <div class="flex-1">
                  <h5 class="font-medium text-sm text-gray-900">
                    {{ getEventTitle(event.type) }}
                  </h5>
                  <p class="text-xs text-gray-500 mt-1">
                    Par {{ event.performedByAccount?.firstname }} {{ event.performedByAccount?.lastname }}
                  </p>
                </div>
                <time class="text-xs text-gray-500 whitespace-nowrap">
                  {{ formatDate(event.performedAt) }}
                </time>
              </div>

              <!-- Event metadata (if present) -->
              <div v-if="event.metadata && Object.keys(event.metadata).length > 0" class="mt-3 pt-3 border-t border-gray-200">
                <div class="space-y-2 text-xs">
                  <!-- Score -->
                  <div v-if="event.metadata.score !== undefined" class="flex items-center gap-2">
                    <span class="text-gray-600">Score:</span>
                    <span class="font-medium">{{ event.metadata.score }}/100</span>
                  </div>

                  <!-- Opinion -->
                  <div v-if="event.metadata.opinion" class="flex items-center gap-2">
                    <span class="text-gray-600">Avis:</span>
                    <span class="font-medium" :class="getOpinionColor(event.metadata.opinion)">
                      {{ formatOpinion(event.metadata.opinion) }}
                    </span>
                  </div>

                  <!-- Argumentaire -->
                  <div v-if="event.metadata.argumentaire" class="mt-2">
                    <span class="text-gray-600">Argumentaire:</span>
                    <p class="mt-1 text-gray-700">{{ event.metadata.argumentaire }}</p>
                  </div>

                  <!-- Conditions -->
                  <div v-if="event.metadata.conditions" class="mt-2">
                    <span class="text-gray-600">Conditions:</span>
                    <p class="mt-1 text-gray-700">{{ event.metadata.conditions }}</p>
                  </div>

                  <!-- Decision -->
                  <div v-if="event.metadata.decision" class="flex items-center gap-2">
                    <span class="text-gray-600">Décision:</span>
                    <span class="font-medium" :class="getDecisionColor(event.metadata.decision)">
                      {{ formatDecision(event.metadata.decision) }}
                    </span>
                  </div>

                  <!-- Refusal reason -->
                  <div v-if="event.metadata.refusalReason" class="mt-2">
                    <span class="text-gray-600">Motif de refus:</span>
                    <p class="mt-1 text-gray-700">{{ event.metadata.refusalReason }}</p>
                  </div>

                  <!-- Reason (generic) -->
                  <div v-if="event.metadata.reason" class="mt-2">
                    <span class="text-gray-600">Raison:</span>
                    <p class="mt-1 text-gray-700">{{ event.metadata.reason }}</p>
                  </div>

                  <!-- Comment (generic) -->
                  <div v-if="event.metadata.comment" class="mt-2">
                    <span class="text-gray-600">Commentaire:</span>
                    <p class="mt-1 text-gray-700">{{ event.metadata.comment }}</p>
                  </div>

                  <!-- Status transition -->
                  <div v-if="event.metadata.newStatus" class="flex items-center gap-2">
                    <span class="text-gray-600">Nouveau statut:</span>
                    <span class="font-medium">{{ event.metadata.newStatus }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
const props = defineProps<{
  auditId: number
}>()

// Fetch events
const { data, pending, error, refresh } = await useFetch(`/api/audits/${props.auditId}/events`, {
  key: `audit-events-${props.auditId}`,
})

const events = computed(() => data.value?.data || [])

// Event type to icon mapping
function getEventIcon(type: string): string {
  const iconMap: Record<string, string> = {
    AUDIT_CASE_SUBMITTED: 'i-lucide-send',
    AUDIT_CASE_APPROVED: 'i-lucide-check-circle',
    AUDIT_OE_ASSIGNED: 'i-lucide-user-plus',
    AUDIT_OE_ACCEPTED: 'i-lucide-thumbs-up',
    AUDIT_OE_REFUSED: 'i-lucide-thumbs-down',
    AUDIT_DATES_SET: 'i-lucide-calendar',
    AUDIT_PLAN_UPLOADED: 'i-lucide-file-text',
    AUDIT_REPORT_UPLOADED: 'i-lucide-file-check',
    AUDIT_CORRECTIVE_PLAN_UPLOADED: 'i-lucide-clipboard-list',
    AUDIT_CORRECTIVE_PLAN_VALIDATED: 'i-lucide-check-square',
    AUDIT_OE_OPINION_TRANSMITTED: 'i-lucide-message-square',
    AUDIT_FEEF_DECISION_ACCEPTED: 'i-lucide-check-circle-2',
    AUDIT_FEEF_DECISION_REJECTED: 'i-lucide-x-circle',
    AUDIT_ATTESTATION_GENERATED: 'i-lucide-award',
    AUDIT_STATUS_CHANGED: 'i-lucide-git-branch',
    ENTITY_DOCUMENTARY_REVIEW_READY: 'i-lucide-folder-check',
    ENTITY_OE_ASSIGNED: 'i-lucide-user-cog',
    CONTRACT_ENTITY_SIGNED: 'i-lucide-pen-line',
    CONTRACT_FEEF_SIGNED: 'i-lucide-file-signature',
  }

  return iconMap[type] || 'i-lucide-circle'
}

// Event type to title mapping
function getEventTitle(type: string): string {
  const titleMap: Record<string, string> = {
    AUDIT_CASE_SUBMITTED: 'Dossier soumis',
    AUDIT_CASE_APPROVED: 'Dossier approuvé',
    AUDIT_OE_ASSIGNED: 'OE assigné',
    AUDIT_OE_ACCEPTED: 'OE a accepté l\'audit',
    AUDIT_OE_REFUSED: 'OE a refusé l\'audit',
    AUDIT_DATES_SET: 'Dates d\'audit définies',
    AUDIT_PLAN_UPLOADED: 'Plan d\'audit uploadé',
    AUDIT_REPORT_UPLOADED: 'Rapport d\'audit uploadé',
    AUDIT_CORRECTIVE_PLAN_UPLOADED: 'Plan correctif uploadé',
    AUDIT_CORRECTIVE_PLAN_VALIDATED: 'Plan correctif validé',
    AUDIT_OE_OPINION_TRANSMITTED: 'Avis OE transmis',
    AUDIT_FEEF_DECISION_ACCEPTED: 'Décision FEEF - Accepté',
    AUDIT_FEEF_DECISION_REJECTED: 'Décision FEEF - Rejeté',
    AUDIT_ATTESTATION_GENERATED: 'Attestation générée',
    AUDIT_STATUS_CHANGED: 'Statut modifié',
    ENTITY_DOCUMENTARY_REVIEW_READY: 'Revue documentaire prête',
    ENTITY_OE_ASSIGNED: 'OE assigné à l\'entité',
    CONTRACT_ENTITY_SIGNED: 'Contrat signé par l\'entité',
    CONTRACT_FEEF_SIGNED: 'Contrat signé par FEEF',
  }

  return titleMap[type] || type
}

// Category to color mapping
function getEventColorClass(category: string): string {
  const colorMap: Record<string, string> = {
    AUDIT: 'bg-blue-500',
    ENTITY: 'bg-green-500',
    CONTRACT: 'bg-purple-500',
    SYSTEM: 'bg-gray-500',
  }

  return colorMap[category] || 'bg-gray-500'
}

// Format date
function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Format opinion
function formatOpinion(opinion: string): string {
  const opinionMap: Record<string, string> = {
    FAVORABLE: 'Favorable',
    UNFAVORABLE: 'Défavorable',
    RESERVED: 'Réservé',
  }
  return opinionMap[opinion] || opinion
}

// Get opinion color
function getOpinionColor(opinion: string): string {
  const colorMap: Record<string, string> = {
    FAVORABLE: 'text-green-600',
    UNFAVORABLE: 'text-red-600',
    RESERVED: 'text-orange-600',
  }
  return colorMap[opinion] || 'text-gray-600'
}

// Format decision
function formatDecision(decision: string): string {
  const decisionMap: Record<string, string> = {
    ACCEPTED: 'Accepté',
    REJECTED: 'Rejeté',
    PENDING: 'En attente',
  }
  return decisionMap[decision] || decision
}

// Get decision color
function getDecisionColor(decision: string): string {
  const colorMap: Record<string, string> = {
    ACCEPTED: 'text-green-600',
    REJECTED: 'text-red-600',
    PENDING: 'text-orange-600',
  }
  return colorMap[decision] || 'text-gray-600'
}

// Expose refresh method
defineExpose({ refresh })
</script>
