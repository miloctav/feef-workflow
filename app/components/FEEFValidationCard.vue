<template>
  <UCard class="mb-6">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-file-badge-2"
          class="w-5 h-5 text-emerald-600"
        />
        <h4 class="font-semibold">Validation FEEF</h4>
      </div>
    </template>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Card 1: Décision FEEF -->
      <AuditStepCard
        title="Décision FEEF"
        :state="hasDecision ? 'success' : 'warning'"
        icon-success="i-lucide-check-circle"
        icon-warning="i-lucide-file-pen"
        icon-pending="i-lucide-clock"
        :label-success="decisionLabel"
        label-warning="À décider"
        label-pending="En attente"
        color-scheme="green"
      >
        <template #actions>
          <!-- Bouton pour décision FEEF -->
          <div v-if="canSubmitDecision">
            <FEEFDecisionModal
              :audit-id="currentAudit!.id"
              @submitted="handleDecisionSubmitted"
            />
          </div>
        </template>

        <template #content>
          <div v-if="hasDecision">
            <p class="text-xs text-gray-700">Décidé le {{ formatDate(decisionAt) }}</p>
            <p
              class="text-xs text-gray-600 mt-1"
              v-if="decisionByAccount"
            >
              Par {{ decisionByAccount.firstname }} {{ decisionByAccount.lastname }}
            </p>
          </div>
          <div v-else>
            <p class="text-xs text-gray-600">
              {{ canSubmitDecision ? 'Prêt à décider' : "En attente de l'avis OE" }}
            </p>
          </div>
        </template>
      </AuditStepCard>

      <!-- Card 2: Résultat -->
      <AuditStepCard
        title="Résultat"
        :state="hasDecision ? (feefDecision === 'ACCEPTED' ? 'success' : 'warning') : 'disabled'"
        icon-success="i-lucide-award"
        icon-warning="i-lucide-x-circle"
        icon-disabled="i-lucide-lock"
        :label-success="feefDecision === 'ACCEPTED' ? 'Labellisé' : 'Refusé'"
        label-warning="Refusé"
        label-disabled="En attente de décision"
        color-scheme="green"
        :clickable="hasDecision && feefDecision === 'ACCEPTED' && hasAttestation"
        clickable-text="Cliquer pour voir l'attestation"
        @click="handleResultCardClick"
      >
        <template #actions>
          <!-- Modal pour générer/régénérer l'attestation -->
          <div
            v-if="canGenerateOrRegenerateAttestation"
            @click.stop
          >
            <GenerateAttestationModal
              :audit-id="currentAudit!.id"
              :has-attestation="hasAttestation"
              @generated="handleAttestationGenerated"
            />
          </div>
        </template>

        <template #content>
          <div v-if="hasDecision">
            <div v-if="feefDecision === 'ACCEPTED'">
              <p class="text-xs text-green-700">L'entité est labellisée FEEF</p>
              <p
                v-if="labelExpirationDate"
                class="text-xs text-green-600 mt-1"
              >
                Jusqu'au {{ formatDate(labelExpirationDate) }}
              </p>
              <p
                v-if="!hasAttestation"
                class="text-xs text-orange-600 mt-2 font-medium"
              >
                ⚠️ Attestation non générée - Cliquez sur "Générer l'attestation"
              </p>
            </div>
            <div v-else>
              <p class="text-xs text-red-700">La demande a été refusée</p>
            </div>
          </div>
          <div v-else>
            <p class="text-xs text-gray-600">Le résultat sera disponible après la décision</p>
          </div>
        </template>
      </AuditStepCard>
    </div>

    <!-- DocumentViewer pour l'attestation -->
    <DocumentViewer
      v-if="currentAudit"
      :audit="currentAudit"
      :audit-document-type="AuditDocumentType.ATTESTATION"
      v-model:open="showAttestationViewer"
      :can-upload="false"
    />
  </UCard>
</template>

<script setup lang="ts">
import { Role } from '#shared/types/roles'
import { AuditStatus } from '#shared/types/enums'
import { AuditDocumentType } from '~/types/auditDocuments'

const { user } = useAuth()
const { currentAudit, fetchAudit } = useAudits()
const toast = useToast()

// Inject isAuditEditable from parent (DecisionTab)
const isAuditEditable = inject<Ref<boolean>>('isAuditEditable', ref(true))

// État pour DocumentViewer
const showAttestationViewer = ref(false)

// Récupérer les événements de l'audit via le composable
const { feefDecisionAt, feefDecisionByAccount } = useAuditEvents(
  computed(() => currentAudit.value?.id)
)

// Computed depuis currentAudit
const feefDecision = computed(() => currentAudit.value?.feefDecision ?? null)
const decisionAt = computed(() => feefDecisionAt.value ?? null)
const decisionByAccount = computed(() => feefDecisionByAccount.value ?? null)
const labelExpirationDate = computed(() => currentAudit.value?.labelExpirationDate ?? null)
const auditStatus = computed(() => currentAudit.value?.status ?? null)

// Computed: Attestation disponible
const hasAttestation = computed(() => {
  return !!currentAudit.value?.lastDocumentVersions?.ATTESTATION
})

// Computed
const hasDecision = computed(() => {
  return (
    feefDecision.value !== null &&
    feefDecision.value !== undefined &&
    feefDecision.value !== 'PENDING'
  )
})

const canSubmitDecision = computed(() => {
  // La FEEF peut prendre la décision si PENDING_FEEF_DECISION et audit modifiable
  return (
    user.value?.role === Role.FEEF &&
    auditStatus.value === AuditStatus.PENDING_FEEF_DECISION &&
    !hasDecision.value &&
    isAuditEditable.value
  )
})

// Bouton "Générer" ou "Régénérer" selon si attestation existe
const canGenerateOrRegenerateAttestation = computed(() => {
  return (
    user.value?.role === Role.FEEF && hasDecision.value && feefDecision.value === 'ACCEPTED'
    // S'affiche toujours après décision ACCEPTED (attestation existe ou non)
  )
})

const decisionLabel = computed(() => {
  if (!feefDecision.value) return ''
  const labels: Record<string, string> = {
    PENDING: 'En attente',
    ACCEPTED: 'Acceptée',
    REJECTED: 'Refusée',
  }
  return labels[feefDecision.value] || feefDecision.value
})

// Méthodes
function formatDate(date: Date | string | null | undefined) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

async function handleDecisionSubmitted() {
  if (currentAudit.value) {
    await fetchAudit(currentAudit.value.id)
  }
}

// Méthode pour ouvrir l'attestation au clic sur la carte
function handleResultCardClick() {
  console.log('handleResultCardClick appelé')
  console.log('hasDecision:', hasDecision.value)
  console.log('feefDecision:', feefDecision.value)
  console.log('hasAttestation:', hasAttestation.value)

  if (hasDecision.value && feefDecision.value === 'ACCEPTED' && hasAttestation.value) {
    console.log('Ouverture du DocumentViewer')
    showAttestationViewer.value = true
  } else {
    console.log('Conditions non remplies pour ouvrir le DocumentViewer')
  }
}

// Méthode appelée après génération/régénération réussie
async function handleAttestationGenerated() {
  if (currentAudit.value) {
    await fetchAudit(currentAudit.value.id)
  }
}
</script>
