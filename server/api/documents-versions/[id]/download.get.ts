import { db } from '~~/server/database'
import { documentVersions } from '~~/server/database/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { getSignedUrl } from '~~/server/services/garage'
import { requireEntityAccess, AccessType } from '~~/server/utils/authorization'

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

  if (!version.s3Key) {
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

  // Vérifier l'accès à l'entité du document
  await requireEntityAccess({
    user,
    entityId: version.documentaryReview.entityId,
    accessType: AccessType.READ,
    errorMessage: 'Vous n\'avez pas accès à ce fichier'
  })

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
