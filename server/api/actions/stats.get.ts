/**
 * GET /api/actions/stats - Get action statistics for current user
 */

import { db } from '~~/server/database'
import { actions } from '~~/server/database/schema'
import { and, eq, lt, sql } from 'drizzle-orm'
import { buildActionsWhereForUser } from '~~/server/utils/actionsQuery'

export default defineEventHandler(async (event) => {
  // Authentication
  const { user } = await requireUserSession(event)

  // Build WHERE conditions for user
  const userConditions = await buildActionsWhereForUser(user)
  const whereClause = userConditions.length > 0 ? and(...userConditions) : undefined

  // Count by status
  const stats = await db
    .select({
      status: actions.status,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(actions)
    .where(whereClause)
    .groupBy(actions.status)

  // Count overdue (PENDING + deadline < now)
  const overdueCount = await db
    .select({
      count: sql<number>`COUNT(*)::int`,
    })
    .from(actions)
    .where(
      and(
        ...userConditions,
        eq(actions.status, 'PENDING'),
        lt(actions.deadline, new Date()),
      ),
    )

  return {
    data: {
      byStatus: stats,
      overdue: overdueCount[0]?.count || 0,
    },
  }
})
