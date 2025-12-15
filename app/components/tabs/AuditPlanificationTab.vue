<template>
  <div class="bg-gray-50 rounded-b-lg p-6 min-h-[300px]">
    <div class="flex items-start gap-4 mb-6">
      <UIcon
        name="i-lucide-search"
        class="w-6 h-6 text-primary mt-1"
      />
      <div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Phase d'audit</h3>
        <p class="text-gray-600 text-sm">Suivi de l'audit réalisé par l'Organisme Évaluateur</p>
      </div>
    </div>

    <!-- Section acceptation OE (si PENDING_OE_ACCEPTANCE) -->
    <UCard
      v-if="currentAudit?.status === AuditStatus.PENDING_OE_ACCEPTANCE"
      class="mb-6"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-alert-circle"
            class="w-5 h-5 text-orange-500"
          />
          <h4 class="font-semibold">Acceptation de l'audit</h4>
        </div>
      </template>

      <div class="space-y-4">
        <!-- Message pour l'OE -->
        <template v-if="user?.role === Role.OE">
          <UAlert
            color="orange"
            variant="soft"
            title="Action requise"
            description="Vous devez indiquer si vous acceptez ou refusez d'effectuer cet audit avant de pouvoir le planifier."
          />

          <div class="flex justify-end">
            <OEResponseModal
              :audit-id="currentAudit.id"
              @success="handleOEResponseSuccess"
            />
          </div>
        </template>

        <!-- Message pour ENTITY et FEEF -->
        <template v-else>
          <UAlert
            color="info"
            variant="soft"
            title="En attente de l'acceptation de l'OE"
            description="L'organisme évaluateur doit accepter ou refuser cet audit avant de pouvoir continuer."
          />
        </template>
      </div>
    </UCard>

    <!-- Affichage si audit refusé -->
    <UCard
      v-else-if="currentAudit?.status === AuditStatus.REFUSED_BY_OE"
      class="mb-6"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-x-circle"
            class="w-5 h-5 text-red-500"
          />
          <h4 class="font-semibold">Audit refusé</h4>
        </div>
      </template>

      <div class="space-y-4">
        <UAlert
          color="red"
          variant="solid"
          title="Cet audit a été refusé par l'OE"
        />

        <div
          v-if="currentAudit.oeRefusalReason"
          class="p-4 bg-gray-50 rounded-lg"
        >
          <p class="text-sm font-semibold text-gray-900 mb-2">Raison du refus :</p>
          <p class="text-sm text-gray-700">{{ currentAudit.oeRefusalReason }}</p>
        </div>
      </div>
    </UCard>

    <div class="space-y-8">
      <!-- Section: Informations d'audit (masquée si PENDING_OE_ACCEPTANCE) -->
      <UCard v-if="currentAudit?.status !== AuditStatus.PENDING_OE_ACCEPTANCE">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-clipboard-check"
              class="w-5 h-5 text-purple-600"
            />
            <h4 class="font-semibold">Informations d'audit</h4>
          </div>
        </template>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Card 1: Transmission des documents -->
          <AuditStepCard
            title="Documents"
            :state="documentsTransmitted ? 'success' : 'warning'"
            icon-success="i-lucide-file-check"
            icon-warning="i-lucide-file-x"
            label-success="Transmis"
            label-warning="En cours"
            color-scheme="green"
          >
            <template #content>
              <div v-if="documentsTransmitted">
                <p class="text-xs text-blue-800">
                  Partagés le : {{ formatDate(currentEntity?.documentaryReviewReadyAt) }}
                </p>
              </div>
              <div v-else>
                <p class="text-xs text-orange-700">Transmission en cours</p>
              </div>

              <!-- Date limite de dépôt -->
              <div v-if="currentAudit?.plannedStartDate">
                <p class="text-xs text-red-700 font-semibold">
                  Date limite de dépôt : {{ depositDeadline }}
                </p>
              </div>
            </template>
          </AuditStepCard>

          <!-- Card 2: Plan d'audit -->
          <AuditStepCard
            title="Plan d'audit"
            :state="'warning'"
            icon-warning="i-lucide-file-plus"
            icon-success="i-lucide-file-check"
            label-warning="À consulter"
            label-success="Disponible"
            color-scheme="blue"
            :clickable="hasPlan || canUploadPlan"
            :clickable-text="
              hasPlan ? 'Cliquer pour consulter le plan' : 'Cliquer pour importer un plan'
            "
            @click="openPlanViewer"
          >
          </AuditStepCard>

          <!-- Card 3: Dates d'audit -->
          <AuditStepCard
            title="Dates d'audit"
            :state="plannedDatesSet ? 'success' : 'warning'"
            icon-pending="i-lucide-calendar-plus"
            icon-success="i-lucide-calendar-check"
            icon-warning="i-lucide-calendar-plus"
            label-pending="À programmer"
            label-success="Programmé"
            label-warning="À programmer"
            color-scheme="orange"
          >
            <template #actions>
              <!-- Bouton pour programmer les dates (OE/FEEF seulement) -->
              <div
                v-if="
                  (user?.role === Role.OE || user?.role === Role.FEEF) && currentAudit && isEditable
                "
              >
                <AuditDatesModal
                  :audit-id="currentAudit.id"
                  :initial-planned-date="currentAudit.plannedDate"
                  :initial-actual-start-date="currentAudit.actualStartDate"
                  :initial-actual-end-date="currentAudit.actualEndDate"
                  @saved="handleDatesSaved"
                />
              </div>
            </template>

            <template #content>
              <!-- Affichage des dates -->
              <div v-if="(plannedDatesSet || actualDatesSet) && currentAudit">
                <!-- Dates prévisionnelles -->
                <div
                  v-if="plannedDatesSet"
                  class="mb-3"
                >
                  <p class="text-xs font-semibold text-gray-900 mb-1">Dates prévisionnelles</p>
                  <p class="text-xs text-gray-700">
                    {{ formatDate(currentAudit.plannedStartDate) }} -
                    {{ formatDate(currentAudit.plannedEndDate) }}
                  </p>
                </div>

                <!-- Dates réelles (si elles sont renseignées) -->
                <div v-if="actualDatesSet">
                  <p class="text-xs font-semibold text-gray-900 mb-1">Dates réelles</p>
                  <p class="text-xs text-gray-700">
                    {{ formatDate(currentAudit.actualStartDate) }} -
                    {{ formatDate(currentAudit.actualEndDate) }}
                  </p>
                  <UBadge
                    v-if="auditCompleted"
                    color="success"
                    size="xs"
                    class="mt-1"
                    >Audit terminé</UBadge
                  >
                </div>
              </div>
            </template>
          </AuditStepCard>
        </div>
      </UCard>

      <!-- DocumentViewer pour consulter le plan d'audit -->
      <DocumentViewer
        v-if="currentAudit"
        :audit="currentAudit"
        :audit-document-type="AuditDocumentType.PLAN"
        v-model:open="showDocumentViewer"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { AuditDocumentType } from '~~/app/types/auditDocuments'
import { AuditStatus } from '#shared/types/enums'
import { Role } from '#shared/types/roles'

// Composables
const { currentAudit, fetchAudit } = useAudits()
const { currentEntity } = useEntities()
const { user } = useAuth()

// État pour le DocumentViewer
const showDocumentViewer = ref(false)

// Computed: Est-ce que l'audit est modifiable?
const isEditable = computed(() => {
  return currentAudit.value?.status !== AuditStatus.COMPLETED
})

// Computed: Plan d'audit disponible (depuis lastDocumentVersions)
const hasPlan = computed(() => {
  return (
    currentAudit.value?.lastDocumentVersions?.PLAN !== null &&
    currentAudit.value?.lastDocumentVersions?.PLAN !== undefined
  )
})

// Computed: OE peut uploader le plan
const canUploadPlan = computed(() => {
  return user.value?.role === Role.OE && isEditable.value
})

// Computed: Documents transmis
const documentsTransmitted = computed(() => {
  return currentEntity.value?.documentaryReviewReadyAt !== null
})

// Computed: Dates prévisionnelles renseignées
const plannedDatesSet = computed(() => {
  return currentAudit.value?.plannedStartDate && currentAudit.value?.plannedEndDate
})

// Computed: Dates réelles renseignées
const actualDatesSet = computed(() => {
  return currentAudit.value?.actualStartDate && currentAudit.value?.actualEndDate
})

// Computed: Audit terminé
const auditCompleted = computed(() => {
  return currentAudit.value?.status === AuditStatus.COMPLETED
})

// Computed: Date limite de dépôt (15 jours avant la date de début)
const depositDeadline = computed(() => {
  if (!currentAudit.value) return null

  const startDate = currentAudit.value.actualStartDate || currentAudit.value.plannedStartDate
  if (!startDate) return null

  const auditStartDate = new Date(startDate)
  const deadline = new Date(auditStartDate)
  deadline.setDate(deadline.getDate() - 15)

  return formatDate(deadline.toISOString())
})

// Fonction pour formater une date
function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return 'N/A'

  const date = new Date(dateString)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Ouvrir le DocumentViewer pour le plan d'audit
function openPlanViewer() {
  showDocumentViewer.value = true
}

// Handlers
async function handlePlanUploaded() {
  // Le DocumentViewer rechargera les versions à l'ouverture
}

async function handleDatesSaved() {
  // currentAudit est d�j� mis � jour par updateAudit() dans AuditDatesModal
  // Pas besoin de refetch l'audit, il est d�j� synchronis�
}

async function handleOEResponseSuccess() {
  // Recharger l'audit pour afficher le nouveau statut
  if (currentAudit.value?.id) {
    await fetchAudit(currentAudit.value.id)
  }
}
</script>
