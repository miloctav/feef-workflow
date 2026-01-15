import { db } from '~~/server/database'
import { documentVersions } from '~~/server/database/schema'
import { eq } from 'drizzle-orm'
import { getSignedUrl } from '~~/server/services/garage'
import { requireEntityAccess, AccessType } from '~~/server/utils/authorization'
import { Role } from '#shared/types/roles'

/**
 * Endpoint pour récupérer le contenu texte d'un document
 * Contourne le problème CORS en proxifiant la requête côté serveur
 */
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const versionId = Number(getRouterParam(event, 'id'))

  if (isNaN(versionId)) {
    throw createError({
      statusCode: 400,
      message: 'ID de version invalide',
    })
  }

  // Récupérer la version avec permissions
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

  // Vérifier que le fichier existe
  if (!version.s3Key) {
    throw createError({
      statusCode: 404,
      message: 'Fichier non trouvé',
    })
  }

  // Déterminer l'entité associée
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
      errorMessage: 'Vous n\'avez pas accès à ce fichier',
    })
  }

  // Vérifier que c'est un fichier texte
  if (!version.mimeType || !['text/plain', 'text/csv'].includes(version.mimeType)) {
    throw createError({
      statusCode: 400,
      message: 'Ce fichier n\'est pas un fichier texte',
    })
  }

  // Générer l'URL signée
  const signedUrl = await getSignedUrl(version.s3Key)

  try {
    // Fetch le contenu depuis Garage (server-to-server, pas de CORS)
    const response = await fetch(signedUrl)

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération du fichier')
    }

    // Vérifier la taille
    const contentLength = response.headers.get('content-length')
    const MAX_SIZE = 2 * 1024 * 1024 // 2MB

    if (contentLength && parseInt(contentLength) > MAX_SIZE) {
      throw createError({
        statusCode: 413,
        message: 'Fichier trop volumineux (max 2MB)',
      })
    }

    const content = await response.text()

    return {
      data: {
        content,
        mimeType: version.mimeType,
        size: content.length,
      },
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Erreur lors du chargement du fichier',
    })
  }
})
