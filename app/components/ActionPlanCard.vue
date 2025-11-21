<template>
  <UCard class="mb-6">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-clipboard-check" class="w-5 h-5 text-orange-500" />
        <h4 class="font-semibold">Plan d'action corrective</h4>
      </div>
    </template>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Card 1: Plan d'action -->
      <AuditStepCard
        title="Plan d'action corrective"
        :state="hasPlan ? 'success' : 'warning'"
        icon-success="i-lucide-file-check"
        icon-warning="i-lucide-file-x"
        label-success="Disponible"
        label-warning="À uploader"
        color-scheme="orange"
        :clickable="hasPlan || canUploadPlan"
        :clickable-text="hasPlan ? 'Cliquer pour consulter le plan' : 'Cliquer pour importer un plan'"
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
        :state="isValidated ? 'success' : (hasPlan ? 'pending' : 'disabled')"
        icon-success="i-lucide-check-circle"
        icon-pending="i-lucide-clock"
        icon-disabled="i-lucide-lock"
        label-success="Validé"
        label-pending="En attente"
        label-disabled="En attente du plan"
        color-scheme="green"
      >
        <template #actions>
          <!-- Bouton pour valider le plan (OE uniquement, si PENDING_CORRECTIVE_PLAN_VALIDATION) -->
          <div v-if="canValidatePlan">
            <UButton
              @click="handleValidatePlan"
              color="success"
              size="xs"
              icon="i-lucide-check"
              :loading="validating"
            >
              Valider le plan
            </UButton>
          </div>
        </template>

        <template #content>
          <div v-if="isValidated">
            <p class="text-xs text-gray-700">
              Validé le {{ formatDate(validatedAt) }}
            </p>
            <p class="text-xs text-gray-600 mt-1" v-if="validatedByAccount">
              Par {{ validatedByAccount.firstname }} {{ validatedByAccount.lastname }}
            </p>
          </div>
          <div v-else-if="hasPlan">
            <p class="text-xs text-gray-600">
              En cours d'examen par l'Organisme Évaluateur
            </p>
          </div>
          <div v-else>
            <p class="text-xs text-gray-600">
              En attente du dépôt du plan d'action
            </p>
          </div>
        </template>
      </AuditStepCard>
    </div>

    <!-- DocumentViewer pour consulter le plan d'action -->
    <DocumentViewer
      :audit="currentAudit!"
      :audit-document-type="AuditDocumentType.CORRECTIVE_PLAN"
      v-model:open="showDocumentViewer"
    />
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

// État local
const validating = ref(false)
const showDocumentViewer = ref(false)

// Computed depuis currentAudit
const auditStatus = computed(() => currentAudit.value?.status ?? null)
const validatedAt = computed(() => currentAudit.value?.correctivePlanValidatedAt ?? null)
const validatedByAccount = computed(() => (currentAudit.value as any)?.correctivePlanValidatedByAccount ?? null)

// Dernière version du plan depuis l'audit (pas d'appel API séparé)
const lastPlanVersion = computed(() => {
  return currentAudit.value?.lastDocumentVersions?.CORRECTIVE_PLAN ?? null
})

// Computed
const hasPlan = computed(() => {
  return lastPlanVersion.value !== null
})

const isValidated = computed(() => {
  return validatedAt.value !== null && validatedAt.value !== undefined
})

const canUploadPlan = computed(() => {
  // L'entreprise peut uploader le plan si PENDING_CORRECTIVE_PLAN et audit modifiable
  return user.value?.role === Role.ENTITY && auditStatus.value === AuditStatus.PENDING_CORRECTIVE_PLAN && isAuditEditable.value
})

const canValidatePlan = computed(() => {
  // L'OE peut valider si PENDING_CORRECTIVE_PLAN_VALIDATION et audit modifiable
  return user.value?.role === Role.OE && auditStatus.value === AuditStatus.PENDING_CORRECTIVE_PLAN_VALIDATION && isAuditEditable.value
})

// Méthodes
function formatVersionInfo(version: any) {
  if (!version) return ''
  const date = new Date(version.uploadAt)
  const formattedDate = date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
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
    year: 'numeric'
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
      method: 'PUT'
    })

    toast.add({
      title: 'Succès',
      description: 'Plan d\'action validé avec succès',
      color: 'success'
    })

    // Recharger l'audit
    await fetchAudit(currentAudit.value.id)
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.data?.message || 'Impossible de valider le plan',
      color: 'error'
    })
  } finally {
    validating.value = false
  }
}
</script>
