<template>
  <UCard class="mb-6">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-file-chart-column"
            class="w-5 h-5 text-purple-600"
          />
          <h4 class="font-semibold">Rapport d'audit</h4>
        </div>

        <!-- Badge de statut de l'étape -->
        <UBadge
          v-if="auditStatus === AuditStatus.PENDING_REPORT"
          :color="stepStatusBadge.color"
          :icon="stepStatusBadge.icon"
          variant="soft"
        >
          {{ stepStatusBadge.label }}
        </UBadge>
      </div>
    </template>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Card 1: Rapport d'audit -->
      <AuditStepCard
        title="Rapport d'audit"
        :state="hasReport ? 'success' : 'warning'"
        icon-success="i-lucide-file-check"
        icon-warning="i-lucide-file-x"
        label-success="Disponible"
        label-warning="À uploader"
        color-scheme="green"
        :clickable="hasReport || canUploadReport"
        :clickable-text="
          hasReport ? 'Cliquer pour consulter le rapport' : 'Cliquer pour importer un rapport'
        "
        @click="viewReport"
      >
        <template #actions>
          <!-- Actions vides car le bouton est maintenant dans le header -->
        </template>

        <template #content>
          <!-- Informations du rapport disponible -->
          <div v-if="hasReport && lastReportVersion">
            <p class="text-xs text-gray-700">
              {{ formatVersionInfo(lastReportVersion) }}
            </p>
          </div>
          <!-- Message quand pas de rapport disponible -->
          <div v-else>
            <p class="text-xs text-gray-600">Aucun rapport d'audit uploadé pour le moment</p>
          </div>
        </template>
      </AuditStepCard>

      <!-- Card 2: Score global -->
      <AuditStepCard
        title="Score global"
        :state="hasGlobalScore ? 'success' : 'warning'"
        icon-success="i-lucide-target"
        icon-warning="i-lucide-target"
        label-success="Attribué"
        label-warning="Non attribué"
        color-scheme="green"
        :clickable="true"
        clickable-text="Cliquer pour gérer la notation"
        @click="showScoreViewer = true"
      >
        <template #content>
          <div
            v-if="hasGlobalScore"
            class="space-y-2"
          >
            <div class="text-2xl font-bold text-green-600">{{ globalScore }}%</div>
            <UBadge
              :color="globalScore >= 80 ? 'success' : globalScore >= 60 ? 'warning' : 'error'"
              variant="soft"
              size="xs"
            >
              {{
                globalScore >= 80 ? 'Excellent' : globalScore >= 60 ? 'Satisfaisant' : 'À améliorer'
              }}
            </UBadge>
          </div>
          <div v-else>
            <p class="text-xs text-gray-600">Le score sera attribué lors de l'upload du rapport</p>
          </div>
        </template>
      </AuditStepCard>
    </div>

    <!-- Message d'alerte si étape incomplète -->
    <UAlert
      v-if="auditStatus === AuditStatus.PENDING_REPORT && incompleteMessage"
      :icon="stepStatusBadge.icon"
      :color="stepStatusBadge.color"
      variant="soft"
      :title="incompleteMessage"
      class="mt-4"
    />

    <!-- DocumentViewer pour consulter les rapports d'audit -->
    <DocumentViewer
      :audit="currentAudit!"
      :audit-document-type="AuditDocumentType.REPORT"
      v-model:open="showDocumentViewer"
    />

    <!-- AuditScoreViewer pour gérer la notation RSE -->
    <AuditScoreViewer
      v-if="currentAudit"
      :audit="currentAudit"
      v-model:open="showScoreViewer"
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

// État pour le DocumentViewer
const showDocumentViewer = ref(false)

// État pour le AuditScoreViewer
const showScoreViewer = ref(false)

// Computed depuis currentAudit
const globalScore = computed(() => currentAudit.value?.globalScore ?? null)
const hasGlobalScore = computed(() => globalScore.value !== null && globalScore.value !== undefined)
const auditStatus = computed(() => currentAudit.value?.status ?? null)

// Dernière version du rapport depuis l'audit (pas d'appel API séparé)
const lastReportVersion = computed(() => {
  return currentAudit.value?.lastDocumentVersions?.REPORT ?? null
})

// Computed
const hasReport = computed(() => {
  return lastReportVersion.value !== null
})

const canUploadReport = computed(() => {
  // OE peut uploader si PENDING_REPORT et pas de rapport et audit modifiable
  return (
    user.value?.role === Role.OE &&
    auditStatus.value === AuditStatus.PENDING_REPORT &&
    !hasReport.value &&
    isAuditEditable.value
  )
})

const canModifyReport = computed(() => {
  // OE peut modifier le rapport tant que l'audit n'est pas terminé
  return user.value?.role === Role.OE && hasReport.value && isAuditEditable.value
})

// Computed pour déterminer si l'étape rapport est complète
const isReportStepComplete = computed(() => {
  return hasReport.value && hasGlobalScore.value
})

// Computed pour identifier les éléments manquants
const missingItems = computed(() => {
  const missing: string[] = []
  if (!hasReport.value) missing.push("rapport d'audit")
  if (!hasGlobalScore.value) missing.push('score global')
  return missing
})

// Computed pour le message d'alerte
const incompleteMessage = computed(() => {
  if (isReportStepComplete.value) return null

  const missing = missingItems.value
  if (missing.length === 2) {
    return "Pour finaliser l'étape du rapport, veuillez uploader le rapport d'audit et saisir le score global"
  }
  if (missing.includes("rapport d'audit")) {
    return "Pour finaliser l'étape du rapport, veuillez également uploader le rapport d'audit"
  }
  return "Pour finaliser l'étape du rapport, veuillez également saisir le score global"
})

// Computed pour le statut du badge
const stepStatusBadge = computed(() => {
  if (isReportStepComplete.value) {
    return {
      label: 'Complet',
      color: 'success' as const,
      icon: 'i-lucide-check-circle',
    }
  }
  return {
    label: 'Incomplet',
    color: 'warning' as const,
    icon: 'i-lucide-alert-circle',
  }
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
  return `Transmis le ${formattedDate} par ${uploaderName}`
}

function viewReport() {
  showDocumentViewer.value = true
}

async function handleReportUploaded() {
  // Recharger l'audit pour mettre à jour lastDocumentVersions
  if (currentAudit.value) {
    await fetchAudit(currentAudit.value.id)
  }
}
</script>
