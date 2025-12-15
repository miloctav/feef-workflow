import type { Ref } from 'vue'

/**
 * Event bus composable pour gérer le rafraîchissement automatique des actions
 *
 * Permet aux composants enfants de déclencher un rafraîchissement des actions
 * quand ils effectuent des modifications qui peuvent créer/compléter des actions.
 *
 * Usage:
 * - Dans le composant parent: onActionRefresh(callback)
 * - Dans les composants enfants: triggerActionRefresh({ auditId, entityId })
 */

interface ActionRefreshEvent {
  auditId?: string
  entityId?: string
  timestamp: number
}

// État global partagé entre toutes les instances
const refreshEvent: Ref<ActionRefreshEvent | null> = ref(null)
const debounceTimer: Ref<NodeJS.Timeout | null> = ref(null)

/**
 * Déclenche un événement de rafraîchissement des actions
 *
 * @param context - Contexte de l'événement (auditId ou entityId)
 * @param debounceMs - Délai de debounce en ms (par défaut 500ms)
 */
export function triggerActionRefresh(
  context: { auditId?: string; entityId?: string },
  debounceMs = 500
) {
  // Clear le timer de debounce existant
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value)
  }

  // Debounce les événements multiples
  debounceTimer.value = setTimeout(() => {
    refreshEvent.value = {
      ...context,
      timestamp: Date.now(),
    }
    debounceTimer.value = null
  }, debounceMs)
}

/**
 * S'abonne aux événements de rafraîchissement des actions
 *
 * @param callback - Fonction appelée lors d'un événement de rafraîchissement
 * @param filter - Filtre optionnel pour limiter les événements (auditId ou entityId)
 * @returns Fonction de cleanup pour se désabonner
 */
export function onActionRefresh(
  callback: (event: ActionRefreshEvent) => void,
  filter?: { auditId?: Ref<string | undefined>; entityId?: Ref<string | undefined> }
) {
  const stopWatch = watch(
    refreshEvent,
    (event) => {
      if (!event) return

      // Filtrer par auditId si spécifié
      if (filter?.auditId?.value && event.auditId && event.auditId !== filter.auditId.value) {
        return
      }

      // Filtrer par entityId si spécifié
      if (filter?.entityId?.value && event.entityId && event.entityId !== filter.entityId.value) {
        return
      }

      // Exécuter le callback
      callback(event)
    },
    { immediate: false }
  )

  // Retourner la fonction de cleanup
  return stopWatch
}

/**
 * Hook pour utiliser le rafraîchissement des actions dans un composable
 *
 * @param auditId - Ref de l'ID de l'audit courant
 * @param entityId - Ref de l'ID de l'entité courante
 * @param onRefresh - Callback à exécuter lors du rafraîchissement
 */
export function useActionRefresh(
  auditId?: Ref<string | undefined>,
  entityId?: Ref<string | undefined>,
  onRefresh?: () => void | Promise<void>
) {
  let stopWatch: (() => void) | null = null

  onMounted(() => {
    stopWatch = onActionRefresh(
      async () => {
        if (onRefresh) {
          await onRefresh()
        }
      },
      { auditId, entityId }
    )
  })

  onUnmounted(() => {
    if (stopWatch) {
      stopWatch()
    }
  })

  return {
    triggerActionRefresh,
  }
}
