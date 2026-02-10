import { db } from '~~/server/database'
import { notifications } from '~~/server/database/schema'
import { eq, and, isNull, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  // Count before update
  const countResult = await db.execute(
    sql`SELECT COUNT(*) as count FROM ${notifications} WHERE ${eq(notifications.accountId, user.id)} AND ${isNull(notifications.readAt)}`
  )
  const updatedCount = Number(countResult.rows[0]?.count || 0)

  // Mark all as read
  await db.update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.accountId, user.id),
        isNull(notifications.readAt),
      )
    )

  return { data: { updatedCount } }
})
