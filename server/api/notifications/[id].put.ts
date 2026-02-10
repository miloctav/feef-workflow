import { db } from '~~/server/database'
import { notifications } from '~~/server/database/schema'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  const id = parseInt(getRouterParam(event, 'id') || '')
  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: 'ID invalide' })
  }

  // Verify ownership
  const notification = await db.query.notifications.findFirst({
    where: and(
      eq(notifications.id, id),
      eq(notifications.accountId, user.id),
    ),
  })

  if (!notification) {
    throw createError({ statusCode: 404, message: 'Notification non trouvée' })
  }

  // Mark as read
  const [updated] = await db.update(notifications)
    .set({ readAt: new Date() })
    .where(eq(notifications.id, id))
    .returning()

  return { data: updated }
})
