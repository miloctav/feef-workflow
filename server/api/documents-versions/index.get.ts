import { db } from '~~/server/database'
import { documentaryReviews, documentVersions, contracts, audits } from '~~/server/database/schema'
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
  const auditId = query.auditId ? Number(query.auditId) : null
  const auditDocumentType = query.auditDocumentType ? String(query.auditDocumentType) : null

  // Validation: exactement un des trois doit être fourni
  const providedParams = [documentaryReviewId, contractId, auditId].filter(Boolean).length

  if (providedParams === 0) {
    throw createError({
      statusCode: 400,
      message: 'Vous devez fournir soit documentaryReviewId, soit contractId, soit auditId',
    })
  }

  if (providedParams > 1) {
    throw createError({
      statusCode: 400,
      message: 'Vous ne pouvez fournir qu\'un seul paramètre parmi documentaryReviewId, contractId ou auditId',
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
  } else if (contractId) {
    const contract = await db.query.contracts.findFirst({
      where: and(
        eq(contracts.id, contractId),
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
  } else {
    // auditId
    const audit = await db.query.audits.findFirst({
      where: and(
        eq(audits.id, auditId!),
        isNull(audits.deletedAt)
      ),
      with: {
        entity: true,
      },
    })

    if (!audit) {
      throw createError({
        statusCode: 404,
        message: 'Audit non trouvé',
      })
    }

    entityId = audit.entityId

    // Vérifier les permissions pour les audits
    if (user.role === Role.OE) {
      // L'OE doit être celui qui gère l'audit
      if (audit.oeId !== user.oeId) {
        throw createError({
          statusCode: 403,
          message: 'Vous n\'avez pas accès à cet audit',
        })
      }
    } else if (user.role === Role.AUDITOR) {
      // L'auditeur doit être celui assigné à l'audit
      if (audit.auditorId !== user.id) {
        throw createError({
          statusCode: 403,
          message: 'Vous n\'êtes pas assigné à cet audit',
        })
      }
    }
    // FEEF a accès à tout
  }

  // Vérifier l'accès à l'entité du document (sauf si c'est un audit, déjà vérifié ci-dessus)
  if (!auditId) {
    await requireEntityAccess({
      user,
      entityId,
      accessType: AccessType.READ,
      errorMessage: 'Vous n\'avez pas accès aux versions de ce document'
    })
  }

  // Récupérer les versions triées par date (plus récente en premier)
  let whereCondition

  if (documentaryReviewId) {
    whereCondition = eq(documentVersions.documentaryReviewId, documentaryReviewId)
  } else if (contractId) {
    whereCondition = eq(documentVersions.contractId, contractId)
  } else {
    // auditId - filtrer aussi par type de document si fourni
    if (auditDocumentType) {
      whereCondition = and(
        eq(documentVersions.auditId, auditId!),
        eq(documentVersions.auditDocumentType, auditDocumentType as any)
      )
    } else {
      whereCondition = eq(documentVersions.auditId, auditId!)
    }
  }

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
      askedByAccount: {
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
