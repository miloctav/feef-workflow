<template>
  <div class="bg-gray-50 rounded-b-lg p-6 min-h-[300px]">
    <div class="flex items-start gap-4 mb-6">
      <UIcon name="i-lucide-search" class="w-6 h-6 text-primary mt-1" />
      <div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Phase d'audit</h3>
        <p class="text-gray-600 text-sm">Suivi de l'audit réalisé par l'Organisme Évaluateur</p>
      </div>
    </div>

    <div class="space-y-8">
      <!-- Section 0: Informations d'audit -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-clipboard-check" class="w-5 h-5 text-purple-600" />
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
                <p class="text-xs text-blue-800">Partagés le : {{ formatDate(currentEntity?.documentaryReviewReadyAt) }}</p>
                <p class="text-xs text-gray-600">{{ pendingDocumentsCount }} docs en demande</p>
              </div>

              <div v-else>
                <p class="text-xs text-orange-700">{{ pendingDocumentsCount }} docs à transmettre</p>
                <p class="text-xs text-gray-500">Transmission en cours</p>
              </div>

              <!-- Date limite de dépôt visible uniquement si dates planifiées existent -->
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
            :state="!documentsTransmitted ? 'pending' : planAuditAvailable ? 'success' : 'warning'"
            :disabled="!documentsTransmitted"
            icon-pending="i-lucide-file-plus"
            icon-success="i-lucide-file-check"
            icon-warning="i-lucide-file-plus"
            label-pending="À uploader"
            label-success="Disponible"
            label-warning="À uploader"
            color-scheme="blue"
            :clickable="planAuditAvailable"
            clickable-text="Cliquer pour consulter le plan"
            @click="viewAuditPlan"
          >
            <template #actions>
              <!-- Bouton pour uploader le plan (OE seulement, uniquement si pas de plan disponible) -->
              <div v-if="user?.role === Role.OE && documentsTransmitted && currentAudit && !planAuditAvailable">
                <AuditPlanModal
                  :audit-id="currentAudit.id"
                  @uploaded="handlePlanUploaded"
                />
              </div>
            </template>

            <template #content>
              <!-- Informations du plan d'audit disponible -->
              <div v-if="planAuditAvailable && auditPlanVersion">
                <div class="mb-2">
                  <p class="text-xs font-medium text-gray-900">Plan disponible</p>
                  <p class="text-xs text-gray-700">
                    {{ formatDate(auditPlanVersion.uploadAt) }}
                  </p>
                </div>
              </div>
              <!-- Message quand pas de plan disponible -->
              <div v-else-if="!planAuditAvailable && documentsTransmitted">
                <p class="text-xs text-gray-600">
                  Aucun plan d'audit uploadé pour le moment
                </p>
              </div>
            </template>
          </AuditStepCard>

          <!-- Card 3: Dates d'audit -->
          <AuditStepCard
            title="Dates d'audit"
            :state="!documentsTransmitted ? 'pending' : plannedDatesSet ? 'success' : 'warning'"
            :disabled="!documentsTransmitted"
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
              <div v-if="(user?.role === Role.OE || user?.role === Role.FEEF) && documentsTransmitted && currentAudit && !plannedDatesSet">
                <AuditDatesModal
                  :audit-id="currentAudit.id"
                  :initial-planned-start-date="currentAudit.plannedStartDate"
                  :initial-planned-end-date="currentAudit.plannedEndDate"
                  :initial-actual-start-date="currentAudit.actualStartDate"
                  :initial-actual-end-date="currentAudit.actualEndDate"
                  @saved="handleDatesSaved"
                />
              </div>
            </template>

            <template #content>
              <!-- Affichage des dates programmées -->
              <div v-if="plannedDatesSet && currentAudit">
                <!-- Dates prévisionnelles -->
                <div class="mb-3">
                  <p class="text-xs font-semibold text-gray-900 mb-1">Dates prévisionnelles</p>
                  <p class="text-xs text-gray-700">
                    📅 {{ formatDate(currentAudit.plannedStartDate) }} - {{ formatDate(currentAudit.plannedEndDate) }}
                  </p>
                </div>

                <!-- Dates réelles (si l'audit est terminé) -->
                <div v-if="auditCompleted" class="mb-3 p-2 bg-green-50 rounded">
                  <p class="text-xs font-semibold text-green-900 mb-1">Dates réelles</p>
                  <p class="text-xs text-green-700">
                    ✅ {{ formatDate(currentAudit.actualStartDate) }} - {{ formatDate(currentAudit.actualEndDate) }}
                  </p>
                  <UBadge color="success" size="xs" class="mt-1">Audit terminé</UBadge>
                </div>

                <!-- Bouton pour modifier les dates -->
                <div v-if="user?.role === Role.OE || user?.role === Role.FEEF" class="mt-2">
                  <AuditDatesModal
                    :audit-id="currentAudit.id"
                    :initial-planned-start-date="currentAudit.plannedStartDate"
                    :initial-planned-end-date="currentAudit.plannedEndDate"
                    :initial-actual-start-date="currentAudit.actualStartDate"
                    :initial-actual-end-date="currentAudit.actualEndDate"
                    @saved="handleDatesSaved"
                  />
                </div>
              </div>
            </template>
          </AuditStepCard>

        </div>
      </UCard>

      <!-- DocumentViewer pour consulter les documents d'audit -->
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
import { Role } from '#shared/types/roles'

// Composables
const { currentAudit, fetchAudit } = useAudits()
const { documentVersions, fetchDocumentVersions } = useDocumentVersions()
const { documentaryReviews, fetchDocumentaryReviews } = useDocumentaryReviews()
const { currentEntity, fetchEntity } = useEntities()
const { user } = useAuth()

// État pour le DocumentViewer
const showDocumentViewer = ref(false)

// Computed: Documents transmis
const documentsTransmitted = computed(() => {
  return currentEntity.value?.documentaryReviewReadyAt !== null
})

// Computed: Nombre de documents en demande (ou manquants)
const pendingDocumentsCount = computed(() => {
  if (!documentaryReviews.value) return 0

  // Compter les documents qui ont une version fantôme (askedBy renseigné, s3Key null)
  let count = 0
  for (const review of documentaryReviews.value) {
    // TODO: Implémenter la logique pour vérifier si un document a une demande pendante
    // Pour l'instant, retourner 0
  }
  return count
})

// Computed: Plan d'audit disponible
const planAuditAvailable = computed(() => {
  if (!currentAudit.value) return false

  // Vérifier si un document de type PLAN existe pour cet audit
  return auditPlanVersion.value !== null
})

// Computed: Version du plan d'audit
const auditPlanVersion = computed(() => {
  if (!documentVersions.value || documentVersions.value.length === 0) return null

  // Trouver le document de type PLAN (vérifier si la propriété existe)
  return documentVersions.value.find(v => 
    'auditDocumentType' in v && v.auditDocumentType === AuditDocumentType.PLAN
  ) || null
})


// Computed: Dates prévisionnelles renseignées
const plannedDatesSet = computed(() => {
  return currentAudit.value?.plannedStartDate && currentAudit.value?.plannedEndDate
})

// Computed: Audit terminé (dates réelles différentes des dates prévisionnelles)
const auditCompleted = computed(() => {
  if (!currentAudit.value) return false

  // L'audit est terminé si les dates réelles sont renseignées
  // (elles sont initialisées avec les dates prévisionnelles, mais on considère terminé dès qu'elles existent)
  return currentAudit.value.actualStartDate && currentAudit.value.actualEndDate
})

// Computed: Date limite de dépôt (15 jours avant la date de début réelle ou prévue)
const depositDeadline = computed(() => {
  if (!currentAudit.value) return null

  // Utiliser la date réelle si elle existe, sinon la date prévisionnelle
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
    year: 'numeric'
  })
}

// Fonction pour ouvrir le plan d'audit dans le DocumentViewer
async function viewAuditPlan() {
  if (!currentAudit.value) return

  // Ouvrir le DocumentViewer qui se chargera de fetcher les versions
  showDocumentViewer.value = true
}

// Handlers pour les événements des modals
async function handlePlanUploaded(version: any) {
  console.log('Plan d\'audit uploadé:', version)
  // Rafraîchir les versions de documents pour cet audit (uniquement le PLAN)
  if (currentAudit.value) {
    await fetchDocumentVersions(currentAudit.value.id, 'audit', AuditDocumentType.PLAN)
  }
}

async function handleDatesSaved(dates: any) {
  console.log('Dates d\'audit sauvegardées:', dates)
  // Rafraîchir l'audit pour avoir les nouvelles dates
  if (currentAudit.value) {
    await fetchAudit(currentAudit.value.id)
  }
}

// Charger les versions du plan au montage pour vérifier s'il existe
onMounted(async () => {
  if (currentAudit.value) {
    // Charger uniquement les versions du PLAN pour savoir si un plan existe
    await fetchDocumentVersions(currentAudit.value.id, 'audit', AuditDocumentType.PLAN)
  }
})

// Watcher sur currentAudit pour recharger les versions si l'audit change
watch(currentAudit, async (newAudit) => {
  if (newAudit) {
    await fetchDocumentVersions(newAudit.id, 'audit', AuditDocumentType.PLAN)
  }
})

// Watcher sur showDocumentViewer pour recharger les versions quand le viewer se ferme
watch(showDocumentViewer, async (isOpen) => {
  // Quand le viewer se ferme, recharger les versions pour l'AuditTab
  if (!isOpen && currentAudit.value) {
    await fetchDocumentVersions(currentAudit.value.id, 'audit', AuditDocumentType.PLAN)
  }
})
</script>
