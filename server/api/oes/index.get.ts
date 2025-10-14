import { db } from '~~/server/database'
import { oes as oesTable } from '~~/server/database/schema'
import { isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {

    const { user } = await requireUserSession(event)

    const oes = await db.query.oes.findMany({
      where: isNull(oesTable.deletedAt),
      columns: {
        id: true,
        name: true,
        createdAt: true,
      }
    })

    return {
      data: oes,
    }
})