<script setup lang="ts">
import {
  ActionPlanType,
  AuditType,
  getActionPlanTypeItems,
  getAuditStatusItems,
  getAuditTypeItems,
  getFeefDecisionItems,
  getOeOpinionItems,
  MonitoringMode,
  MonitoringModeLabels,
} from '#shared/types/enums'
import type { AuditWithRelations } from '~~/app/types/audits'
import type { AuditAdminBody, AuditAdminPreviewResult } from '~~/app/composables/useAuditAdmin'

const props = defineProps<{
  audit: AuditWithRelations
  onApplied?: () => void | Promise<void>
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const { previewChange, applyChange, loading } = useAuditAdmin()
const { fetchOesForSelect } = useOes()
const { fetchAuditorsByOe } = useAccounts()

/** Le slideover a deux temps : saisie du formulaire, puis confirmation des impacts. */
const step = ref<'form' | 'confirm'>('form')

const preview = ref<AuditAdminPreviewResult | null>(null)
const previewLoading = ref(false)
const previewError = ref<string | null>(null)

const oeOptions = ref<Array<{ label: string; value: number | null }>>([])
const auditorOptions = ref<Array<{ label: string; value: number | null }>>([])
const loadingAuditors = ref(false)

/** Normalise une date venant de l'API (string ISO ou Date) vers le format d'un input date. */
const toDateInput = (value: string | Date | null | undefined): string => {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return value.slice(0, 10)
}

const buildForm = (audit: AuditWithRelations) => ({
  status: audit.status,
  type: audit.type,
  monitoringMode: audit.monitoringMode ?? null,
  oeId: audit.oeId ?? null,
  auditorId: audit.auditorId ?? null,
  externalAuditorName: audit.externalAuditorName ?? '',
  plannedDate: toDateInput(audit.plannedDate),
  actualStartDate: toDateInput(audit.actualStartDate),
  actualEndDate: toDateInput(audit.actualEndDate),
  globalScore: audit.globalScore ?? null,
  oeOpinion: audit.oeOpinion ?? null,
  oeOpinionArgumentaire: audit.oeOpinionArgumentaire ?? '',
  oeOpinionConditions: audit.oeOpinionConditions ?? '',
  actionPlanType: audit.actionPlanType ?? ActionPlanType.NONE,
  actionPlanDeadline: toDateInput(audit.actionPlanDeadline),
  feefDecision: audit.feefDecision ?? null,
  labelExpirationDate: toDateInput(audit.labelExpirationDate),
  oeAccepted: audit.oeAccepted ?? null,
  oeRefusalReason: audit.oeRefusalReason ?? '',
  planRefusalReason: audit.planRefusalReason ?? '',
  hasComplementaryAudit: audit.hasComplementaryAudit ?? false,
  complementaryStartDate: toDateInput(audit.complementaryStartDate),
  complementaryEndDate: toDateInput(audit.complementaryEndDate),
  complementaryGlobalScore: audit.complementaryGlobalScore ?? null,
  previousAuditId: audit.previousAuditId ?? null,
})

const form = reactive(buildForm(props.audit))

/** Le champ vide d'un input texte ou date signifie « effacer la valeur ». */
const emptyToNull = (value: string): string | null => {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Le formulaire est envoyé en entier : le serveur compare avec l'existant et
 * ne retient que les champs réellement modifiés.
 */
const body = computed<AuditAdminBody>(() => ({
  status: form.status,
  type: form.type,
  monitoringMode: form.monitoringMode,
  oeId: form.oeId,
  auditorId: form.auditorId,
  externalAuditorName: emptyToNull(form.externalAuditorName),
  plannedDate: emptyToNull(form.plannedDate),
  actualStartDate: emptyToNull(form.actualStartDate),
  actualEndDate: emptyToNull(form.actualEndDate),
  globalScore: form.globalScore,
  oeOpinion: form.oeOpinion,
  oeOpinionArgumentaire: emptyToNull(form.oeOpinionArgumentaire),
  oeOpinionConditions: emptyToNull(form.oeOpinionConditions),
  actionPlanType: form.actionPlanType,
  actionPlanDeadline: emptyToNull(form.actionPlanDeadline),
  feefDecision: form.feefDecision,
  labelExpirationDate: emptyToNull(form.labelExpirationDate),
  oeAccepted: form.oeAccepted,
  oeRefusalReason: emptyToNull(form.oeRefusalReason),
  planRefusalReason: emptyToNull(form.planRefusalReason),
  hasComplementaryAudit: form.hasComplementaryAudit,
  complementaryStartDate: emptyToNull(form.complementaryStartDate),
  complementaryEndDate: emptyToNull(form.complementaryEndDate),
  complementaryGlobalScore: form.complementaryGlobalScore,
  previousAuditId: form.previousAuditId,
}))

const statusItems = getAuditStatusItems(false)
const typeItems = getAuditTypeItems(false)
const opinionItems = getOeOpinionItems()
const decisionItems = getFeefDecisionItems()
const actionPlanItems = getActionPlanTypeItems()
const monitoringModeItems = Object.values(MonitoringMode).map(value => ({
  label: MonitoringModeLabels[value],
  value,
}))
const oeAcceptedItems = [
  { label: 'Non renseigné', value: null },
  { label: 'Accepté', value: true },
  { label: 'Refusé', value: false },
]

const isMonitoring = computed(() => form.type === AuditType.MONITORING)

/** Un auditeur interne et un auditeur externe sont exclusifs. */
watch(() => form.auditorId, (auditorId) => {
  if (auditorId) form.externalAuditorName = ''
})
watch(() => form.externalAuditorName, (name) => {
  if (name.trim()) form.auditorId = null
})

/** Changer d'OE invalide la liste des auditeurs proposés. */
watch(() => form.oeId, async (oeId, previousOeId) => {
  if (oeId === previousOeId) return
  if (form.auditorId && oeId !== props.audit.oeId) {
    form.auditorId = null
  }
  await loadAuditors(oeId)
})

const NO_AUDITOR_OPTION = { label: 'Aucun', value: null }
const NO_OE_OPTION = { label: 'Aucun (appel d\'offre)', value: null }

const loadAuditors = async (oeId: number | null) => {
  if (!oeId) {
    auditorOptions.value = [NO_AUDITOR_OPTION]
    return
  }
  loadingAuditors.value = true
  try {
    auditorOptions.value = [NO_AUDITOR_OPTION, ...(await fetchAuditorsByOe(oeId))]
  } finally {
    loadingAuditors.value = false
  }
}

const resetToForm = () => {
  step.value = 'form'
  preview.value = null
  previewError.value = null
}

// À chaque ouverture, repartir de l'état courant de l'audit.
watch(isOpen, async (open) => {
  if (!open) return
  Object.assign(form, buildForm(props.audit))
  resetToForm()
  const [oes] = await Promise.all([
    fetchOesForSelect({ includeAll: false }),
    loadAuditors(props.audit.oeId ?? null),
  ])
  oeOptions.value = [NO_OE_OPTION, ...oes]
})

const goToConfirm = async () => {
  previewLoading.value = true
  previewError.value = null
  preview.value = null
  step.value = 'confirm'

  const result = await previewChange(props.audit.id, body.value)
  if (result.success && result.data) {
    preview.value = result.data
  } else {
    previewError.value = result.error ?? 'Erreur lors du calcul des impacts'
  }
  previewLoading.value = false
}

const handleConfirm = async () => {
  if (!preview.value || preview.value.blocked) return
  const result = await applyChange(props.audit.id, body.value)
  if (result.success) {
    isOpen.value = false
    if (props.onApplied) {
      await props.onApplied()
    }
  }
}

const isBlocked = computed(() => !!preview.value?.blocked)
const hasChanges = computed(() => (preview.value?.changes.length ?? 0) > 0)
</script>

<template>
  <USlideover
    v-model:open="isOpen"
    :title="`Modifier l'audit #${audit.id}`"
    :description="audit.entity?.name"
    :ui="{ content: 'max-w-2xl' }"
  >
    <template #body>
      <!-- Étape 1 : saisie -->
      <div
        v-if="step === 'form'"
        class="space-y-6"
      >
        <UAlert
          color="warning"
          variant="soft"
          icon="i-lucide-shield-alert"
          title="Édition administrative"
          description="Les valeurs saisies sont écrites telles quelles, sans passer par le workflow. Aucun recalcul ni transition automatique n'est déclenché."
        />

        <!-- Workflow -->
        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-700">Workflow</h4>

          <UFormField
            label="Statut"
            help="Forcer le statut annule les actions en cours et crée celles du nouveau statut."
          >
            <USelectMenu
              v-model="form.status"
              :items="statusItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Type d'audit">
            <USelectMenu
              v-model="form.type"
              :items="typeItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <UFormField
            v-if="isMonitoring"
            label="Mode de suivi"
          >
            <USelectMenu
              v-model="form.monitoringMode"
              :items="monitoringModeItems"
              value-key="value"
              placeholder="Aucun"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Audit précédent"
            help="Identifiant d'un audit de la même entité, en cas de reprise après refus."
          >
            <UInputNumber
              v-model="form.previousAuditId"
              placeholder="Aucun"
              class="w-full"
            />
          </UFormField>
        </div>

        <USeparator />

        <!-- Affectation -->
        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-700">Affectation</h4>

          <UFormField label="Organisme évaluateur">
            <USelectMenu
              v-model="form.oeId"
              :items="oeOptions"
              value-key="value"
              placeholder="Aucun (appel d'offre)"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Auditeur interne"
            :help="form.oeId ? undefined : 'Sélectionnez un organisme évaluateur pour lister ses auditeurs.'"
          >
            <USelectMenu
              v-model="form.auditorId"
              :items="auditorOptions"
              :loading="loadingAuditors"
              :disabled="!form.oeId"
              value-key="value"
              placeholder="Aucun"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Auditeur externe"
            help="Exclusif avec l'auditeur interne."
          >
            <UInput
              v-model="form.externalAuditorName"
              placeholder="Nom complet"
              maxlength="255"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Acceptation par l'OE">
            <USelectMenu
              v-model="form.oeAccepted"
              :items="oeAcceptedItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Motif de refus de l'OE">
            <UTextarea
              v-model="form.oeRefusalReason"
              :rows="2"
              class="w-full"
            />
          </UFormField>
        </div>

        <USeparator />

        <!-- Dates -->
        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-700">Dates</h4>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Date prévisionnelle">
              <UInput
                v-model="form.plannedDate"
                type="date"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Date de début réelle">
              <UInput
                v-model="form.actualStartDate"
                type="date"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Date de fin réelle">
              <UInput
                v-model="form.actualEndDate"
                type="date"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Expiration du label">
              <UInput
                v-model="form.labelExpirationDate"
                type="date"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>

        <USeparator />

        <!-- Résultats -->
        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-700">Résultats</h4>

          <UFormField label="Score global (sur 100)">
            <UInputNumber
              v-model="form.globalScore"
              :min="0"
              :max="100"
              placeholder="Aucun"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Avis de l'OE">
            <USelectMenu
              v-model="form.oeOpinion"
              :items="opinionItems"
              value-key="value"
              placeholder="Aucun"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Argumentaire de l'avis OE">
            <UTextarea
              v-model="form.oeOpinionArgumentaire"
              :rows="3"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Conditions de l'avis OE">
            <UTextarea
              v-model="form.oeOpinionConditions"
              :rows="2"
              class="w-full"
            />
          </UFormField>
        </div>

        <USeparator />

        <!-- Plan d'action -->
        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-700">Plan d'action correctif</h4>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Type de plan">
              <USelectMenu
                v-model="form.actionPlanType"
                :items="actionPlanItems"
                value-key="value"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Échéance">
              <UInput
                v-model="form.actionPlanDeadline"
                type="date"
                class="w-full"
              />
            </UFormField>
          </div>

          <UFormField label="Motif de refus du plan">
            <UTextarea
              v-model="form.planRefusalReason"
              :rows="2"
              class="w-full"
            />
          </UFormField>
        </div>

        <USeparator />

        <!-- Audit complémentaire -->
        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-700">Audit complémentaire</h4>

          <UCheckbox
            v-model="form.hasComplementaryAudit"
            label="Cet audit comporte une phase complémentaire"
          />

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Date de début">
              <UInput
                v-model="form.complementaryStartDate"
                type="date"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Date de fin">
              <UInput
                v-model="form.complementaryEndDate"
                type="date"
                class="w-full"
              />
            </UFormField>
          </div>

          <UFormField label="Score complémentaire (sur 100)">
            <UInputNumber
              v-model="form.complementaryGlobalScore"
              :min="0"
              :max="100"
              placeholder="Aucun"
              class="w-full"
            />
          </UFormField>
        </div>

        <USeparator />

        <!-- Décision FEEF -->
        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-700">Décision FEEF</h4>

          <UFormField label="Décision">
            <USelectMenu
              v-model="form.feefDecision"
              :items="decisionItems"
              value-key="value"
              placeholder="Aucune"
              class="w-full"
            />
          </UFormField>
        </div>
      </div>

      <!-- Étape 2 : confirmation -->
      <div
        v-else
        class="space-y-4"
      >
        <div
          v-if="previewLoading"
          class="py-8 text-center text-gray-500"
        >
          <UIcon
            name="i-lucide-loader"
            class="w-6 h-6 animate-spin mx-auto mb-2"
          />
          Calcul des impacts...
        </div>

        <UAlert
          v-else-if="previewError"
          color="error"
          variant="soft"
          icon="i-lucide-circle-x"
          :title="previewError"
        />

        <template v-else-if="preview">
          <UAlert
            v-if="preview.blocked"
            color="error"
            variant="soft"
            icon="i-lucide-circle-x"
            title="Opération impossible"
            :description="preview.blocked.reason"
          />

          <div v-if="hasChanges">
            <h4 class="text-sm font-semibold text-gray-700 mb-2">
              Modifications à appliquer
            </h4>
            <ul class="space-y-2">
              <li
                v-for="(change, idx) in preview.changes"
                :key="`${change.field}-${idx}`"
                class="flex items-start gap-3 p-3 bg-gray-50 rounded-md border border-gray-200"
              >
                <UIcon
                  name="i-lucide-arrow-right"
                  class="w-4 h-4 mt-1 text-primary flex-shrink-0"
                />
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-gray-900">
                    {{ change.fieldLabel }}
                  </div>
                  <div class="text-xs text-gray-600 mt-0.5">
                    <span class="line-through text-gray-400">{{ change.fromLabel }}</span>
                    <UIcon
                      name="i-lucide-arrow-right"
                      class="w-3 h-3 inline mx-1 text-gray-400"
                    />
                    <span class="font-semibold text-primary">{{ change.toLabel }}</span>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <div
            v-if="preview.warnings.length > 0"
            class="space-y-2"
          >
            <UAlert
              v-for="(warning, idx) in preview.warnings"
              :key="idx"
              color="warning"
              variant="soft"
              icon="i-lucide-triangle-alert"
              :description="warning"
            />
          </div>
        </template>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <template v-if="step === 'form'">
          <UButton
            label="Annuler"
            color="neutral"
            variant="outline"
            @click="isOpen = false"
          />
          <UButton
            label="Vérifier les impacts"
            color="primary"
            icon="i-lucide-arrow-right"
            trailing
            @click="goToConfirm"
          />
        </template>

        <template v-else>
          <UButton
            label="Retour"
            color="neutral"
            variant="outline"
            icon="i-lucide-arrow-left"
            @click="resetToForm"
          />
          <UButton
            label="Appliquer"
            color="primary"
            :loading="loading"
            :disabled="isBlocked || !hasChanges || previewLoading"
            @click="handleConfirm"
          />
        </template>
      </div>
    </template>
  </USlideover>
</template>
