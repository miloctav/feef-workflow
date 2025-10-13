import { db } from '~~/server/database'
import { evaluatorOrganizations } from '~~/server/database/schema'
import { isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {

    const { user } = await requireUserSession(event)

    const oes = await db
      .select({
        id: evaluatorOrganizations.id,
        name: evaluatorOrganizations.name,
        createdAt: evaluatorOrganizations.createdAt,
      })
      .from(evaluatorOrganizations)
      .where(isNull(evaluatorOrganizations.deletedAt))
      .orderBy(evaluatorOrganizations.name)

    return {
      data: oes,
    }
})