import { db } from '~~/server/database'
import { oe } from '~~/server/database/schema'
import { isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {

    const { user } = await requireUserSession(event)

    const oes = await db
      .select({
        id: oe.id,
        name: oe.name,
        createdAt: oe.createdAt,
      })
      .from(oe)
      .where(isNull(oe.deletedAt))
      .orderBy(oe.name)

    return {
      data: oes,
    }
})