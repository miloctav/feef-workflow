import { db } from '~~/server/database'
import { documentVersions } from '~~/server/database/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { getSignedUrl } from '~~/server/services/garage'
import { requireEntityAccess, AccessType } from '~~/server/utils/authorization'
import { Role } from '#shared/types/roles'

export default defineEventHandler(async (event) => {
  // Authentification
  const { user } = await requireUserSession(event)

  // Récupérer l'ID de la version depuis les params
  const id = getRouterParam(event, 'id')

  if (!id || isNaN(Number(id))) {
    throw createError({
      statusCode: 400,
      message: 'ID invalide',
    })
  }

  const versionId = Number(id)

  // Récupérer la version avec le documentary review OU le contract OU l'audit et l'entité
  const version = await db.query.documentVersions.findFirst({
    where: eq(documentVersions.id, versionId),
    with: {
      documentaryReview: {
        with: {
          entity: true,
        },
      },
      contract: {
        with: {
          entity: true,
        },
      },
      audit: {
        with: {
          entity: true,
        },
      },
    },
  })

  if (!version) {
    throw createError({
      statusCode: 404,
      message: 'Version non trouvée',
    })
  }

  if (!version.s3Key) {
    throw createError({
      statusCode: 404,
      message: 'Fichier non disponible',
    })
  }

  // Déterminer le type de document (documentaryReview, contract ou audit)
  let entityId: number
  let isAudit = false

  if (version.documentaryReview) {
    // Vérifier que le documentary review n'est pas soft-deleted
    if (version.documentaryReview.deletedAt) {
      throw createError({
        statusCode: 404,
        message: 'Document non trouvé',
      })
    }
    entityId = version.documentaryReview.entityId
  } else if (version.contract) {
    // Vérifier que le contract n'est pas soft-deleted
    if (version.contract.deletedAt) {
      throw createError({
        statusCode: 404,
        message: 'Contrat non trouvé',
      })
    }
    entityId = version.contract.entityId
  } else if (version.audit) {
    // Vérifier que l'audit n'est pas soft-deleted
    if (version.audit.deletedAt) {
      throw createError({
        statusCode: 404,
        message: 'Audit non trouvé',
      })
    }
    entityId = version.audit.entityId
    isAudit = true

    // Vérifier les permissions pour les audits
    if (user.role === Role.OE) {
      // L'OE doit être celui qui gère l'audit
      if (version.audit.oeId !== user.oeId) {
        throw createError({
          statusCode: 403,
          message: 'Vous n\'avez pas accès à cet audit',
        })
      }
    } else if (user.role === Role.AUDITOR) {
      // L'auditeur doit être celui assigné à l'audit
      if (version.audit.auditorId !== user.id) {
        throw createError({
          statusCode: 403,
          message: 'Vous n\'êtes pas assigné à cet audit',
        })
      }
    }
    // FEEF a accès à tout
  } else {
    throw createError({
      statusCode: 404,
      message: 'Document parent non trouvé',
    })
  }

  // Vérifier l'accès à l'entité du document (sauf si c'est un audit, déjà vérifié ci-dessus)
  if (!isAudit) {
    await requireEntityAccess({
      user,
      entityId,
      accessType: AccessType.READ,
      errorMessage: 'Vous n\'avez pas accès à ce fichier'
    })
  }

  // Générer l'URL signée (valide 1 heure)
  try {
    const signedUrl = await getSignedUrl(version.s3Key)

    return {
      data: {
        url: signedUrl,
      },
    }
  } catch (error) {
    console.error('Erreur lors de la génération de l\'URL signée:', error)
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la génération du lien de téléchargement',
    })
  }
})
