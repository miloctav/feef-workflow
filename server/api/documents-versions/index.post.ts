import { db } from '~~/server/database'
import { documentaryReviews, documentVersions, entities, accountsToEntities } from '~~/server/database/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { uploadFile } from '~~/server/services/minio'
import { getMimeTypeFromFilename } from '~~/server/utils/mimeTypes'

export default defineEventHandler(async (event) => {
  // Authentification
  const { user } = await requireUserSession(event)

  // Lire les données multipart (formulaire avec fichier)
  const formData = await readMultipartFormData(event)

  if (!formData || formData.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Aucune donnée reçue',
    })
  }

  // Extraire le documentaryReviewId et le fichier
  let documentaryReviewId: number | null = null
  let fileData: { filename: string, data: Buffer } | null = null

  for (const part of formData) {
    if (part.name === 'documentaryReviewId') {
      documentaryReviewId = Number(part.data.toString())
    } else if (part.name === 'file' && part.filename) {
      fileData = {
        filename: part.filename,
        data: part.data,
      }
    }
  }

  // Validation
  if (!documentaryReviewId || isNaN(documentaryReviewId)) {
    throw createError({
      statusCode: 400,
      message: 'documentaryReviewId est obligatoire et doit être un nombre',
    })
  }

  if (!fileData) {
    throw createError({
      statusCode: 400,
      message: 'Aucun fichier fourni',
    })
  }

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

  // Déterminer le type MIME du fichier
  const mimeType = getMimeTypeFromFilename(fileData.filename)

  // Créer la nouvelle version (sans minioKey pour l'instant)
  const [newVersion] = await db.insert(documentVersions).values({
    documentaryReviewId,
    uploadBy: user.id,
    minioKey: null,
    mimeType,
  }).returning()

  // Uploader le fichier vers MinIO
  let uploadedMinioKey: string | null = null
  try {
    uploadedMinioKey = await uploadFile(
      fileData.data,
      fileData.filename,
      mimeType,
      documentaryReview.entityId,
      documentaryReviewId,
      newVersion.id
    )
  } catch (error) {
    // Si l'upload échoue, supprimer la version créée
    await db.delete(documentVersions).where(eq(documentVersions.id, newVersion.id))

    throw createError({
      statusCode: 500,
      message: 'Erreur lors de l\'upload du fichier vers le stockage',
    })
  }

  // Mettre à jour la version avec la clé MinIO
  await db.update(documentVersions)
    .set({ minioKey: uploadedMinioKey })
    .where(eq(documentVersions.id, newVersion.id))

  // Récupérer la version créée avec les infos de l'uploader et la clé
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
