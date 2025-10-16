import { eq } from "drizzle-orm"
import { db } from "~~/server/database"
import { oes } from "~~/server/database/schema"
import { softDelete } from "~~/server/utils/softDelete"

export default defineEventHandler(async (event) => {
  
  const { user: currentUser } = await requireUserSession(event)

    if (currentUser.role !== Role.FEEF) {
    throw createError({
      statusCode: 403,
      message: 'Seul un administrateur FEEF peut supprimer des organismes évaluateurs',
    })
  }

  const oeId = getRouterParam(event, 'id')

  const oe = await db.query.oes.findFirst({
    where: eq(oes.id, parseInt(oeId || '0'))
  })

  if (!oe) {
    throw createError({
      statusCode: 404,
      message: 'Organisme évaluateur non trouvé'
    })
  }

  await softDelete(oes, eq(oes.id, parseInt(oeId || '0')))

  return {
    success: true
  }
})
