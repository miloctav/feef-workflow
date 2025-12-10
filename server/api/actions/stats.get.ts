/**
 * GET /api/actions/stats - Get action statistics for current user
 */

import { db } from '~~/server/database'
import { actions, audits as auditsTable } from '~~/server/database/schema'
import { and, eq, lt, sql, gte } from 'drizzle-orm'
import { buildActionsWhereForUser } from '~~/server/utils/actionsQuery'

export default defineEventHandler(async (event) => {
  // Authentication
  const { user } = await requireUserSession(event)

  // Build WHERE conditions for user (include all statuses for stats)
  const userConditions = await buildActionsWhereForUser(user, [], { includeAllStatuses: true })
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
  const now = new Date()
  const overdueCount = await db
    .select({
      count: sql<number>`COUNT(*)::int`,
    })
    .from(actions)
    .where(
      and(
        ...userConditions,
        eq(actions.status, 'PENDING'),
        lt(actions.deadline, now),
      ),
    )

  // Count upcoming (PENDING + now <= deadline <= now + 7 days)
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const upcomingCount = await db
    .select({
      count: sql<number>`COUNT(*)::int`,
    })
    .from(actions)
    .where(
      and(
        ...userConditions,
        eq(actions.status, 'PENDING'),
        gte(actions.deadline, now),
        lt(actions.deadline, sevenDaysFromNow),
      ),
    )

  // Group by audit status (for alert badges)
  const byAuditStatus = await db
    .select({
      auditStatus: auditsTable.status,
      overdueCount: sql<number>`COUNT(*) FILTER (WHERE ${actions.status} = 'PENDING' AND ${actions.deadline} < NOW())::int`,
      upcomingCount: sql<number>`COUNT(*) FILTER (WHERE ${actions.status} = 'PENDING' AND ${actions.deadline} >= NOW() AND ${actions.deadline} < NOW() + INTERVAL '7 days')::int`,
    })
    .from(actions)
    .leftJoin(auditsTable, eq(actions.auditId, auditsTable.id))
    .where(whereClause)
    .groupBy(auditsTable.status)

  return {
    data: {
      byStatus: stats,
      overdue: overdueCount[0]?.count || 0,
      upcoming: upcomingCount[0]?.count || 0,
      byAuditStatus,
    },
  }
})
