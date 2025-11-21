<template>
  <UCard class="mb-6">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-shield-check" class="w-5 h-5 text-purple-600" />
          <h4 class="font-semibold">Avis de l'Organisme Évaluateur</h4>
        </div>
        
        <!-- Bouton pour émettre/modifier l'avis dans le header -->
        <div v-if="canSubmitOpinion || canModifyOpinion" class="ml-auto">
          <OEOpinionModal
            :audit-id="currentAudit!.id"
            @submitted="handleOpinionSubmitted"
          />
        </div>
      </div>
    </template>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <!-- Card 1: Avis OE (75% de largeur) -->
      <AuditStepCard
        class="md:col-span-3"
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
      >

        <template #content>
          <div v-if="hasOpinion">
            <p class="text-xs text-gray-700">
              Transmis le {{ formatDate(transmittedAt) }}
            </p>
            <p class="text-xs text-gray-600 mt-1" v-if="transmittedByAccount">
              Par {{ transmittedByAccount.firstname }} {{ transmittedByAccount.lastname }}
            </p>
            <!-- Argumentaire et Conditions côte à côte -->
            <div class="mt-2 flex gap-2">
              <!-- Argumentaire -->
              <div v-if="argumentaire" :class="['p-2 bg-gray-50 rounded border border-gray-200', opinion === 'RESERVED' && conditions ? 'flex-1' : 'w-full']">
                <p class="text-xs font-medium text-gray-700">Argumentaire :</p>
                <p class="text-xs text-gray-600 mt-1 whitespace-pre-line">{{ argumentaire }}</p>
              </div>
              <!-- Conditions si avis réservé -->
              <div v-if="opinion === 'RESERVED' && conditions" class="flex-1 p-2 bg-yellow-50 rounded border border-yellow-200">
                <p class="text-xs font-medium text-yellow-800">Conditions :</p>
                <p class="text-xs text-yellow-700 mt-1 whitespace-pre-line">{{ conditions }}</p>
              </div>
            </div>
          </div>
          <div v-else>
            <p class="text-xs text-gray-600">
              {{ canSubmitOpinion ? 'Prêt à émettre l\'avis' : 'En attente de l\'avis de l\'OE' }}
            </p>
          </div>
        </template>
      </AuditStepCard>

      <!-- Card 2: Document d'avis (25% de largeur) -->
      <AuditStepCard
        class="md:col-span-1"
        title="Document d'avis"
        :state="hasDocument ? 'success' : 'warning'"
        icon-success="i-lucide-file-check"
        icon-warning="i-lucide-file-x"
        label-success="Disponible"
        label-warning="À uploader"
        color-scheme="gray"
        :clickable="hasDocument || canSubmitOpinion"
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
    </div>

    <!-- DocumentViewer pour consulter le document d'avis -->
    <DocumentViewer
      :audit="currentAudit!"
      :audit-document-type="AuditDocumentType.OE_OPINION"
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

// État local
const showDocumentViewer = ref(false)

// Computed depuis currentAudit
const opinion = computed(() => currentAudit.value?.oeOpinion ?? null)
const argumentaire = computed(() => currentAudit.value?.oeOpinionArgumentaire ?? null)
const conditions = computed(() => (currentAudit.value as any)?.oeOpinionConditions ?? null)
const transmittedAt = computed(() => currentAudit.value?.oeOpinionTransmittedAt ?? null)
const transmittedByAccount = computed(() => (currentAudit.value as any)?.oeOpinionTransmittedByAccount ?? null)
const auditStatus = computed(() => currentAudit.value?.status ?? null)

// Dernière version du document d'avis depuis l'audit (pas d'appel API séparé)
const lastDocumentVersion = computed(() => {
  return currentAudit.value?.lastDocumentVersions?.OE_OPINION ?? null
})

// Computed
const hasOpinion = computed(() => {
  return opinion.value !== null && opinion.value !== undefined
})

const opinionState = computed(() => {
  if (!hasOpinion.value) {
    return canSubmitOpinion.value ? 'warning' : 'pending'
  }
  // Favorable = success (vert), Réservé = warning (orange), Défavorable = error (rouge)
  if (opinion.value === 'FAVORABLE') return 'success'
  if (opinion.value === 'RESERVED') return 'warning'
  if (opinion.value === 'UNFAVORABLE') return 'error'
  return 'success'
})

const hasDocument = computed(() => {
  return lastDocumentVersion.value !== null
})

const canSubmitOpinion = computed(() => {
  // L'OE peut émettre l'avis si PENDING_OE_OPINION et pas encore d'avis et audit modifiable
  return user.value?.role === Role.OE && (auditStatus.value === AuditStatus.PENDING_OE_OPINION || auditStatus.value === AuditStatus.PENDING_FEEF_DECISION) && !hasOpinion.value && isAuditEditable.value
})

const canModifyOpinion = computed(() => {
  // L'OE peut modifier l'avis tant que FEEF n'a pas pris de décision et audit modifiable
  return user.value?.role === Role.OE &&
    hasOpinion.value &&
    (auditStatus.value === AuditStatus.PENDING_OE_OPINION || auditStatus.value === AuditStatus.PENDING_FEEF_DECISION) &&
    isAuditEditable.value
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

async function handleOpinionSubmitted() {
  // Recharger l'audit pour mettre à jour lastDocumentVersions
  if (currentAudit.value) {
    await fetchAudit(currentAudit.value.id)
  }
}
</script>
