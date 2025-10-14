import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { oes, Role } from '~~/server/database/schema'

interface UpdateOEBody {
  name?: string
}

export default defineEventHandler(async (event) => {
  console.log('[OE API] Modification d\'un OE')

  // Vérifier que l'utilisateur connecté est FEEF
  const { user: currentUser } = await requireUserSession(event)

  if (currentUser.role !== Role.FEEF) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Seul un administrateur FEEF peut modifier des oes',
    })
  }

  // Récupérer l'ID de l'OE à modifier
  const oeId = getRouterParam(event, 'id')

  if (!oeId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID de l\'OE manquant',
    })
  }

  const oeIdInt = parseInt(oeId)

  if (isNaN(oeIdInt)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID de l\'OE invalide',
    })
  }

  // Vérifier que l'OE existe
  const existingOE = await db.query.oes.findFirst({
    where: eq(oes.id, oeIdInt),
  })

  if (!existingOE) {
    throw createError({
      statusCode: 404,
      statusMessage: 'OE non trouvé',
    })
  }

  // Récupérer les données du corps de la requête
  const body = await readBody<UpdateOEBody>(event)

  const { name } = body

  // Vérifier qu'au moins un champ est fourni
  if (!name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Au moins un champ doit être fourni pour la modification',
    })
  }

  console.log('[OE API] Mise à jour de l\'OE', oeIdInt)

  // Préparer les données à mettre à jour
  const updateData: Partial<UpdateOEBody> = {}

  if (name !== undefined) updateData.name = name

  // Mettre à jour l'OE
  const [updatedOe] = await db
    .update(oes)
    .set(updateData)
    .where(eq(oes.id, oeIdInt))
    .returning({
      id: oes.id,
      name: oes.name,
    })

  console.log('[OE API] OE mis à jour avec ID', updatedOe.id)

  // Retourner l'OE mis à jour
  return {
    data: updatedOe,
  }
})
