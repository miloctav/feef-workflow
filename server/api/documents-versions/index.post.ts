import { db } from '~~/server/database'
import { documentaryReviews, documentVersions, entities, accountsToEntities, contracts } from '~~/server/database/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { uploadFile } from '~~/server/services/garage'
import { getMimeTypeFromFilename } from '~~/server/utils/mimeTypes'
import { Role } from '#shared/types/roles'

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

  // Extraire documentaryReviewId OU contractId et le fichier
  let documentaryReviewId: number | null = null
  let contractId: number | null = null
  let fileData: { filename: string, data: Buffer } | null = null

  for (const part of formData) {
    if (part.name === 'documentaryReviewId') {
      documentaryReviewId = Number(part.data.toString())
    } else if (part.name === 'contractId') {
      contractId = Number(part.data.toString())
    } else if (part.name === 'file' && part.filename) {
      fileData = {
        filename: part.filename,
        data: part.data,
      }
    }
  }

  // Validation: exactement un des deux doit être fourni
  if ((!documentaryReviewId && !contractId) || (documentaryReviewId && contractId)) {
    throw createError({
      statusCode: 400,
      message: 'Vous devez fournir soit documentaryReviewId soit contractId',
    })
  }

  if (!fileData) {
    throw createError({
      statusCode: 400,
      message: 'Aucun fichier fourni',
    })
  }

  let entityId: number
  let documentId: number

  // Récupérer l'entité et vérifier les autorisations selon le type
  if (documentaryReviewId) {
    // DocumentaryReview
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

    if (documentaryReview.entity.deletedAt) {
      throw createError({
        statusCode: 404,
        message: 'Entité non trouvée',
      })
    }

    entityId = documentaryReview.entityId
    documentId = documentaryReviewId

    // Autorisation pour documentaryReview
    if (user.role === Role.FEEF) {
      // FEEF a accès à tout
    } else if (user.role === Role.ENTITY) {
      const accountToEntity = await db.query.accountsToEntities.findFirst({
        where: and(
          eq(accountsToEntities.accountId, user.id),
          eq(accountsToEntities.entityId, entityId)
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
        message: 'Seuls FEEF et ENTITY peuvent créer des versions de documents',
      })
    }
  } else {
    // Contract
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

    if (contract.entity.deletedAt) {
      throw createError({
        statusCode: 404,
        message: 'Entité non trouvée',
      })
    }

    // Bloquer les auditeurs pour les contrats
    if (user.role === Role.AUDITOR) {
      throw createError({
        statusCode: 403,
        message: 'Les auditeurs n\'ont pas accès aux contrats',
      })
    }

    entityId = contract.entityId
    documentId = contractId!

    // Autorisation pour contract (FEEF, OE, ENTITY peuvent uploader)
    if (user.role === Role.FEEF || user.role === Role.OE) {
      // FEEF et OE peuvent uploader
    } else if (user.role === Role.ENTITY) {
      const accountToEntity = await db.query.accountsToEntities.findFirst({
        where: and(
          eq(accountsToEntities.accountId, user.id),
          eq(accountsToEntities.entityId, entityId)
        ),
      })

      if (!accountToEntity) {
        throw createError({
          statusCode: 403,
          message: 'Vous n\'avez pas accès à ce contrat',
        })
      }
    } else {
      throw createError({
        statusCode: 403,
        message: 'Vous n\'avez pas la permission d\'uploader des versions de contrats',
      })
    }
  }

  // Déterminer le type MIME du fichier
  const mimeType = getMimeTypeFromFilename(fileData.filename)

  // Créer la nouvelle version (sans s3Key pour l'instant)
  const versionData: any = {
    uploadBy: user.id,
    s3Key: null,
    mimeType,
  }

  // Ajouter le bon ID selon le type
  if (documentaryReviewId) {
    versionData.documentaryReviewId = documentaryReviewId
  } else {
    versionData.contractId = contractId
  }

  const [newVersion] = await db.insert(documentVersions).values(forInsert(event, versionData)).returning()

  // Uploader le fichier vers Garage
  let uploadedS3Key: string | null = null
  const documentType = documentaryReviewId ? 'documentary-review' : 'contract'
  try {
    uploadedS3Key = await uploadFile(
      fileData.data,
      fileData.filename,
      mimeType,
      entityId,
      documentId,
      newVersion.id,
      documentType
    )
  } catch (error) {
    // Si l'upload échoue, supprimer la version créée
    await db.delete(documentVersions).where(eq(documentVersions.id, newVersion.id))

    throw createError({
      statusCode: 500,
      message: 'Erreur lors de l\'upload du fichier vers le stockage',
    })
  }

  // Mettre à jour la version avec la clé de stockage
  await db.update(documentVersions)
    .set({ s3Key: uploadedS3Key })
    .where(eq(documentVersions.id, newVersion.id))

  // Si c'est un contrat avec signature requise en DRAFT, passer à PENDING_ENTITY
  if (contractId && contract) {
    if (contract.requiresSignature && contract.signatureStatus === 'DRAFT') {
      await db.update(contracts)
        .set({
          signatureStatus: 'PENDING_ENTITY',
          updatedBy: user.id,
          updatedAt: new Date()
        })
        .where(eq(contracts.id, contractId))
    }
  }

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
