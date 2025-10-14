import { db } from "~~/server/database"
import { oes } from "~~/server/database/schema"
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {

  await requireUserSession(event)


  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'ID de l\'OE requis'
    })
  }

    // Récupérer l'OE par son ID
    const oe = await db.query.oes.findFirst({
      where: eq(oes.id, parseInt(id)),
      columns: {
        id: true,
        name: true,
      }
    })

    if (!oe) {
      throw createError({
        statusCode: 404,
        message: 'OE non trouvé'
      })
    }

    return{
      data: oe
    }
})