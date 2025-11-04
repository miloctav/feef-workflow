import { db } from '~~/server/database'
import { documentaryReviews, documentVersions, contracts } from '~~/server/database/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { requireEntityAccess, AccessType } from '~~/server/utils/authorization'
import { Role } from '#shared/types/roles'

export default defineEventHandler(async (event) => {
  // Authentification
  const { user } = await requireUserSession(event)

  // Récupérer les query params
  const query = getQuery(event)
  const documentaryReviewId = query.documentaryReviewId ? Number(query.documentaryReviewId) : null
  const contractId = query.contractId ? Number(query.contractId) : null

  // Validation: exactement un des deux doit être fourni
  if ((!documentaryReviewId && !contractId) || (documentaryReviewId && contractId)) {
    throw createError({
      statusCode: 400,
      message: 'Vous devez fournir soit documentaryReviewId soit contractId',
    })
  }

  let entityId: number

  // Récupérer l'entityId selon le type de document
  if (documentaryReviewId) {
    const documentaryReview = await db.query.documentaryReviews.findFirst({
      where: and(
        eq(documentaryReviews.id, documentaryReviewId),
        isNull(documentaryReviews.deletedAt)
      ),
      with: {
        entity: true,
      },
    })

    if (!documentaryReview) {
      throw createError({
        statusCode: 404,
        message: 'Document non trouvé',
      })
    }

    entityId = documentaryReview.entityId
  } else {
    // contractId
    const contract = await db.query.contracts.findFirst({
      where: and(
        eq(contracts.id, contractId!),
        isNull(contracts.deletedAt)
      ),
      with: {
        entity: true,
      },
    })

    if (!contract) {
      throw createError({
        statusCode: 404,
        message: 'Contrat non trouvé',
      })
    }

    // Bloquer les auditeurs
    if (user.role === Role.AUDITOR) {
      throw createError({
        statusCode: 403,
        message: 'Les auditeurs n\'ont pas accès aux contrats',
      })
    }

    entityId = contract.entityId
  }

  // Vérifier l'accès à l'entité du document
  await requireEntityAccess({
    user,
    entityId,
    accessType: AccessType.READ,
    errorMessage: 'Vous n\'avez pas accès aux versions de ce document'
  })

  // Récupérer les versions triées par date (plus récente en premier)
  const whereCondition = documentaryReviewId
    ? eq(documentVersions.documentaryReviewId, documentaryReviewId)
    : eq(documentVersions.contractId, contractId!)

  const versions = await db.query.documentVersions.findMany({
    where: whereCondition,
    orderBy: [desc(documentVersions.uploadAt)],
    with: {
      uploadByAccount: {
        columns: {
          id: true,
          firstname: true,
          lastname: true,
        },
      },
    },
  })

  return {
    data: versions,
  }
})
