import { db } from '~~/server/database'
import { contracts } from '~~/server/database/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { requireEntityAccess, AccessType } from '~~/server/utils/authorization'
import { Role } from '#shared/types/roles'

export default defineEventHandler(async (event) => {
  // Authentification
  const { user } = await requireUserSession(event)

  // Récupérer l'ID depuis les params
  const id = getRouterParam(event, 'id')

  if (!id || isNaN(Number(id))) {
    throw createError({
      statusCode: 400,
      message: 'ID invalide',
    })
  }

  const contractId = Number(id)

  // Bloquer les auditeurs
  if (user.role === Role.AUDITOR) {
    throw createError({
      statusCode: 403,
      message: 'Les auditeurs n\'ont pas accès aux contrats',
    })
  }

  // Récupérer le contrat avec ses relations
  const contract = await db.query.contracts.findFirst({
    where: and(
      eq(contracts.id, contractId),
      isNull(contracts.deletedAt)
    ),
    with: {
      entity: true,
      oe: true,
      createdByAccount: {
        columns: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
        },
      },
      documentVersions: {
        where: (documentVersions, { isNull }) => isNull(documentVersions.updatedAt),
        orderBy: (documentVersions, { desc }) => [desc(documentVersions.uploadAt)],
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

  if (!contract) {
    throw createError({
      statusCode: 404,
      message: 'Contrat non trouvé',
    })
  }

  // Vérifier l'accès à l'entité du contrat
  await requireEntityAccess({
    user,
    entityId: contract.entityId,
    accessType: AccessType.READ,
    errorMessage: 'Vous n\'avez pas accès à ce contrat'
  })

  // Appliquer les filtres selon le rôle de l'utilisateur
  if (user.role === Role.OE) {
    // OE : voir uniquement les contrats avec oeId = user.oeId
    if (contract.oeId !== user.oeId) {
      throw createError({
        statusCode: 404,
        message: 'Contrat non trouvé',
      })
    }
  } else if (user.role === Role.FEEF) {
    // FEEF : voir uniquement les contrats avec oeId = null
    if (contract.oeId !== null) {
      throw createError({
        statusCode: 404,
        message: 'Contrat non trouvé',
      })
    }
  }
  // ENTITY : peut voir le contrat si elle a accès à l'entité (déjà vérifié par requireEntityAccess)

  return {
    data: contract,
  }
})
