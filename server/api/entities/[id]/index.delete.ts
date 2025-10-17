import { eq } from "drizzle-orm"
import { db } from "~~/server/database"
import { entities } from "~~/server/database/schema"
import { softDelete } from "~~/server/utils/softDelete"

export default defineEventHandler(async (event) => {

  const { user: currentUser } = await requireUserSession(event)

  if (currentUser.role !== Role.FEEF) {
    throw createError({
      statusCode: 403,
      message: 'Seul un administrateur FEEF peut supprimer des entités',
    })
  }

  const entityId = getRouterParam(event, 'id')

  const entity = await db.query.entities.findFirst({
    where: eq(entities.id, parseInt(entityId || '0'))
  })

  if (!entity) {
    throw createError({
      statusCode: 404,
      message: 'Entité non trouvée'
    })
  }

  await softDelete(event, entities, eq(entities.id, parseInt(entityId || '0')))

  return {
    success: true
  }
})
