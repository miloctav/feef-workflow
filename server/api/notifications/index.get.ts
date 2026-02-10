import { db } from '~~/server/database'
import { notifications } from '~~/server/database/schema'
import { eq, and, isNull, desc, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  const query = getQuery(event)
  const page = Math.max(1, parseInt(query.page as string) || 1)
  const limit = Math.min(Math.max(1, parseInt(query.limit as string) || 20), 100)
  const offset = (page - 1) * limit
  const unreadOnly = query.unreadOnly === 'true'

  // Build where conditions
  const conditions = [eq(notifications.accountId, user.id)]
  if (unreadOnly) {
    conditions.push(isNull(notifications.readAt))
  }

  // Fetch notifications
  const data = await db.query.notifications.findMany({
    where: and(...conditions),
    orderBy: [desc(notifications.createdAt)],
    limit,
    offset,
    with: {
      entity: { columns: { id: true, name: true } },
      audit: { columns: { id: true, type: true, status: true } },
    },
  })

  // Count total
  const whereClause = and(...conditions)
  const countResult = await db.execute(
    sql`SELECT COUNT(*) as count FROM ${notifications} WHERE ${whereClause}`
  )
  const total = Number(countResult.rows[0]?.count || 0)

  // Count unread (always, for the badge)
  const unreadResult = await db.execute(
    sql`SELECT COUNT(*) as count FROM ${notifications} WHERE ${eq(notifications.accountId, user.id)} AND ${isNull(notifications.readAt)}`
  )
  const unreadCount = Number(unreadResult.rows[0]?.count || 0)

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    },
  }
})
