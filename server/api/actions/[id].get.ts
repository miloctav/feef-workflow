/**
 * GET /api/actions/[id] - Get action details
 */

import { db } from '~~/server/database'
import { actions } from '~~/server/database/schema'
import { eq, and } from 'drizzle-orm'
import { buildActionsWhereForUser } from '~~/server/utils/actionsQuery'

export default defineEventHandler(async (event) => {
  // Authentication
  const { user } = await requireUserSession(event)

  // Get action ID from route
  const actionId = Number(getRouterParam(event, 'id'))

  if (isNaN(actionId)) {
    throw createError({
      statusCode: 400,
      message: 'ID d\'action invalide',
    })
  }

  // Fetch action with all relations
  const action = await db.query.actions.findFirst({
    where: eq(actions.id, actionId),
    with: {
      entity: true,
      audit: {
        with: {
          oe: true,
          auditor: {
            columns: {
              id: true,
              firstname: true,
              lastname: true,
            },
          },
        },
      },
      assignedOe: true,
      assignedAuditor: {
        columns: {
          id: true,
          firstname: true,
          lastname: true,
        },
      },
      completedByAccount: {
        columns: {
          id: true,
          firstname: true,
          lastname: true,
        },
      },
    },
  })

  if (!action) {
    throw createError({
      statusCode: 404,
      message: 'Action non trouvée',
    })
  }

  if (action.deletedAt) {
    throw createError({
      statusCode: 404,
      message: 'Action supprimée',
    })
  }

  // Verify user has access to this action
  const userConditions = await buildActionsWhereForUser(user, [eq(actions.id, actionId)])
  const hasAccess = await db.query.actions.findFirst({
    where: and(...userConditions),
  })

  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      message: 'Vous n\'avez pas accès à cette action',
    })
  }

  return {
    data: action,
  }
})
