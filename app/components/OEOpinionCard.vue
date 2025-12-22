<template>
  <UCard class="mb-6">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-shield-check" class="w-5 h-5 text-purple-600" />
        <h4 class="font-semibold">Avis de l'Organisme Évaluateur</h4>
      </div>
    </template>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Card 1: Document d'avis (maintenant en premier, 50%) -->
      <AuditStepCard
        class="md:col-span-1"
        title="Document d'avis"
        :state="hasDocument ? 'success' : 'warning'"
        icon-success="i-lucide-file-check"
        icon-warning="i-lucide-file-x"
        label-success="Disponible"
        label-warning="À uploader"
        color-scheme="gray"
        :clickable="hasDocument || canEditOpinion"
        :clickable-text="hasDocument ? 'Cliquer pour consulter le document' : 'Cliquer pour importer un document'"
        @click="viewDocument"
      >
        <template #content>
          <div v-if="hasDocument && lastDocumentVersion">
            <p class="text-xs text-gray-700">
              {{ formatVersionInfo(lastDocumentVersion) }}
            </p>
          </div>
          <div v-else>
            <p class="text-xs text-gray-600">
              Le document sera uploadé avec l'avis
            </p>
          </div>
        </template>
      </AuditStepCard>

      <!-- Card 2: Avis OE (maintenant en second, 50%, cliquable) -->
      <AuditStepCard
        class="md:col-span-1"
        title="Avis OE"
        :state="opinionState"
        icon-success="i-lucide-check-circle"
        :icon-warning="hasOpinion ? 'i-lucide-alert-triangle' : 'i-lucide-file-pen'"
        icon-error="i-lucide-x-circle"
        icon-pending="i-lucide-clock"
        :label-success="opinionLabel"
        :label-warning="hasOpinion ? opinionLabel : 'À émettre'"
        :label-error="opinionLabel"
        label-pending="En attente"
        color-scheme="gray"
        :clickable="true"
        :clickable-text="canEditOpinion ? 'Cliquer pour émettre/modifier l\'avis' : 'Cliquer pour consulter l\'avis'"
        @click="showOpinionViewer = true"
      >
        <template #content>
          <div v-if="hasOpinion">
            <p class="text-xs text-gray-700">
              Transmis le {{ formatDate(transmittedAt) }}
            </p>
            <p class="text-xs text-gray-600 mt-1" v-if="transmittedByAccount">
              Par {{ transmittedByAccount.firstname }} {{ transmittedByAccount.lastname }}
            </p>
          </div>
          <div v-else>
            <p class="text-xs text-gray-600">
              {{ canEditOpinion ? 'Prêt à émettre l\'avis' : 'En attente de l\'avis de l\'OE' }}
            </p>
          </div>
        </template>
      </AuditStepCard>
    </div>

    <!-- DocumentViewer pour consulter le document d'avis -->
    <DocumentViewer
      :audit="currentAudit!"
      :audit-document-type="AuditDocumentType.OE_OPINION"
      v-model:open="showDocumentViewer"
    />

    <!-- OEOpinionViewer pour gérer l'avis -->
    <OEOpinionViewer
      v-if="currentAudit"
      :audit="currentAudit"
      v-model:open="showOpinionViewer"
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

// État local
const showDocumentViewer = ref(false)
const showOpinionViewer = ref(false)

// Récupérer les événements de l'audit via le composable
const {
  oeOpinionTransmittedAt,
  oeOpinionTransmittedByAccount,
} = useAuditEvents(computed(() => currentAudit.value?.id))

// Computed depuis currentAudit
const opinion = computed(() => currentAudit.value?.oeOpinion ?? null)
const transmittedAt = computed(() => oeOpinionTransmittedAt.value ?? null)
const transmittedByAccount = computed(() => oeOpinionTransmittedByAccount.value ?? null)
const auditStatus = computed(() => currentAudit.value?.status ?? null)

// Dernière version du document d'avis
const lastDocumentVersion = computed(() => {
  return currentAudit.value?.lastDocumentVersions?.OE_OPINION ?? null
})

// Computed
const hasOpinion = computed(() => {
  return opinion.value !== null && opinion.value !== undefined
})

const opinionState = computed(() => {
  if (!hasOpinion.value) {
    return canEditOpinion.value ? 'warning' : 'pending'
  }
  if (opinion.value === 'FAVORABLE') return 'success'
  if (opinion.value === 'RESERVED') return 'warning'
  if (opinion.value === 'UNFAVORABLE') return 'error'
  return 'success'
})

const hasDocument = computed(() => {
  return lastDocumentVersion.value !== null
})

const canEditOpinion = computed(() => {
  if (!isAuditEditable.value) return false

  // OE peut éditer
  if (user.value?.role === Role.OE) {
    return [AuditStatus.PENDING_OE_OPINION, AuditStatus.PENDING_FEEF_DECISION]
      .includes(auditStatus.value)
  }

  // FEEF peut aussi éditer
  if (user.value?.role === Role.FEEF) {
    return true
  }

  return false
})

const opinionLabel = computed(() => {
  if (!opinion.value) return ''
  const labels: Record<string, string> = {
    'FAVORABLE': 'Favorable',
    'UNFAVORABLE': 'Défavorable',
    'RESERVED': 'Réservé'
  }
  return labels[opinion.value] || opinion.value
})

// Méthodes
function formatDate(date: Date | string | null | undefined) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

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

function viewDocument() {
  showDocumentViewer.value = true
}
</script>
