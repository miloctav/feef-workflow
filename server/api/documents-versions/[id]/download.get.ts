import { db } from '~~/server/database'
import { documentVersions, documentaryReviews, accountsToEntities } from '~~/server/database/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { getSignedUrl } from '~~/server/services/minio'

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

  // Récupérer la version avec le documentary review et l'entité
  const version = await db.query.documentVersions.findFirst({
    where: eq(documentVersions.id, versionId),
    with: {
      documentaryReview: {
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

  if (!version.minioKey) {
    throw createError({
      statusCode: 404,
      message: 'Fichier non disponible',
    })
  }

  // Vérifier que le documentary review n'est pas soft-deleted
  if (version.documentaryReview.deletedAt) {
    throw createError({
      statusCode: 404,
      message: 'Document non trouvé',
    })
  }

  // Vérifier que l'entité n'est pas soft-deleted
  if (version.documentaryReview.entity.deletedAt) {
    throw createError({
      statusCode: 404,
      message: 'Entité non trouvée',
    })
  }

  // Autorisation basée sur le rôle
  if (user.role === Role.FEEF) {
    // FEEF a accès à tout
  } else if (user.role === Role.OE) {
    // OE doit être assigné à l'entité
    if (version.documentaryReview.entity.oeId !== user.oeId) {
      throw createError({
        statusCode: 403,
        message: 'Vous n\'avez pas accès à ce fichier',
      })
    }
  } else if (user.role === Role.ENTITY || user.role === Role.AUDITOR) {
    // Utilisateur doit être lié à l'entité via accountsToEntities
    const accountToEntity = await db.query.accountsToEntities.findFirst({
      where: and(
        eq(accountsToEntities.accountId, user.id),
        eq(accountsToEntities.entityId, version.documentaryReview.entityId)
      ),
    })

    if (!accountToEntity) {
      throw createError({
        statusCode: 403,
        message: 'Vous n\'avez pas accès à ce fichier',
      })
    }
  } else {
    throw createError({
      statusCode: 403,
      message: 'Rôle non autorisé',
    })
  }

  // Générer l'URL signée (valide 1 heure)
  try {
    const signedUrl = await getSignedUrl(version.minioKey)

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
