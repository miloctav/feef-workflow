import type { Action } from '~~/server/database/schema'
import { onActionRefresh } from './useActionRefresh'

interface UseSimpleActionsOptions {
  auditId?: number | Ref<number | undefined>
  entityId?: number | Ref<number | undefined>
  filters?: Record<string, any>
}

/**
 * Composable simplifié pour gérer les actions sans cache Nuxt
 *
 * Chaque appel crée une instance isolée avec son propre state local.
 * Pas de cache global, pas de debounce, juste des refs simples.
 */
export const useSimpleActions = (options?: UseSimpleActionsOptions) => {
  // Convertir les options en refs si nécessaire
  const auditIdRef = options?.auditId && isRef(options.auditId)
    ? options.auditId
    : ref(options?.auditId)

  const entityIdRef = options?.entityId && isRef(options.entityId)
    ? options.entityId
    : ref(options?.entityId)

  // State local (pas de cache Nuxt)
  const actions = ref<Action[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Fonction de fetch directe
  const fetchActions = async (additionalFilters?: Record<string, any>) => {
    loading.value = true
    error.value = null

    try {
      // Construire les paramètres de requête
      const params: Record<string, any> = {
        ...options?.filters,
        ...additionalFilters,
      }

      // Ajouter auditId/entityId si définis
      if (auditIdRef.value) {
        params.auditId = auditIdRef.value
      }
      if (entityIdRef.value) {
        params.entityId = entityIdRef.value
      }

      // Fetch direct sans cache
      const response = await $fetch<{ data: Action[] }>('/api/actions', {
        query: params,
      })

      actions.value = response.data || []
    } catch (e: any) {
      console.error('[useSimpleActions] Erreur lors du fetch:', e)
      error.value = e.data?.message || e.message || 'Erreur lors de la récupération des actions'
      actions.value = []
    } finally {
      loading.value = false
    }
  }

  // Watch sur les IDs pour refetch automatiquement
  watch([auditIdRef, entityIdRef], ([newAuditId, newEntityId], [oldAuditId, oldEntityId]) => {
    // Détecter si les IDs ont changé
    const idsChanged = newAuditId !== oldAuditId || newEntityId !== oldEntityId

    if (idsChanged) {
      // Vider immédiatement les données quand le contexte change
      actions.value = []

      // Refetch si au moins un ID est défini
      if (newAuditId || newEntityId) {
        fetchActions()
      }
    }
  }, { immediate: true })

  // S'abonner aux événements de rafraîchissement (comme avant)
  const auditIdStringRef = computed(() => auditIdRef.value?.toString())
  const entityIdStringRef = computed(() => entityIdRef.value?.toString())

  onActionRefresh(
    async () => {
      // Rafraîchir les actions automatiquement lors d'un événement
      await fetchActions()
    },
    {
      auditId: auditIdStringRef,
      entityId: entityIdStringRef,
    }
  )

  return {
    actions: readonly(actions),
    loading: readonly(loading),
    error: readonly(error),
    fetchActions,
    refresh: fetchActions, // Alias pour compatibilité
  }
}
