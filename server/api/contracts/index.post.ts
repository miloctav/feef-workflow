import { db } from '~~/server/database'
import { contracts, entities, documentVersions } from '~~/server/database/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { forInsert } from '~~/server/utils/tracking'
import { requireEntityAccess, AccessType } from '~~/server/utils/authorization'
import { Role } from '#shared/types/roles'
import { uploadFile } from '~~/server/services/garage'
import { getMimeTypeFromFilename } from '~~/server/utils/mimeTypes'

export default defineEventHandler(async (event) => {
  // Authentification
  const { user } = await requireUserSession(event)

  // Vérifier que le rôle a la permission de créer des contrats
  if (user.role === Role.AUDITOR) {
    throw createError({
      statusCode: 403,
      message: 'Les auditeurs n\'ont pas la permission de créer des contrats',
    })
  }

  // Lire les données multipart (formulaire avec fichier)
  const formData = await readMultipartFormData(event)

  if (!formData || formData.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Aucune donnée reçue',
    })
  }

  // Extraire les champs du formulaire
  let title: string | null = null
  let description: string | null = null
  let entityIdStr: string | null = null
  let forceOeIdStr: string | null = null
  let requiresSignatureStr: string | null = null
  let signatureTypeStr: string | null = null
  let fileData: { filename: string, data: Buffer } | null = null

  for (const part of formData) {
    if (part.name === 'title') {
      title = part.data.toString()
    } else if (part.name === 'description') {
      description = part.data.toString()
    } else if (part.name === 'entityId') {
      entityIdStr = part.data.toString()
    } else if (part.name === 'forceOeId') {
      forceOeIdStr = part.data.toString()
    } else if (part.name === 'requiresSignature') {
      requiresSignatureStr = part.data.toString()
    } else if (part.name === 'signatureType') {
      signatureTypeStr = part.data.toString()
    } else if (part.name === 'file' && part.filename) {
      fileData = {
        filename: part.filename,
        data: part.data,
      }
    }
  }

  const body = {
    title,
    description,
    entityId: entityIdStr ? Number(entityIdStr) : null,
    forceOeId: forceOeIdStr === '' ? null : (forceOeIdStr ? Number(forceOeIdStr) : undefined),
    requiresSignature: requiresSignatureStr === 'true',
    signatureType: signatureTypeStr as 'ENTITY_ONLY' | 'ENTITY_AND_FEEF' | null,
  }

  // Validation du title (obligatoire)
  if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
    throw createError({
      statusCode: 400,
      message: 'title est obligatoire et ne peut pas être vide',
    })
  }

  // Validation du fichier (obligatoire)
  if (!fileData) {
    throw createError({
      statusCode: 400,
      message: 'Le fichier est obligatoire',
    })
  }

  // Récupérer entityId depuis body OU user.currentEntityId pour ENTITY
  let entityId = body.entityId ? Number(body.entityId) : null

  // Si pas d'entityId fourni et que l'utilisateur est ENTITY, utiliser currentEntityId
  if (!entityId && user.role === Role.ENTITY) {
    if (!user.currentEntityId) {
      throw createError({
        statusCode: 400,
        message: 'Aucune entité associée à votre compte',
      })
    }
    entityId = user.currentEntityId
  } else if (!entityId) {
    throw createError({
      statusCode: 400,
      message: 'entityId est obligatoire',
    })
  }

  // Vérifier que l'entité existe et n'est pas soft-deleted
  const entity = await db.query.entities.findFirst({
    where: and(
      eq(entities.id, entityId),
      isNull(entities.deletedAt)
    ),
  })

  if (!entity) {
    throw createError({
      statusCode: 404,
      message: 'Entité non trouvée',
    })
  }

  // Autorisation selon le rôle
  let oeId: number | undefined = undefined

  if (user.role === Role.ENTITY) {
    // ENTITY : peut créer uniquement pour sa currentEntityId
    if (entityId !== user.currentEntityId) {
      throw createError({
        statusCode: 403,
        message: 'Vous ne pouvez créer un contrat que pour votre propre entité',
      })
    }
    // Vérifier l'accès via requireEntityAccess
    await requireEntityAccess({
      user,
      entityId,
      accessType: AccessType.WRITE,
      errorMessage: 'Vous n\'avez pas accès à cette entité'
    })

    // ENTITY ne peut PAS créer de contrats FEEF (oeId = null)
    // Utiliser forceOeId si fourni, sinon assigner automatiquement l'oeId de l'entité
    if (body.forceOeId !== undefined) {
      // forceOeId explicite : null pour FEEF, number pour OE
      if (body.forceOeId === null) {
        throw createError({
          statusCode: 403,
          message: 'Les entités ne peuvent pas créer de contrats FEEF. Seuls les contrats OE sont autorisés.',
        })
      }
      oeId = body.forceOeId || undefined
    } else {
      // Auto : Si entity.oeId existe → contrat OE, sinon → interdire
      if (!entity.oeId) {
        throw createError({
          statusCode: 403,
          message: 'Vous devez avoir un OE assigné pour créer un contrat. Les entités ne peuvent pas créer de contrats FEEF.',
        })
      }
      oeId = entity.oeId || undefined
    }
  } else if (user.role === Role.FEEF) {
    // FEEF : crée avec oeId=null
    oeId = undefined
  } else if (user.role === Role.OE) {
    // OE : peut créer uniquement si l'entité l'a choisi (entity.oeId === user.oeId)
    if (entity.oeId !== user.oeId) {
      throw createError({
        statusCode: 403,
        message: 'Vous ne pouvez créer un contrat que pour une entité qui vous a choisi comme OE',
      })
    }
    // Vérifier l'accès via requireEntityAccess
    await requireEntityAccess({
      user,
      entityId,
      accessType: AccessType.WRITE,
      errorMessage: 'Vous n\'avez pas accès à cette entité'
    })
    oeId = user.oeId!
  }

  // Gérer les champs de signature (uniquement pour contrats FEEF)
  let requiresSignature = false
  let signatureType: 'ENTITY_ONLY' | 'ENTITY_AND_FEEF' | null = null
  let signatureStatus: 'DRAFT' | null = null

  if (body.requiresSignature) {
    // Signature uniquement pour contrats FEEF (oeId === null)
    if (oeId !== undefined) {
      throw createError({
        statusCode: 400,
        message: 'Les signatures ne sont disponibles que pour les contrats FEEF',
      })
    }

    // Valider que signatureType est fourni
    if (!body.signatureType || !['ENTITY_ONLY', 'ENTITY_AND_FEEF'].includes(body.signatureType)) {
      throw createError({
        statusCode: 400,
        message: 'signatureType est obligatoire quand requiresSignature est true (ENTITY_ONLY ou ENTITY_AND_FEEF)',
      })
    }

    requiresSignature = true
    signatureType = body.signatureType
    signatureStatus = 'DRAFT' // Le contrat commence en mode DRAFT
  }

  // Créer le contrat
  const [contract] = await db.insert(contracts)
    .values(forInsert(event, {
      entityId,
      title: body.title,
      description: body.description || null,
      oeId: oeId || null,
      requiresSignature,
      signatureType,
      signatureStatus,
    }))
    .returning()

  // Upload le fichier et créer la version
  try {
    // Déterminer le type MIME du fichier
    const mimeType = getMimeTypeFromFilename(fileData.filename)

    // Créer la nouvelle version (sans s3Key pour l'instant)
    const versionData = {
      contractId: contract.id,
      uploadBy: user.id,
      s3Key: null,
      mimeType,
    }

    const [newVersion] = await db.insert(documentVersions).values(forInsert(event, versionData)).returning()

    // Uploader le fichier vers Garage
    let uploadedS3Key: string | null = null
    try {
      uploadedS3Key = await uploadFile(
        fileData.data,
        fileData.filename,
        mimeType,
        entityId,
        contract.id,
        newVersion.id,
        'contract'
      )
    } catch (error) {
      // Si l'upload échoue, supprimer la version et le contrat créés
      await db.delete(documentVersions).where(eq(documentVersions.id, newVersion.id))
      await db.delete(contracts).where(eq(contracts.id, contract.id))

      throw createError({
        statusCode: 500,
        message: 'Erreur lors de l\'upload du fichier vers le stockage',
      })
    }

    // Mettre à jour la version avec la clé de stockage
    await db.update(documentVersions)
      .set({ s3Key: uploadedS3Key })
      .where(eq(documentVersions.id, newVersion.id))

    // Si le contrat a une signature requise, passer automatiquement de DRAFT à PENDING_ENTITY
    if (requiresSignature && signatureStatus === 'DRAFT') {
      await db.update(contracts)
        .set({
          signatureStatus: 'PENDING_ENTITY',
          updatedBy: user.id,
          updatedAt: new Date()
        })
        .where(eq(contracts.id, contract.id))
    }
  } catch (error: any) {
    // Si quelque chose échoue, supprimer le contrat
    await db.delete(contracts).where(eq(contracts.id, contract.id))

    throw createError({
      statusCode: 500,
      message: error.message || 'Erreur lors de la création du contrat',
    })
  }

  // Récupérer le contrat créé avec ses relations
  const createdContract = await db.query.contracts.findFirst({
    where: eq(contracts.id, contract.id),
    with: {
      entity: true,
      oe: true,
      createdByAccount: {
        columns: {
          id: true,
          firstname: true,
          lastname: true,
        },
      },
      documentVersions: {
        with: {
          uploadByAccount: {
            columns: {
              id: true,
              firstname: true,
              lastname: true,
            },
          },
        },
      },
    },
  })

  return {
    data: createdContract,
  }
})
