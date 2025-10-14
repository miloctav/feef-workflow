import { db } from "~~/server/database"
import { oes } from "~~/server/database/schema"

interface CreateOEBody {
  name: string
}

export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur est authentifié et a le role FEEF
  const { user: currentUser } = await requireUserSession(event)

  if (currentUser.role !== 'FEEF') {
    throw createError({
      statusCode: 403,
      message: 'Accès refusé. Seul le role FEEF peut créer des OE.'
    })
  }

  const body = await readBody<CreateOEBody>(event)

  const { name } = body

  // Validation des champs requis
  if (!name ) {
    throw createError({
      statusCode: 400,
      message: 'Le name est requis.'
    })
  }

  const [newOE] = await db.insert(oes).values({ name }).returning()

  return {
    data: newOE
  }
})
