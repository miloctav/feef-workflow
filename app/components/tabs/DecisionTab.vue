<template>
  <div class="px-4 pb-4 pt-2 min-h-[300px]">
    <div class="flex items-center gap-3 mb-4">
      <UIcon
        name="i-lucide-scale"
        class="w-5 h-5 text-primary"
      />
      <div class="flex items-baseline gap-2">
        <h3 class="font-semibold text-gray-900">Phase de décision</h3>
        <span class="text-gray-400 hidden sm:inline">-</span>
        <p class="text-gray-600 text-sm">Analyse du rapport et émission de l'avis</p>
      </div>
    </div>

    <!-- Rapports d'audit -->
    <AuditReportsCard v-if="currentAudit" />

    <!-- Audit complémentaire (affiché si hasComplementaryAudit est true) -->
    <ComplementaryAuditCard
      v-if="currentAudit && currentAudit.hasComplementaryAudit"
    />

    <!-- Plan d'action -->
    <ActionPlanCard
      v-if="currentAudit && currentAudit.actionPlanType && currentAudit.actionPlanType !== 'NONE'"
    />

    <!-- Avis de l'Organisme Évaluateur -->
    <OEOpinionCard v-if="currentAudit" />

    <!-- Validation FEEF -->
    <FEEFValidationCard v-if="currentAudit" />
  </div>
</template>

<script setup lang="ts">
import { AuditStatus } from '#shared/types/enums'

interface Props {
  company?: any // Pour compatibilité, non utilisé
  role?: 'oe' | 'feef' | 'company'
}

withDefaults(defineProps<Props>(), {
  role: 'feef',
})

// Composables
const { currentAudit } = useAudits()

// Computed: Audit modifiable? (Non modifiable si terminé ou plan refusé)
const isAuditEditable = computed(() => {
  const status = currentAudit.value?.status
  return status !== AuditStatus.COMPLETED && status !== AuditStatus.REFUSED_PLAN
})

// Provide isEditable aux composants enfants
provide('isAuditEditable', isAuditEditable)
</script>
