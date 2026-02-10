/**
 * GET /api/actions - List actions with role-based filtering
 */

import { db } from '~~/server/database'
import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { audits as auditsTable, actions as actionsTable } from '~~/server/database/schema'
import { parsePaginationParams, buildWhereConditions, buildOrderBy, buildCountQuery, formatResponse } from '~~/server/utils/pagination'
import { buildActionsWhereForUser, actionsPaginationConfig } from '~~/server/utils/actionsQuery'
import { Role } from '#shared/types/roles'

export default defineEventHandler(async (event) => {
  // Authentication
  const { user } = await requireUserSession(event)

  // Parse pagination params
  const query = getQuery(event)
  const params = parsePaginationParams(query, actionsPaginationConfig)

  // Extract auditId and entityId from query if present
  const auditId = query.auditId ? Number(query.auditId) : undefined
  const entityId = query.entityId ? Number(query.entityId) : undefined
  const oeId = query.oeId ? Number(query.oeId) : undefined

  // Build WHERE conditions based on user context
  const userConditions = await buildActionsWhereForUser(user, [], { auditId, entityId })

  // FEEF can filter actions by OE (via audit.oeId)
  if (user.role === Role.FEEF && oeId) {
    const oeAudits = await db.query.audits.findMany({
      where: and(
        eq(auditsTable.oeId, oeId),
        isNull(auditsTable.deletedAt),
      ),
      columns: { id: true },
    })
    const oeAuditIds = oeAudits.map(a => a.id)
    if (oeAuditIds.length > 0) {
      userConditions.push(inArray(actionsTable.auditId, oeAuditIds))
    }
    else {
      userConditions.push(sql`1 = 0`)
    }
  }

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
