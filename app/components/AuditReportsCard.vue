<template>
  <UCard class="mb-6">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-file-chart-column" class="w-5 h-5 text-purple-600" />
          <h4 class="font-semibold">Rapports d'audit</h4>
        </div>
        
        <!-- Bouton pour uploader/modifier le rapport dans le header -->
        <div v-if="canUploadReport || canModifyReport" class="ml-auto">
          <AuditReportModal
            :audit-id="currentAudit!.id"
            :has-existing-report="hasReport"
            @uploaded="handleReportUploaded"
          />
        </div>
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
        :clickable-text="hasReport ? 'Cliquer pour consulter le rapport' : 'Cliquer pour importer un rapport'"
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
            <p class="text-xs text-gray-600">
              Aucun rapport d'audit uploadé pour le moment
            </p>
          </div>
        </template>
      </AuditStepCard>

      <!-- Card 2: Score global -->
      <AuditStepCard
        title="Score global"
        :state="score !== null && score !== undefined ? 'success' : 'warning'"
        icon-success="i-lucide-target"
        icon-warning="i-lucide-target"
        label-success="Attribué"
        label-warning="Non attribué"
        color-scheme="blue"
      >
        <template #content>
          <div v-if="score !== null && score !== undefined" class="space-y-2">
            <div class="text-2xl font-bold text-green-600">
              {{ score }}%
            </div>
            <UBadge
              :color="score >= 80 ? 'success' :
                     score >= 60 ? 'warning' : 'error'"
              variant="soft"
              size="xs"
            >
              {{ score >= 80 ? 'Excellent' :
                 score >= 60 ? 'Satisfaisant' : 'À améliorer' }}
            </UBadge>
          </div>
          <div v-else>
            <p class="text-xs text-gray-600">
              Le score sera attribué lors de l'upload du rapport
            </p>
          </div>
        </template>
      </AuditStepCard>
    </div>

    <!-- DocumentViewer pour consulter les rapports d'audit -->
    <DocumentViewer
      :audit="currentAudit!"
      :audit-document-type="AuditDocumentType.REPORT"
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

// État pour le DocumentViewer
const showDocumentViewer = ref(false)

// Computed depuis currentAudit
const score = computed(() => currentAudit.value?.score ?? null)
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
  return user.value?.role === Role.OE && auditStatus.value === AuditStatus.PENDING_REPORT && !hasReport.value && isAuditEditable.value
})

const canModifyReport = computed(() => {
  // OE peut modifier le rapport tant que l'audit n'est pas terminé
  return user.value?.role === Role.OE &&
    hasReport.value &&
    isAuditEditable.value
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
