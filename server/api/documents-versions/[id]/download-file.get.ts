import { db } from '~~/server/database'
import { documentVersions } from '~~/server/database/schema'
import { eq } from 'drizzle-orm'
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

  // Récupérer le nom de fichier depuis les query params (optionnel)
  const query = getQuery(event)
  const filename = query.filename as string | undefined

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

  // Déterminer le type de document et vérifier les permissions
  let entityId: number
  let isAudit = false

  if (version.documentaryReview) {
    if (version.documentaryReview.deletedAt) {
      throw createError({
        statusCode: 404,
        message: 'Document non trouvé',
      })
    }
    entityId = version.documentaryReview.entityId
  } else if (version.contract) {
    if (version.contract.deletedAt) {
      throw createError({
        statusCode: 404,
        message: 'Contrat non trouvé',
      })
    }
    entityId = version.contract.entityId
  } else if (version.audit) {
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
      if (version.audit.oeId !== user.oeId) {
        throw createError({
          statusCode: 403,
          message: 'Vous n\'avez pas accès à cet audit',
        })
      }
    } else if (user.role === Role.AUDITOR) {
      if (version.audit.auditorId !== user.id) {
        throw createError({
          statusCode: 403,
          message: 'Vous n\'êtes pas assigné à cet audit',
        })
      }
    }
  } else {
    throw createError({
      statusCode: 404,
      message: 'Document parent non trouvé',
    })
  }

  // Vérifier l'accès à l'entité (sauf si audit, déjà vérifié)
  if (!isAudit) {
    await requireEntityAccess({
      user,
      entityId,
      accessType: AccessType.READ,
      errorMessage: 'Vous n\'avez pas accès à ce fichier'
    })
  }

  // Générer l'URL signée
  try {
    const signedUrl = await getSignedUrl(version.s3Key)

    // Fetch le fichier depuis Garage (côté serveur, pas de CORS)
    const fileResponse = await fetch(signedUrl)

    if (!fileResponse.ok) {
      throw new Error('Impossible de récupérer le fichier depuis Garage')
    }

    // Récupérer le type MIME
    const contentType = version.mimeType || fileResponse.headers.get('content-type') || 'application/octet-stream'

    // Configurer les headers de réponse pour forcer le téléchargement
    setHeaders(event, {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename || 'document'}"`,
      'Cache-Control': 'no-cache',
    })

    // Streamer le fichier au client
    return fileResponse.body
  } catch (error) {
    console.error('Erreur lors du téléchargement du fichier:', error)
    throw createError({
      statusCode: 500,
      message: 'Erreur lors du téléchargement du fichier',
    })
  }
})
