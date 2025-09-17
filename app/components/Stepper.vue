<script setup lang="ts">

const props = defineProps({
  workflow: {
    type: Object as PropType<any>,
    required: true
  }
});

const stepOrder = ['candidacy', 'engagement', 'audit', 'decision', 'labeled'];

const stepperItems = computed(() => {
  const currentStepIndex = stepOrder.indexOf(props.workflow.state);
  return [
    {
      title: 'Candidature',
      icon: 'i-lucide-file-text',
      value: 'candidacy',
      completed: currentStepIndex >= 0,
      dates: [
        {
          label: 'Date validation éligibilité',
          value: props.workflow.eligibilite?.dateValidation,
          icon: 'i-lucide-check-circle'
        },
        {
          label: 'Envoi contrat de labellisation',
          value: props.workflow.contratLabellisation?.envoiContrat,
          icon: 'i-lucide-send'
        },
        {
          label: 'Contrat de labellisation signé',
          value: props.workflow.contratLabellisation?.contratSigne,
          icon: 'i-lucide-pen-tool'
        }
      ]
    },
    {
      title: 'Engagement',
      icon: 'i-lucide-handshake',
      value: 'engagement',
      completed: currentStepIndex >= 1,
      dates: [
        {
          label: 'Devis OE signé',
          value: props.workflow.contratOE?.contratSigne,
          icon: 'i-lucide-file-signature'
        }
      ]
    },
    {
      title: 'Audit',
      icon: 'i-lucide-search',
      value: 'audit',
      completed: currentStepIndex >= 2,
      dates: [
        {
          label: 'Plan audit transmis',
          value: props.workflow.audit?.dateTransmissionPlan,
          icon: 'i-lucide-calendar-days'
        },
        {
          label: 'Période audit planifiée',
          value: props.workflow.audit?.dateDebutPlanifiee && props.workflow.audit?.dateFinPlanifiee ? `${props.workflow.audit.dateDebutPlanifiee} - ${props.workflow.audit.dateFinPlanifiee}` : undefined,
          icon: 'i-lucide-calendar-check'
        },
        {
          label: 'Audit réalisé',
          value: props.workflow.audit?.dateDebutReelle && props.workflow.audit?.dateFinReelle ? `${props.workflow.audit.dateDebutReelle} - ${props.workflow.audit.dateFinReelle}` : undefined,
          icon: 'i-lucide-clipboard-check'
        }
      ]
    },
    {
      title: 'Décision',
      icon: 'i-lucide-scale',
      value: 'decision',
      completed: currentStepIndex >= 3,
      dates: [
        {
          label: 'Rapport simplifié transmis',
          value: props.workflow.rapport?.rapportSimplifie?.dateTransmission,
          icon: 'i-lucide-file-text'
        },
        {
          label: 'Avis de labellisation émis',
          value: props.workflow.avis?.dateTransmission,
          icon: 'i-lucide-message-square'
        }
      ]
    },
    {
      title: 'Labellisé',
      icon: 'i-lucide-award',
      value: 'labeled',
      completed: currentStepIndex >= 4,
      dates: [
        {
          label: 'Attestation transmise',
          value: props.workflow.attestation?.dateTransmission,
          icon: 'i-lucide-certificate'
        },
        {
          label: 'Validité de l\'attestation',
          value: props.workflow.attestation?.dateValidite,
          icon: 'i-lucide-calendar'
        }
      ]
    }
  ];
});

function getStepStatus(stepValue: string): 'completed' | 'current' | 'pending' {
  const currentIndex = stepOrder.indexOf(props.workflow.state);
  const stepIndex = stepOrder.indexOf(stepValue);
  if (stepIndex < currentIndex) {
    return 'completed';
  } else if (stepIndex === currentIndex) {
    return 'current';
  } else {
    return 'pending';
  }
}
</script>

<template>
  <UStepper 
    :items="stepperItems" 
    :model-value="3"
    :disabled="true"
    color="primary"
    size="lg"
    class="w-full"
  >
    <template #indicator="{ item }">
      <div 
        :class="[
          'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors',
          getStepStatus(item.value) === 'completed'
            ? 'bg-green-500 border-green-500 text-white'
            : getStepStatus(item.value) === 'current'
            ? 'bg-primary border-primary text-white'
            : 'bg-white border-gray-300 text-gray-400'
        ]"
      >
        <UIcon 
          v-if="getStepStatus(item.value) === 'completed'"
          name="i-lucide-check" 
          class="w-4 h-4" 
        />
        <UIcon 
          v-else
          :name="item.icon" 
          class="w-4 h-4" 
        />
      </div>
    </template>
    <template #description="{ item }">
      <div class="space-y-1 text-sm">
        <div v-if="item.dates && item.dates.length > 0" class="space-y-1">
          <div v-for="date in item.dates" :key="date.label" class="flex items-center gap-2 text-xs">
            <UIcon :name="date.icon" class="w-3 h-3 text-gray-500" />
            <span class="text-gray-600">{{ date.label }}:</span>
            <span class="text-gray-900 font-medium">{{ date.value || 'Non défini' }}</span>
          </div>
        </div>
      </div>
    </template>
  </UStepper>
</template>
