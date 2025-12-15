/**
 * GET /api/actions - List actions with role-based filtering
 */

import { db } from '~~/server/database'
import { and } from 'drizzle-orm'
import { parsePaginationParams, buildWhereConditions, buildOrderBy, buildCountQuery, formatResponse } from '~~/server/utils/pagination'
import { buildActionsWhereForUser, actionsPaginationConfig } from '~~/server/utils/actionsQuery'

export default defineEventHandler(async (event) => {
  // Authentication
  const { user } = await requireUserSession(event)

  // Parse pagination params
  const query = getQuery(event)
  const params = parsePaginationParams(query, actionsPaginationConfig)

  // Extract auditId from query if present
  const auditId = query.auditId ? Number(query.auditId) : undefined

  // Build WHERE conditions based on user context
  const userConditions = await buildActionsWhereForUser(user, [], { auditId })
  const whereConditions = await buildWhereConditions(params, actionsPaginationConfig)

  const allConditions = [...userConditions, ...whereConditions]
  const whereClause = allConditions.length > 0 ? and(...allConditions) : undefined

  // Build ORDER BY
  const orderBy = buildOrderBy(params.sort, actionsPaginationConfig)

  // Fetch data with relations
  const data = await db.query.actions.findMany({
    where: whereClause,
    orderBy,
    limit: params.isUnlimited ? undefined : params.limit,
    offset: params.isUnlimited ? undefined : params.offset,
    with: {
      entity: {
        columns: {
          id: true,
          name: true,
        },
      },
      audit: {
        columns: {
          id: true,
          type: true,
          status: true,
        },
        with: {
          oe: {
            columns: {
              id: true,
              name: true,
            },
          },
          auditor: {
            columns: {
              id: true,
              firstname: true,
              lastname: true,
            },
          },
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

  // Return response (paginated or unlimited)
  if (params.isUnlimited) {
    return formatResponse(true, data)
  }
  else {
    const total = await buildCountQuery(allConditions, actionsPaginationConfig)
    return formatResponse(false, data, params, total)
  }
})
