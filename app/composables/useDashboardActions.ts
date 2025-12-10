/**
 * Composable for dashboard actions management
 * Fetches the 20 most urgent actions and groups them by role
 */

import type { Action } from '~~/server/database/schema'

interface ActionsByRole {
  feef: Action[]
  oe: Action[]
  entity: Action[]
}

export function useDashboardActions() {
  // Global state
  const actionsByRole = useState<ActionsByRole>('dashboard:actionsByRole', () => ({
    feef: [],
    oe: [],
    entity: [],
  }))
  const loading = useState<boolean>('dashboard:actionsLoading', () => false)
  const error = useState<string | null>('dashboard:actionsError', () => null)

  /**
   * Group actions by role with priority: FEEF > OE/AUDITOR > ENTITY
   * Each action appears in only one column based on highest priority role
   */
  function groupActionsByRole(actions: Action[]): ActionsByRole {
    const feef: Action[] = []
    const oe: Action[] = []
    const entity: Action[] = []

    for (const action of actions) {
      // Priority: FEEF > OE/AUDITOR > ENTITY
      if (action.assignedRoles.includes('FEEF')) {
        feef.push(action)
      }
      else if (action.assignedRoles.includes('OE') || action.assignedRoles.includes('AUDITOR')) {
        oe.push(action)
      }
      else if (action.assignedRoles.includes('ENTITY')) {
        entity.push(action)
      }
    }

    return { feef, oe, entity }
  }

  /**
   * Fetch the 20 most urgent actions from the API
   */
  const fetchActions = async () => {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch('/api/actions', {
        query: {
          limit: 20,
          sort: 'deadline:asc',
          status: 'PENDING',
        },
      })

      // Group actions by role
      actionsByRole.value = groupActionsByRole(response.data)
    }
    catch (err) {
      error.value = 'Erreur lors du chargement des actions'
      console.error('Error fetching dashboard actions:', err)
    }
    finally {
      loading.value = false
    }
  }

  return {
    actionsByRole: readonly(actionsByRole),
    loading: readonly(loading),
    error: readonly(error),
    fetchActions,
    refresh: fetchActions,
  }
}
