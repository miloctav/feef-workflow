/**
 * GET /api/actions/stats - Get action statistics for current user
 */

import { db } from '~~/server/database'
import { actions, audits as auditsTable } from '~~/server/database/schema'
import { and, eq, lt, sql, gte, inArray, isNull } from 'drizzle-orm'
import { buildActionsWhereForUser } from '~~/server/utils/actionsQuery'
import { Role } from '#shared/types/roles'

export default defineEventHandler(async (event) => {
  // Authentication
  const { user } = await requireUserSession(event)

  // Extract optional oeId filter (FEEF only)
  const query = getQuery(event)
  const oeId = query.oeId ? Number(query.oeId) : undefined

  // Build WHERE conditions for user (include all statuses for stats)
  const userConditions = await buildActionsWhereForUser(user, [], { includeAllStatuses: true })

  // FEEF can filter actions by OE (via audit.oeId)
  if (user.role === Role.FEEF && oeId) {
    const oeAudits = await db.query.audits.findMany({
      where: and(
        eq(auditsTable.oeId, oeId),
        isNull(auditsTable.deletedAt),
      ),
      columns: { id: true },
    })
    const auditIds = oeAudits.map(a => a.id)
    if (auditIds.length > 0) {
      userConditions.push(inArray(actions.auditId, auditIds))
    }
    else {
      userConditions.push(sql`1 = 0`)
    }
  }

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
