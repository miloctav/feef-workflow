import { db } from '~~/server/database'
import { contracts, entities } from '~~/server/database/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { forInsert } from '~~/server/utils/tracking'
import { requireEntityAccess, AccessType } from '~~/server/utils/authorization'
import { Role } from '#shared/types/roles'

export default defineEventHandler(async (event) => {
  // Authentification
  const { user } = await requireUserSession(event)

  // Vérifier que le rôle a la permission de créer des contrats
  if (user.role === Role.AUDITOR) {
    throw createError({
      statusCode: 403,
      message: 'Les auditeurs n\'ont pas la permission de créer des contrats',
    })
  }

  const body = await readBody(event)

  // Validation du title (obligatoire)
  if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
    throw createError({
      statusCode: 400,
      message: 'title est obligatoire et ne peut pas être vide',
    })
  }

  // Récupérer entityId depuis body OU user.currentEntityId pour ENTITY
  let entityId = body.entityId ? Number(body.entityId) : null

  // Si pas d'entityId fourni et que l'utilisateur est ENTITY, utiliser currentEntityId
  if (!entityId && user.role === Role.ENTITY) {
    if (!user.currentEntityId) {
      throw createError({
        statusCode: 400,
        message: 'Aucune entité associée à votre compte',
      })
    }
    entityId = user.currentEntityId
  } else if (!entityId) {
    throw createError({
      statusCode: 400,
      message: 'entityId est obligatoire',
    })
  }

  // Vérifier que l'entité existe et n'est pas soft-deleted
  const entity = await db.query.entities.findFirst({
    where: and(
      eq(entities.id, entityId),
      isNull(entities.deletedAt)
    ),
  })

  if (!entity) {
    throw createError({
      statusCode: 404,
      message: 'Entité non trouvée',
    })
  }

  // Autorisation selon le rôle
  let oeId: number | undefined = undefined

  if (user.role === Role.ENTITY) {
    // ENTITY : peut créer uniquement pour sa currentEntityId
    if (entityId !== user.currentEntityId) {
      throw createError({
        statusCode: 403,
        message: 'Vous ne pouvez créer un contrat que pour votre propre entité',
      })
    }
    // Vérifier l'accès via requireEntityAccess
    await requireEntityAccess({
      user,
      entityId,
      accessType: AccessType.WRITE,
      errorMessage: 'Vous n\'avez pas accès à cette entité'
    })

    // Utiliser forceOeId si fourni, sinon assigner automatiquement l'oeId de l'entité
    if (body.forceOeId !== undefined) {
      // forceOeId explicite : null pour FEEF, number pour OE
      oeId = body.forceOeId || undefined
    } else {
      // Auto : Si entity.oeId existe → contrat OE, sinon → contrat FEEF
      oeId = entity.oeId || undefined
    }
  } else if (user.role === Role.FEEF) {
    // FEEF : crée avec oeId=null
    oeId = undefined
  } else if (user.role === Role.OE) {
    // OE : peut créer uniquement si l'entité l'a choisi (entity.oeId === user.oeId)
    if (entity.oeId !== user.oeId) {
      throw createError({
        statusCode: 403,
        message: 'Vous ne pouvez créer un contrat que pour une entité qui vous a choisi comme OE',
      })
    }
    // Vérifier l'accès via requireEntityAccess
    await requireEntityAccess({
      user,
      entityId,
      accessType: AccessType.WRITE,
      errorMessage: 'Vous n\'avez pas accès à cette entité'
    })
    oeId = user.oeId!
  }

  // Créer le contrat
  const [contract] = await db.insert(contracts)
    .values(forInsert(event, {
      entityId,
      title: body.title,
      description: body.description || null,
      oeId: oeId || null,
    }))
    .returning()

  return {
    data: contract,
  }
})
