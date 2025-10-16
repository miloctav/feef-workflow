import { db } from '~~/server/database'
import { documentaryReviews, documentVersions, entities, accountsToEntities } from '~~/server/database/schema'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // Authentification
  const { user } = await requireUserSession(event)

  // Lire le body
  const body = await readBody(event)

  // Validation du documentaryReviewId
  if (!body.documentaryReviewId || isNaN(Number(body.documentaryReviewId))) {
    throw createError({
      statusCode: 400,
      message: 'documentaryReviewId est obligatoire et doit être un nombre',
    })
  }

  const documentaryReviewId = Number(body.documentaryReviewId)

  // Récupérer le documentary review avec l'entité
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

  // Vérifier que l'entité n'est pas soft-deleted
  if (documentaryReview.entity.deletedAt) {
    throw createError({
      statusCode: 404,
      message: 'Entité non trouvée',
    })
  }

  // Autorisation basée sur le rôle
  if (user.role === Role.FEEF) {
    // FEEF a accès à tout
  } else if (user.role === Role.ENTITY) {
    // ENTITY doit être lié à l'entité via accountsToEntities
    const accountToEntity = await db.query.accountsToEntities.findFirst({
      where: and(
        eq(accountsToEntities.accountId, user.id),
        eq(accountsToEntities.entityId, documentaryReview.entityId)
      ),
    })

    if (!accountToEntity) {
      throw createError({
        statusCode: 403,
        message: 'Vous n\'avez pas accès à ce document',
      })
    }
  } else {
    throw createError({
      statusCode: 403,
      message: 'Seuls FEEF et ENTITY peuvent créer des versions',
    })
  }

  // Créer la nouvelle version
  const [newVersion] = await db.insert(documentVersions).values({
    documentaryReviewId,
    uploadBy: user.id,
    key: null,
  }).returning()

  // Récupérer la version créée avec les infos de l'uploader
  const versionWithUploader = await db.query.documentVersions.findFirst({
    where: eq(documentVersions.id, newVersion.id),
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
    data: versionWithUploader,
  }
})
