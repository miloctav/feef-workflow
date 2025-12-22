import { db } from '~~/server/database'
import { contracts, documentVersions } from '~~/server/database/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { requireEntityAccess, AccessType } from '~~/server/utils/authorization'
import { Role } from '#shared/types/roles'

export default defineEventHandler(async (event) => {
  // Authentification
  const { user } = await requireUserSession(event)

  // Récupérer entityId depuis query params OU user.currentEntityId pour ENTITY
  const query = getQuery(event)
  let entityId = query.entityId ? Number(query.entityId) : null

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

  // Bloquer les auditeurs
  if (user.role === Role.AUDITOR) {
    throw createError({
      statusCode: 403,
      message: 'Les auditeurs n\'ont pas accès aux contrats',
    })
  }

  // Vérifier l'accès à l'entité
  await requireEntityAccess({
    user,
    entityId,
    accessType: AccessType.READ,
    errorMessage: 'Vous n\'avez pas accès aux contrats de cette entité'
  })

  // Construire les conditions de filtrage selon le rôle
  const whereConditions = [
    eq(contracts.entityId, entityId),
    isNull(contracts.deletedAt)
  ]

  // Appliquer les filtres selon le rôle de l'utilisateur
  if (user.role === Role.OE) {
    // OE : voir uniquement les contrats avec oeId = user.oeId
    if (!user.oeId) {
      return { data: [] }
    }
    whereConditions.push(eq(contracts.oeId, user.oeId))
  } else if (user.role === Role.FEEF) {
    // FEEF : voir uniquement les contrats avec oeId = null
    whereConditions.push(isNull(contracts.oeId))
  }
  // ENTITY : voir tous les contrats de l'entité (pas de filtre supplémentaire sur oeId)

  // Récupérer les contrats filtrés avec leurs relations
  const contractsData = await db.query.contracts.findMany({
    where: and(...whereConditions),
    with: {
      entity: true,
      oe: true,
      createdByAccount: {
        columns: {
          id: true,
          firstname: true,
          lastname: true,
        },
      },
      documentVersions: {
        orderBy: [desc(documentVersions.uploadAt)],
        limit: 1,
        with: {
          uploadByAccount: {
            columns: {
              id: true,
              firstname: true,
              lastname: true,
            },
          },
        },
      },
    },
  })

  return {
    data: contractsData,
  }
})
