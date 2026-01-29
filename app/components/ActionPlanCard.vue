<template>
  <UCard class="mb-6">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon
            :name="planTypeIcon"
            class="w-5 h-5 text-orange-500"
          />
          <h4 class="font-semibold">{{ planTypeTitle }}</h4>
        </div>
        <!-- Badge de deadline avec indicateur visuel -->
        <div
          v-if="currentAudit?.actionPlanDeadline"
          class="flex items-center gap-2"
        >
          <UIcon
            :name="deadlineIcon"
            :class="deadlineColorClass"
            class="w-4 h-4"
          />
          <span
            class="text-sm"
            :class="deadlineColorClass"
          >
            Échéance : {{ formatDate(currentAudit.actionPlanDeadline) }}
            <span v-if="isOverdue">(Dépassée)</span>
          </span>
        </div>
      </div>
    </template>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Card 1: Plan d'action -->
      <AuditStepCard
        :title="planTypeTitle"
        :state="hasPlan ? 'success' : 'warning'"
        icon-success="i-lucide-file-check"
        icon-warning="i-lucide-file-x"
        label-success="Disponible"
        label-warning="À uploader"
        color-scheme="orange"
        :clickable="hasPlan || canUploadPlan"
        :clickable-text="
          hasPlan ? 'Cliquer pour consulter le plan' : 'Cliquer pour importer un plan'
        "
        @click="viewPlan"
      >
        <template #content>
          <!-- Informations du plan disponible -->
          <div v-if="hasPlan && lastPlanVersion">
            <p class="text-xs text-gray-700">
              {{ formatVersionInfo(lastPlanVersion) }}
            </p>
          </div>
        </template>
      </AuditStepCard>

      <!-- Card 2: Validation OE -->
      <AuditStepCard
        title="Validation OE"
        :state="validationCardState"
        icon-success="i-lucide-check-circle"
        icon-warning="i-lucide-refresh-cw"
        icon-pending="i-lucide-clock"
        icon-disabled="i-lucide-lock"
        :label-success="isValidatedViaComplementaryAudit ? 'Validé (Phase 2)' : 'Validé'"
        label-warning="Audit complémentaire"
        label-pending="En attente"
        label-disabled="En attente du plan"
        color-scheme="green"
      >
        <template #actions>
          <!-- Boutons pour valider, refuser ou demander un audit complémentaire (OE uniquement, si PENDING_CORRECTIVE_PLAN_VALIDATION) -->
          <div
            v-if="canValidatePlan"
            class="flex flex-wrap gap-2"
          >
            <UButton
              @click="handleValidatePlan"
              color="success"
              size="xs"
              icon="i-lucide-check"
              :loading="validating"
            >
              Valider
            </UButton>
            <UButton
              v-if="!currentAudit?.hasComplementaryAudit"
              @click="showComplementaryModal = true"
              color="warning"
              variant="soft"
              size="xs"
              icon="i-lucide-calendar-plus"
            >
              Audit complémentaire
            </UButton>
            <UButton
              @click="showRefuseModal = true"
              color="error"
              variant="soft"
              size="xs"
              icon="i-lucide-x"
            >
              Refuser
            </UButton>
          </div>
        </template>

        <template #content>
          <!-- Validé via audit complémentaire -->
          <div v-if="isValidatedViaComplementaryAudit">
            <p class="text-xs text-gray-700">Validé via audit complémentaire</p>
            <p class="text-xs text-gray-600 mt-1">
              Score phase 2 : {{ currentAudit?.complementaryGlobalScore }}%
            </p>
          </div>
          <!-- Validé directement par l'OE -->
          <div v-else-if="isValidated">
            <p class="text-xs text-gray-700">Validé le {{ formatDate(validatedAt) }}</p>
            <p
              class="text-xs text-gray-600 mt-1"
              v-if="validatedByAccount"
            >
              Par {{ validatedByAccount.firstname }} {{ validatedByAccount.lastname }}
            </p>
          </div>
          <!-- Audit complémentaire en cours -->
          <div v-else-if="isComplementaryAuditInProgress">
            <p class="text-xs text-orange-600 font-medium">Refusé - En cours d'audit complémentaire</p>
            <p class="text-xs text-gray-600 mt-1">
              {{ complementaryAuditProgressText }}
            </p>
          </div>
          <!-- En attente de validation OE (pas d'audit complémentaire) -->
          <div v-else-if="hasPlan">
            <p class="text-xs text-gray-600">En cours d'examen par l'Organisme Évaluateur</p>
          </div>
          <!-- En attente du dépôt du plan -->
          <div v-else>
            <p class="text-xs text-gray-600">En attente du dépôt du plan d'action</p>
          </div>
        </template>
      </AuditStepCard>
    </div>

    <!-- DocumentViewer pour consulter le plan d'action -->
    <DocumentViewer
      :audit="currentAudit!"
      :audit-document-type="documentType"
      v-model:open="showDocumentViewer"
    />

    <!-- Modal de refus du plan -->
    <UModal v-model:open="showRefuseModal">
      <template #header>
        <div class="flex items-center gap-2 text-red-600">
          <UIcon
            name="i-lucide-alert-triangle"
            class="w-5 h-5"
          />
          <span class="font-semibold">Refuser le plan d'action</span>
        </div>
      </template>

      <template #body>
        <div class="space-y-4">
          <UAlert
            color="warning"
            variant="soft"
            icon="i-lucide-info"
            title="Attention"
            description="Le refus du plan d'action met fin à la procédure de labellisation. Cette action est irréversible."
          />

          <UFormField
            label="Motif du refus"
            required
          >
            <UTextarea
              v-model="refuseReason"
              placeholder="Expliquez les raisons du refus du plan d'action..."
              :rows="4"
            />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="showRefuseModal = false"
          >
            Annuler
          </UButton>
          <UButton
            color="error"
            :disabled="!refuseReason.trim()"
            :loading="refusing"
            @click="handleRefusePlan"
          >
            Confirmer le refus
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Modal de demande d'audit complémentaire -->
    <UModal v-model:open="showComplementaryModal">
      <template #header>
        <div class="flex items-center gap-2 text-orange-600">
          <UIcon
            name="i-lucide-calendar-plus"
            class="w-5 h-5"
          />
          <span class="font-semibold">Demander un audit complémentaire</span>
        </div>
      </template>

      <template #body>
        <div class="space-y-4">
          <UAlert
            color="info"
            variant="soft"
            icon="i-lucide-info"
            title="Audit complémentaire"
            description="Un audit complémentaire permet de vérifier la mise en œuvre des actions correctives. Vous devrez ensuite définir les dates de l'audit et soumettre un nouveau rapport avec les scores de la phase 2."
          />

          <p class="text-sm text-gray-600">
            Un seul audit complémentaire est autorisé par dossier.
            Si les résultats de la phase 2 nécessitent également un plan d'action,
            celui-ci devra être validé ou refusé sans possibilité d'un second audit complémentaire.
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="showComplementaryModal = false"
          >
            Annuler
          </UButton>
          <UButton
            color="warning"
            :loading="requestingComplementary"
            @click="handleRequestComplementaryAudit"
          >
            Confirmer
          </UButton>
        </div>
      </template>
    </UModal>
  </UCard>
</template>

<script setup lang="ts">
import { Role } from '#shared/types/roles'
import { AuditStatus } from '#shared/types/enums'
import { AuditDocumentType } from '~~/app/types/auditDocuments'

const { user } = useAuth()
const { currentAudit, fetchAudit } = useAudits()

// Inject isAuditEditable from parent (DecisionTab)
const isAuditEditable = inject<Ref<boolean>>('isAuditEditable', ref(true))

// Composables
const toast = useToast()
const { triggerActionRefresh } = useActionRefresh()

// État local
const validating = ref(false)
const showDocumentViewer = ref(false)
const showRefuseModal = ref(false)
const showComplementaryModal = ref(false)
const refuseReason = ref('')
const refusing = ref(false)
const requestingComplementary = ref(false)

// Récupérer les événements de l'audit via le composable
const { correctivePlanValidatedAt, correctivePlanValidatedByAccount } = useAuditEvents(
  computed(() => currentAudit.value?.id)
)

// Computed depuis currentAudit
const auditStatus = computed(() => currentAudit.value?.status ?? null)
const validatedAt = computed(() => correctivePlanValidatedAt.value ?? null)
const validatedByAccount = computed(() => correctivePlanValidatedByAccount.value ?? null)

// Type de plan requis
const actionPlanType = computed(() => currentAudit.value?.actionPlanType ?? 'NONE')

// Type de document correspondant
const documentType = computed(() => {
  return actionPlanType.value === 'SHORT'
    ? AuditDocumentType.SHORT_ACTION_PLAN
    : AuditDocumentType.LONG_ACTION_PLAN
})

// Titre et icône selon le type de plan
const planTypeTitle = computed(() => {
  return actionPlanType.value === 'SHORT'
    ? "Plan d'action court terme (15 jours)"
    : "Plan d'action long terme (6 mois)"
})

const planTypeIcon = computed(() => {
  return actionPlanType.value === 'SHORT' ? 'i-lucide-list-checks' : 'i-lucide-clipboard-list'
})

// Dernière version du plan depuis l'audit (pas d'appel API séparé)
const lastPlanVersion = computed(() => {
  const docType = actionPlanType.value === 'SHORT' ? 'SHORT_ACTION_PLAN' : 'LONG_ACTION_PLAN'
  return currentAudit.value?.lastDocumentVersions?.[docType] ?? null
})

// Gestion de la deadline
const deadline = computed(() => {
  return currentAudit.value?.actionPlanDeadline
    ? new Date(currentAudit.value.actionPlanDeadline)
    : null
})

const daysRemaining = computed(() => {
  if (!deadline.value) return null
  const now = new Date()
  const diffTime = deadline.value.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
})

const isOverdue = computed(() => {
  return daysRemaining.value !== null && daysRemaining.value < 0
})

const deadlineIcon = computed(() => {
  if (!daysRemaining.value) return 'i-lucide-calendar'
  if (daysRemaining.value < 0) return 'i-lucide-alert-triangle'
  if (daysRemaining.value <= 7) return 'i-lucide-clock-alert'
  return 'i-lucide-calendar-check'
})

const deadlineColorClass = computed(() => {
  if (!daysRemaining.value) return 'text-gray-400'
  if (daysRemaining.value < 0) return 'text-red-500'
  if (daysRemaining.value <= 7) return 'text-orange-500'
  return 'text-green-500'
})

// Computed
const hasPlan = computed(() => {
  return lastPlanVersion.value !== null
})

// Vérifier si l'audit complémentaire a validé le plan (score >= 65%)
const isValidatedViaComplementaryAudit = computed(() => {
  return (
    currentAudit.value?.hasComplementaryAudit === true &&
    currentAudit.value?.complementaryGlobalScore !== null &&
    currentAudit.value?.complementaryGlobalScore >= 65
  )
})

// Vérifier si un audit complémentaire est en cours (demandé mais pas encore terminé avec score suffisant)
const isComplementaryAuditInProgress = computed(() => {
  return (
    currentAudit.value?.hasComplementaryAudit === true &&
    (currentAudit.value?.complementaryGlobalScore === null ||
      currentAudit.value?.complementaryGlobalScore < 65)
  )
})

// Texte de progression de l'audit complémentaire
const complementaryAuditProgressText = computed(() => {
  if (!currentAudit.value?.hasComplementaryAudit) return ''

  const hasComplementaryDates =
    currentAudit.value?.complementaryStartDate !== null &&
    currentAudit.value?.complementaryEndDate !== null

  const hasComplementaryScore = currentAudit.value?.complementaryGlobalScore !== null

  // Si score < 65%, nouveau plan requis
  if (hasComplementaryScore && currentAudit.value.complementaryGlobalScore! < 65) {
    return 'Score phase 2 insuffisant - Nouveau plan requis'
  }

  // Progression de l'audit complémentaire
  if (!hasComplementaryDates) {
    return 'En attente de la définition des dates'
  }

  if (!hasComplementaryScore) {
    return 'En attente du rapport et du score'
  }

  return ''
})

const isValidated = computed(() => {
  // Validé soit par validation directe, soit via audit complémentaire réussi
  return (
    (validatedAt.value !== null && validatedAt.value !== undefined) ||
    isValidatedViaComplementaryAudit.value
  )
})

// État de la card de validation
const validationCardState = computed(() => {
  if (isValidated.value) return 'success'
  if (isComplementaryAuditInProgress.value) return 'warning'
  if (hasPlan.value) return 'pending'
  return 'disabled'
})

const canUploadPlan = computed(() => {
  // L'entreprise peut uploader le plan si PENDING_CORRECTIVE_PLAN et audit modifiable
  return (
    user.value?.role === Role.ENTITY &&
    auditStatus.value === AuditStatus.PENDING_CORRECTIVE_PLAN &&
    isAuditEditable.value
  )
})

const canValidatePlan = computed(() => {
  // L'OE peut valider si PENDING_CORRECTIVE_PLAN_VALIDATION et audit modifiable
  return (
    user.value?.role === Role.OE &&
    auditStatus.value === AuditStatus.PENDING_CORRECTIVE_PLAN_VALIDATION &&
    isAuditEditable.value
  )
})

// Méthodes
function formatVersionInfo(version: any) {
  if (!version) return ''
  const date = new Date(version.uploadAt)
  const formattedDate = date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const uploaderName = version.uploadByAccount
    ? `${version.uploadByAccount.firstname} ${version.uploadByAccount.lastname}`
    : 'Inconnu'
  return `Déposé le ${formattedDate} par ${uploaderName}`
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function viewPlan() {
  showDocumentViewer.value = true
}

async function handlePlanUploaded() {
  // Recharger l'audit pour mettre à jour lastDocumentVersions
  if (currentAudit.value) {
    await fetchAudit(currentAudit.value.id)
  }
}

async function handleValidatePlan() {
  if (!currentAudit.value) return

  validating.value = true
  try {
    await $fetch(`/api/audits/${currentAudit.value.id}/validate-corrective-plan`, {
      method: 'PUT',
    })

    toast.add({
      title: 'Succès',
      description: "Plan d'action validé avec succès",
      color: 'success',
    })

    // Recharger l'audit
    await fetchAudit(currentAudit.value.id)

    // Déclencher le rafraîchissement des actions
    // La validation du plan peut compléter des actions et en créer de nouvelles
    triggerActionRefresh({
      auditId: currentAudit.value.id.toString(),
      entityId: currentAudit.value.entityId.toString(),
    })
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.data?.message || 'Impossible de valider le plan',
      color: 'error',
    })
  } finally {
    validating.value = false
  }
}

async function handleRefusePlan() {
  if (!currentAudit.value || !refuseReason.value.trim()) return

  refusing.value = true
  try {
    await $fetch(`/api/audits/${currentAudit.value.id}/refuse-corrective-plan`, {
      method: 'PUT',
      body: {
        reason: refuseReason.value.trim(),
      },
    })

    toast.add({
      title: 'Plan refusé',
      description: "Le plan d'action a été refusé. La procédure de labellisation est terminée.",
      color: 'warning',
    })

    showRefuseModal.value = false
    refuseReason.value = ''

    // Recharger l'audit
    await fetchAudit(currentAudit.value.id)

    // Déclencher le rafraîchissement des actions
    triggerActionRefresh({
      auditId: currentAudit.value.id.toString(),
      entityId: currentAudit.value.entityId.toString(),
    })
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.data?.message || 'Impossible de refuser le plan',
      color: 'error',
    })
  } finally {
    refusing.value = false
  }
}

async function handleRequestComplementaryAudit() {
  if (!currentAudit.value) return

  requestingComplementary.value = true
  try {
    await $fetch(`/api/audits/${currentAudit.value.id}/request-complementary-audit`, {
      method: 'PUT',
    })

    toast.add({
      title: 'Audit complémentaire demandé',
      description: "L'audit complémentaire a été demandé. Définissez les dates de l'audit.",
      color: 'success',
    })

    showComplementaryModal.value = false

    // Recharger l'audit
    await fetchAudit(currentAudit.value.id)

    // Déclencher le rafraîchissement des actions
    triggerActionRefresh({
      auditId: currentAudit.value.id.toString(),
      entityId: currentAudit.value.entityId.toString(),
    })
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.data?.message || "Impossible de demander l'audit complémentaire",
      color: 'error',
    })
  } finally {
    requestingComplementary.value = false
  }
}
</script>
