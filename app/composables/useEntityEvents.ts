import type { Ref } from 'vue'
import type { Event } from '~~/server/database/schema'

/**
 * Composable pour accéder aux événements d'entité
 *
 * Fournit une interface unifiée pour accéder aux timestamps et performers
 * des événements liés à une entité (revue documentaire, etc.)
 *
 * @param entityId - Ref contenant l'ID de l'entité
 * @returns Objet contenant les computed properties pour les timestamps et performers
 *
 * @example
 * ```ts
 * const { documentaryReviewReadyAt, documentaryReviewReadyByAccount } = useEntityEvents(
 *   computed(() => currentEntity.value?.id)
 * )
 * ```
 */
export function useEntityEvents(entityId: Ref<number | null | undefined>) {
  const events = ref<Event[]>([])
  const pending = ref(false)
  const error = ref<Error | null>(null)

  // Fetch events from API
  async function fetchEvents() {
    if (!entityId.value) {
      events.value = []
      return
    }

    try {
      pending.value = true
      error.value = null

      const { data } = await $fetch<{ data: Event[] }>(`/api/entities/${entityId.value}/timeline`)
      events.value = data || []
    } catch (e) {
      error.value = e as Error
      console.error(`[useEntityEvents] Failed to fetch events for entity ${entityId.value}:`, e)
      events.value = []
    } finally {
      pending.value = false
    }
  }

  // Auto-fetch when entityId changes
  watch(entityId, () => {
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

  // --- DOCUMENTARY REVIEW READY (Revue documentaire marquée comme prête par l'entité) ---
  const documentaryReviewReadyEvent = getLatestEvent('ENTITY_DOCUMENTARY_REVIEW_READY')
  const documentaryReviewReadyAt = computed(() => documentaryReviewReadyEvent.value?.performedAt || null)
  const documentaryReviewReadyByAccount = computed(() => documentaryReviewReadyEvent.value?.performedByAccount || null)

  return {
    // Raw data
    events: readonly(events),
    pending: readonly(pending),
    error: readonly(error),

    // Methods
    fetchEvents,
    getLatestEvent,
    hasEvent,

    // Documentary review
    documentaryReviewReadyAt,
    documentaryReviewReadyByAccount,
    documentaryReviewReadyEvent,
  }
}
