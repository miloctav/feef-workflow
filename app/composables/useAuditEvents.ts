import type { Ref } from 'vue'
import type { Event } from '~~/server/database/schema'

/**
 * Composable pour accéder aux événements d'audit
 *
 * Fournit une interface unifiée pour accéder aux timestamps et performers
 * depuis le système d'événements, remplaçant les anciens champs *At/*By
 *
 * @param auditId - Ref contenant l'ID de l'audit
 * @returns Objet contenant les computed properties pour les timestamps et performers
 *
 * @example
 * ```ts
 * const { caseSubmittedAt, caseSubmittedByAccount, hasEvent } = useAuditEvents(
 *   computed(() => currentAudit.value?.id)
 * )
 * ```
 */
export function useAuditEvents(auditId: Ref<number | null | undefined>) {
  const events = ref<Event[]>([])
  const pending = ref(false)
  const error = ref<Error | null>(null)

  // Fetch events from API
  async function fetchEvents() {
    if (!auditId.value) {
      events.value = []
      return
    }

    try {
      pending.value = true
      error.value = null

      const { data } = await $fetch<{ data: Event[] }>(`/api/audits/${auditId.value}/events`)
      events.value = data || []
    } catch (e) {
      error.value = e as Error
      console.error(`[useAuditEvents] Failed to fetch events for audit ${auditId.value}:`, e)
      events.value = []
    } finally {
      pending.value = false
    }
  }

  // Auto-fetch when auditId changes
  watch(auditId, () => {
    fetchEvents()
  }, { immediate: true })

  // Helper: Get latest event by type
  function getLatestEvent(eventType: string) {
    return computed(() => {
      const filtered = events.value.filter(e => e.type === eventType)
      if (filtered.length === 0) return null
      // Events are ordered by performedAt DESC from API
      return filtered[0]
    })
  }

  // Helper: Check if event exists
  function hasEvent(eventType: string) {
    return computed(() => {
      return events.value.some(e => e.type === eventType)
    })
  }

  // --- CASE SUBMISSION (Soumission du dossier par l'entité) ---
  const caseSubmittedEvent = getLatestEvent('AUDIT_CASE_SUBMITTED')
  const caseSubmittedAt = computed(() => caseSubmittedEvent.value?.performedAt || null)
  const caseSubmittedByAccount = computed(() => caseSubmittedEvent.value?.performedByAccount || null)

  // --- CASE APPROVAL (Approbation du dossier par FEEF) ---
  const caseApprovedEvent = getLatestEvent('AUDIT_CASE_APPROVED')
  const caseApprovedAt = computed(() => caseApprovedEvent.value?.performedAt || null)
  const caseApprovedByAccount = computed(() => caseApprovedEvent.value?.performedByAccount || null)

  // --- OE ACCEPTANCE (Acceptation/Refus de l'audit par l'OE) ---
  const oeAcceptedEvent = getLatestEvent('AUDIT_OE_ACCEPTED')
  const oeAcceptedAt = computed(() => oeAcceptedEvent.value?.performedAt || null)
  const oeAcceptedByAccount = computed(() => oeAcceptedEvent.value?.performedByAccount || null)

  const oeRefusedEvent = getLatestEvent('AUDIT_OE_REFUSED')
  const oeRefusedAt = computed(() => oeRefusedEvent.value?.performedAt || null)
  const oeRefusedByAccount = computed(() => oeRefusedEvent.value?.performedByAccount || null)

  // --- OE OPINION (Avis de l'OE transmis) ---
  const oeOpinionTransmittedEvent = getLatestEvent('AUDIT_OE_OPINION_TRANSMITTED')
  const oeOpinionTransmittedAt = computed(() => oeOpinionTransmittedEvent.value?.performedAt || null)
  const oeOpinionTransmittedByAccount = computed(() => oeOpinionTransmittedEvent.value?.performedByAccount || null)

  // --- CORRECTIVE PLAN (Validation du plan correctif par OE/FEEF) ---
  const correctivePlanValidatedEvent = getLatestEvent('AUDIT_CORRECTIVE_PLAN_VALIDATED')
  const correctivePlanValidatedAt = computed(() => correctivePlanValidatedEvent.value?.performedAt || null)
  const correctivePlanValidatedByAccount = computed(() => correctivePlanValidatedEvent.value?.performedByAccount || null)

  // --- FEEF DECISION (Décision FEEF - Acceptation/Refus) ---
  const feefDecisionAcceptedEvent = getLatestEvent('AUDIT_FEEF_DECISION_ACCEPTED')
  const feefDecisionAcceptedAt = computed(() => feefDecisionAcceptedEvent.value?.performedAt || null)
  const feefDecisionAcceptedByAccount = computed(() => feefDecisionAcceptedEvent.value?.performedByAccount || null)

  const feefDecisionRefusedEvent = getLatestEvent('AUDIT_FEEF_DECISION_REFUSED')
  const feefDecisionRefusedAt = computed(() => feefDecisionRefusedEvent.value?.performedAt || null)
  const feefDecisionRefusedByAccount = computed(() => feefDecisionRefusedEvent.value?.performedByAccount || null)

  // Generic FEEF decision (accepted or refused)
  const feefDecisionAt = computed(() => {
    return feefDecisionAcceptedAt.value || feefDecisionRefusedAt.value || null
  })
  const feefDecisionByAccount = computed(() => {
    return feefDecisionAcceptedByAccount.value || feefDecisionRefusedByAccount.value || null
  })

  // --- OE RESPONSE (Réponse de l'OE - acceptation ou refus) ---
  const oeResponseAt = computed(() => {
    return oeAcceptedAt.value || oeRefusedAt.value || null
  })
  const oeResponseByAccount = computed(() => {
    return oeAcceptedByAccount.value || oeRefusedByAccount.value || null
  })

  return {
    // Raw data
    events: readonly(events),
    pending: readonly(pending),
    error: readonly(error),

    // Methods
    fetchEvents,
    getLatestEvent,
    hasEvent,

    // Case submission
    caseSubmittedAt,
    caseSubmittedByAccount,
    caseSubmittedEvent,

    // Case approval
    caseApprovedAt,
    caseApprovedByAccount,
    caseApprovedEvent,

    // OE acceptance
    oeAcceptedAt,
    oeAcceptedByAccount,
    oeAcceptedEvent,

    // OE refusal
    oeRefusedAt,
    oeRefusedByAccount,
    oeRefusedEvent,

    // OE response (generic - accepted or refused)
    oeResponseAt,
    oeResponseByAccount,

    // OE opinion
    oeOpinionTransmittedAt,
    oeOpinionTransmittedByAccount,
    oeOpinionTransmittedEvent,

    // Corrective plan validation
    correctivePlanValidatedAt,
    correctivePlanValidatedByAccount,
    correctivePlanValidatedEvent,

    // FEEF decision (accepted)
    feefDecisionAcceptedAt,
    feefDecisionAcceptedByAccount,
    feefDecisionAcceptedEvent,

    // FEEF decision (refused)
    feefDecisionRefusedAt,
    feefDecisionRefusedByAccount,
    feefDecisionRefusedEvent,

    // FEEF decision (generic - accepted or refused)
    feefDecisionAt,
    feefDecisionByAccount,
  }
}
