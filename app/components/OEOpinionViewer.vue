<template>
  <USlideover
    v-model:open="isOpen"
    title="Avis de l'Organisme Évaluateur"
    side="right"
    class="w-full max-w-3xl"
    close-icon="i-lucide-x"
    :dismissible="false"
    :close="true"
  >
    <template #body>
      <!-- Header avec info audit et bouton enregistrer -->
      <div class="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-gray-200">
        <div class="flex-1">
          <p class="text-sm text-gray-600">
            {{ audit.entity.name }} - {{ audit.type }}
          </p>
        </div>

        <UButton
          v-if="canEdit"
          @click="handleSave"
          color="primary"
          icon="i-lucide-save"
          label="Enregistrer"
          :loading="updateLoading"
          :disabled="!hasChanges || updateLoading"
        />
      </div>

      <!-- Contenu principal -->
      <div class="flex flex-col space-y-6 pb-20">
        <!-- Section 1: Type d'avis -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-clipboard-check" class="w-5 h-5 text-purple-600" />
              <h4 class="font-semibold">Type d'avis</h4>
            </div>
          </template>

          <!-- Mode édition -->
          <URadioGroup
            v-if="canEdit"
            v-model="localOpinion"
            :items="opinionOptions"
            orientation="vertical"
            variant="card"
            @update:model-value="hasChanges = true"
          />

          <!-- Mode lecture seule -->
          <div v-else class="text-center py-4">
            <UBadge
              v-if="localOpinion"
              :color="getOpinionColor(localOpinion)"
              size="lg"
              variant="soft"
            >
              {{ opinionLabels[localOpinion] }}
            </UBadge>
            <span v-else class="text-gray-400 text-sm">Non attribué</span>
          </div>
        </UCard>

        <!-- Section 2: Argumentaire -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-file-text" class="w-5 h-5 text-blue-600" />
              <h4 class="font-semibold">Argumentaire</h4>
            </div>
          </template>

          <!-- Mode édition -->
          <div v-if="canEdit">
            <UTextarea
              v-model="localArgumentaire"
              placeholder="Détaillez les forces et axes d'amélioration observés lors de l'audit"
              :rows="6"
              class="w-full"
              @input="hasChanges = true"
            />
          </div>

          <!-- Mode lecture seule -->
          <p v-else class="text-sm text-gray-700 whitespace-pre-line">
            {{ localArgumentaire || 'Aucun argumentaire' }}
          </p>
        </UCard>

        <!-- Section 3: Conditions (si avis réservé) -->
        <UCard v-if="localOpinion === 'RESERVED'">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-alert-triangle" class="w-5 h-5 text-yellow-600" />
              <h4 class="font-semibold">Conditions</h4>
            </div>
          </template>

          <!-- Mode édition -->
          <div v-if="canEdit">
            <UTextarea
              v-model="localConditions"
              placeholder="Listez les conditions à remplir pour obtenir un avis favorable..."
              :rows="4"
              class="w-full"
              @input="hasChanges = true"
            />
          </div>

          <!-- Mode lecture seule -->
          <p v-else class="text-sm text-yellow-700 whitespace-pre-line">
            {{ localConditions || 'Aucune condition' }}
          </p>
        </UCard>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import { Role } from '#shared/types/roles'
import { AuditStatus } from '#shared/types/enums'
import type { AuditWithRelations } from '~~/app/types/audits'

interface Props {
  audit: AuditWithRelations
  open?: boolean
}

const props = defineProps<Props>()

// Composables
const { user } = useAuth()
const { updateAudit, fetchAudit, updateLoading } = useAudits()
const { triggerActionRefresh } = useActionRefresh()

// Inject isAuditEditable
const isAuditEditable = inject<Ref<boolean>>('isAuditEditable', ref(true))

// État open avec v-model
const isOpen = defineModel<boolean>('open', { default: false })

// État local
const localOpinion = ref<string | null>(null)
const localArgumentaire = ref<string>('')
const localConditions = ref<string>('')
const hasChanges = ref(false)

// Options pour le RadioGroup
const opinionOptions = [
  {
    value: 'FAVORABLE',
    label: 'Favorable',
    description: 'L\'entité répond à toutes les exigences du référentiel'
  },
  {
    value: 'UNFAVORABLE',
    label: 'Défavorable',
    description: 'L\'entité ne répond pas aux exigences du référentiel'
  },
  {
    value: 'RESERVED',
    label: 'Réservé',
    description: 'Avis favorable sous réserve du respect de certaines conditions'
  }
]

const opinionLabels: Record<string, string> = {
  'FAVORABLE': 'Favorable',
  'UNFAVORABLE': 'Défavorable',
  'RESERVED': 'Réservé'
}

// Permissions
const canEdit = computed(() => {
  if (!isAuditEditable.value) return false
  if (!props.audit?.status) return false

  // OE peut éditer si statut approprié
  if (user.value?.role === Role.OE) {
    return [AuditStatus.PENDING_OE_OPINION, AuditStatus.PENDING_FEEF_DECISION]
      .includes(props.audit.status)
  }

  // FEEF peut aussi éditer
  if (user.value?.role === Role.FEEF) {
    return true
  }

  return false
})

// Helpers
function getOpinionColor(opinion: string) {
  if (opinion === 'FAVORABLE') return 'success'
  if (opinion === 'RESERVED') return 'warning'
  if (opinion === 'UNFAVORABLE') return 'error'
  return 'neutral'
}

// Initialisation
async function initializeOpinion() {
  localOpinion.value = props.audit.oeOpinion ?? null
  localArgumentaire.value = props.audit.oeOpinionArgumentaire ?? ''
  localConditions.value = (props.audit as any).oeOpinionConditions ?? ''
  hasChanges.value = false
}

// Sauvegarde
async function handleSave() {
  // Update audit opinion
  const auditResult = await updateAudit(props.audit.id, {
    oeOpinion: localOpinion.value,
    oeOpinionArgumentaire: localArgumentaire.value.trim(),
    oeOpinionConditions: localOpinion.value === 'RESERVED' ? localConditions.value.trim() : null,
  })

  // Refresh et fermeture
  if (auditResult.success) {
    await fetchAudit(props.audit.id)
    hasChanges.value = false

    // Déclencher le rafraîchissement des actions
    // L'émission d'un avis peut compléter des actions et déclencher des transitions
    triggerActionRefresh({
      auditId: props.audit.id.toString(),
      entityId: props.audit.entityId.toString(),
    })

    isOpen.value = false
  }
}

// Initialiser à l'ouverture
watchEffect(() => {
  if (isOpen.value) {
    initializeOpinion()
  }
})
</script>
