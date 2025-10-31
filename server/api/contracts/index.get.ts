import { db } from '~~/server/database'
import { contracts } from '~~/server/database/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { requireEntityAccess, AccessType } from '~~/server/utils/authorization'
import { Role } from '#shared/types/roles'

export default defineEventHandler(async (event) => {
  // Authentification
  const { user } = await requireUserSession(event)

  // Récupérer entityId depuis query params
  const query = getQuery(event)
  const entityId = query.entityId ? Number(query.entityId) : null

  if (!entityId) {
    throw createError({
      statusCode: 400,
      message: 'entityId est obligatoire',
    })
  }

  // Vérifier l'accès à l'entité
  await requireEntityAccess({
    user,
    entityId,
    accessType: AccessType.READ,
    errorMessage: 'Vous n\'avez pas accès aux documents de cette entité'
  })

  if(user.role === Role.AUDITOR){
    throw createError({
      statusCode: 403,
      message: 'Les auditeurs n\'ont pas accès aux contrats des entités',
    })
  }

  // Construire les conditions de filtrage selon le rôle
  let whereConditions = [
    eq(contracts.entityId, entityId),
    isNull(contracts.deletedAt)
  ]

  // Appliquer les filtres selon le rôle de l'utilisateur
  if (user.role === Role.OE) {
    if (user.oeId) {
      whereConditions.push(eq(contracts.oeId, user.oeId))
    } else {
      return { data: [] }
    }
  } else if (user.role === Role.FEEF) {
    whereConditions.push(isNull(contracts.oeId))
  }

  // Récupérer les contracts filtrés
  const contractsData = await db.query.contracts.findMany({
    where: and(...whereConditions),
  })

  return {
    data: contractsData,
  }
})
