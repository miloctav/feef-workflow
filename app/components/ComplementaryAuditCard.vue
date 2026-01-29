<template>
  <UCard class="mb-6">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-calendar-plus"
            class="w-5 h-5 text-orange-500"
          />
          <h4 class="font-semibold">Audit complémentaire (Phase 2)</h4>
        </div>
        <UBadge
          :color="statusColor"
          variant="soft"
        >
          {{ statusLabel }}
        </UBadge>
      </div>
    </template>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Card 1: Dates de l'audit complémentaire -->
      <AuditStepCard
        title="Dates de l'audit"
        :state="hasDates ? 'success' : 'warning'"
        icon-success="i-lucide-calendar-check"
        icon-warning="i-lucide-calendar"
        label-success="Dates définies"
        label-warning="À définir"
        color-scheme="blue"
        :clickable="canEditDates"
        :clickable-text="hasDates ? 'Modifier les dates' : 'Définir les dates'"
        @click="showDateModal = true"
      >
        <template #content>
          <div v-if="hasDates">
            <p class="text-xs text-gray-700">
              Du {{ formatDate(currentAudit?.complementaryStartDate) }} au
              {{ formatDate(currentAudit?.complementaryEndDate) }}
            </p>
          </div>
          <div v-else>
            <p class="text-xs text-gray-600">Définissez les dates de l'audit complémentaire</p>
          </div>
        </template>
      </AuditStepCard>

      <!-- Card 2: Rapport complémentaire -->
      <AuditStepCard
        title="Rapport complémentaire"
        :state="hasReport ? 'success' : hasDates ? 'warning' : 'disabled'"
        icon-success="i-lucide-file-check"
        icon-warning="i-lucide-file-x"
        icon-disabled="i-lucide-lock"
        label-success="Disponible"
        label-warning="À uploader"
        label-disabled="En attente des dates"
        color-scheme="purple"
        :clickable="hasReport || canUploadReport"
        :clickable-text="hasReport ? 'Consulter le rapport' : 'Importer un rapport'"
        @click="viewReport"
      >
        <template #content>
          <div v-if="hasReport && lastReportVersion">
            <p class="text-xs text-gray-700">
              {{ formatVersionInfo(lastReportVersion) }}
            </p>
          </div>
          <div v-else-if="hasDates">
            <p class="text-xs text-gray-600">Uploadez le rapport de l'audit complémentaire</p>
          </div>
          <div v-else>
            <p class="text-xs text-gray-600">En attente de la définition des dates</p>
          </div>
        </template>
      </AuditStepCard>

      <!-- Card 3: Score global phase 2 -->
      <AuditStepCard
        title="Score global phase 2"
        :state="hasScore ? 'success' : hasReport ? 'warning' : 'disabled'"
        icon-success="i-lucide-target"
        icon-warning="i-lucide-target"
        icon-disabled="i-lucide-lock"
        label-success="Attribué"
        label-warning="Non attribué"
        label-disabled="En attente du rapport"
        color-scheme="green"
        :clickable="canEditScore || hasScore"
        :clickable-text="hasScore ? 'Modifier le score' : 'Saisir le score'"
        @click="showScoreViewer = true"
      >
        <template #content>
          <div v-if="hasScore">
            <div class="text-2xl font-bold text-green-600">
              {{ currentAudit?.complementaryGlobalScore }}%
            </div>
            <p class="text-xs text-gray-600 mt-1">
              {{ getScoreComment(currentAudit?.complementaryGlobalScore) }}
            </p>
          </div>
          <div v-else-if="hasReport">
            <p class="text-xs text-gray-600">Saisissez le score de l'audit complémentaire</p>
          </div>
          <div v-else>
            <p class="text-xs text-gray-600">En attente du rapport complémentaire</p>
          </div>
        </template>
      </AuditStepCard>
    </div>

    <!-- Modal de définition des dates (RÉUTILISE AuditDatesModal.vue) -->
    <AuditDatesModal
      v-if="currentAudit?.id"
      :audit-id="currentAudit.id"
      mode="phase2"
      :initial-complementary-start-date="currentAudit.complementaryStartDate"
      :initial-complementary-end-date="currentAudit.complementaryEndDate"
      :show-trigger-button="false"
      v-model:open="showDateModal"
      @saved="handleDatesSaved"
    />

    <!-- DocumentViewer pour consulter le rapport complémentaire -->
    <DocumentViewer
      v-if="currentAudit?.id"
      :audit="currentAudit"
      :audit-document-type="AuditDocumentType.REPORT"
      :phase="AuditPhase.PHASE_2"
      v-model:open="showDocumentViewer"
    />

    <!-- AuditScoreViewer pour gérer la notation phase 2 -->
    <AuditScoreViewer
      v-if="currentAudit?.id"
      :audit="currentAudit"
      :initial-phase="AuditPhase.PHASE_2"
      v-model:open="showScoreViewer"
    />
  </UCard>
</template>

<script setup lang="ts">
import { Role } from '#shared/types/roles'
import { AuditStatus, AuditPhase } from '#shared/types/enums'
import { AuditDocumentType } from '~~/app/types/auditDocuments'

const { user } = useAuth()
const { currentAudit, fetchAudit } = useAudits()

// Inject isAuditEditable from parent
const isAuditEditable = inject<Ref<boolean>>('isAuditEditable', ref(true))

// Composables
const { triggerActionRefresh } = useActionRefresh()

// État local
const showDateModal = ref(false)
const showDocumentViewer = ref(false)
const showScoreViewer = ref(false)

// ===== CARD 1: DATES =====

const hasDates = computed(() => {
  return (
    currentAudit.value?.complementaryStartDate !== null &&
    currentAudit.value?.complementaryEndDate !== null
  )
})

const canEditDates = computed(() => {
  return (
    (user.value?.role === Role.OE ||
      user.value?.role === Role.AUDITOR ||
      user.value?.role === Role.FEEF) &&
    currentAudit.value?.status === AuditStatus.PENDING_COMPLEMENTARY_AUDIT &&
    isAuditEditable.value
  )
})

function handleDatesSaved() {
  if (!currentAudit.value) return
  fetchAudit(currentAudit.value.id)
  triggerActionRefresh({
    auditId: currentAudit.value.id.toString(),
    entityId: currentAudit.value.entityId.toString(),
  })
}

// ===== CARD 2: RAPPORT =====

const lastReportVersion = computed(() => {
  // Récupérer le dernier rapport uploadé pour cet audit
  // On utilise le type REPORT (pas de COMPLEMENTARY_REPORT distinct)
  return currentAudit.value?.lastDocumentVersions?.REPORT ?? null
})

const hasReport = computed(() => {
  return lastReportVersion.value !== null
})

const canUploadReport = computed(() => {
  return (
    (user.value?.role === Role.OE ||
      user.value?.role === Role.AUDITOR ||
      user.value?.role === Role.FEEF) &&
    currentAudit.value?.status === AuditStatus.PENDING_COMPLEMENTARY_AUDIT &&
    hasDates.value &&
    isAuditEditable.value
  )
})

function viewReport() {
  showDocumentViewer.value = true
}

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

// ===== CARD 3: SCORE =====

const hasScore = computed(() => {
  return currentAudit.value?.complementaryGlobalScore !== null
})

const canEditScore = computed(() => {
  return (
    (user.value?.role === Role.OE ||
      user.value?.role === Role.AUDITOR ||
      user.value?.role === Role.FEEF) &&
    currentAudit.value?.status === AuditStatus.PENDING_COMPLEMENTARY_AUDIT &&
    hasReport.value &&
    isAuditEditable.value
  )
})

function getScoreComment(score: number | null | undefined): string {
  if (score === null || score === undefined) return ''
  if (score >= 85) return 'Excellent'
  if (score >= 65) return 'Satisfaisant'
  if (score >= 50) return 'À améliorer'
  return 'Insuffisant'
}

// ===== BADGE STATUS =====

const statusLabel = computed(() => {
  if (hasScore.value) return 'Phase 2 complète'
  if (hasReport.value) return 'En attente du score'
  if (hasDates.value) return 'En attente du rapport'
  return 'En attente des dates'
})

const statusColor = computed(() => {
  if (hasScore.value) return 'success'
  if (hasReport.value || hasDates.value) return 'warning'
  return 'info'
})

// ===== COMPARAISON PHASE 1 VS PHASE 2 =====

const scoreDifference = computed(() => {
  if (
    currentAudit.value?.globalScore === null ||
    currentAudit.value?.complementaryGlobalScore === null
  ) {
    return null
  }
  return currentAudit.value.complementaryGlobalScore - currentAudit.value.globalScore
})

// ===== HELPERS =====

function formatDate(date: string | null | undefined) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
</script>
