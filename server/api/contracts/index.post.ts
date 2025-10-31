import { db } from '~~/server/database'
import { contracts, documentaryReviews, documentsType, entities } from '~~/server/database/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { forInsert } from '~~/server/utils/tracking'

export default defineEventHandler(async (event) => {
  // Authentification et vérification du rôle FEEF
  const { user } = await requireUserSession(event)

  if (user.role !== Role.FEEF || user.role === Role.OE) {
    throw createError({
      statusCode: 403,
      message: 'Vous n\'avez pas la permission de créer un contrat',
    })
  }

  const body = await readBody(event)

  // Validation du entityId (obligatoire dans tous les cas)
  if (!body.entityId) {
    throw createError({
      statusCode: 400,
      message: 'entityId est obligatoire',
    })
  }

  // Vérifier que l'entité existe et n'est pas soft-deleted
  const entity = await db.query.entities.findFirst({
    where: and(
      eq(entities.id, body.entityId),
      isNull(entities.deletedAt)
    ),
  })

  if (!entity) {
    throw createError({
      statusCode: 404,
      message: 'Entité non trouvée',
    })
  }

  if(user.role === Role.OE && entity.oeId !== user.oeId) {
    throw createError({
      statusCode: 403,
      message: 'Vous ne pouvez créer un contrat que pour une entité de votre OE',
    })
  }

    // Validation des champs obligatoires
    if (!body.title) {
      throw createError({
        statusCode: 400,
        message: 'title est obligatoire lors de la création',
      })
    }
    
    const documentData: { title: any; description: any; oeId?: number } = {
      title: body.title,
      description: body.description,
    }
  
    if(user.role === Role.OE){
        documentData.oeId = user.oeId!
    }
  
  const [contract] = await db.insert(contracts)
    .values(forInsert(event, {
      entityId: body.entityId,
      title: documentData.title,
      description: documentData.description,
      oeId: documentData.oeId,
    }))
    .returning()

  return {
    data: contract,
  }
})
