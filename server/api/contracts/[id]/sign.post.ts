import { db } from '~~/server/database'
import { contracts, documentVersions, accountsToEntities } from '~~/server/database/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { uploadFile } from '~~/server/services/garage'
import { getMimeTypeFromFilename } from '~~/server/utils/mimeTypes'
import { Role } from '#shared/types/roles'
import { recordEvent } from '~~/server/services/events'

export default defineEventHandler(async (event) => {
  // Authentification
  const { user } = await requireUserSession(event)

  // Récupérer l'ID du contrat depuis les paramètres de route
  const contractId = Number(getRouterParam(event, 'id'))

  if (isNaN(contractId)) {
    throw createError({
      statusCode: 400,
      message: 'ID de contrat invalide',
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

  // Extraire le fichier
  let fileData: { filename: string, data: Buffer } | null = null

  for (const part of formData) {
    if (part.name === 'file' && part.filename) {
      fileData = {
        filename: part.filename,
        data: part.data,
      }
    }
  }

  if (!fileData) {
    throw createError({
      statusCode: 400,
      message: 'Aucun fichier fourni',
    })
  }

  // Récupérer le contrat
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

  if (contract.entity.deletedAt) {
    throw createError({
      statusCode: 404,
      message: 'Entité non trouvée',
    })
  }

  // Vérifier que le contrat requiert une signature
  if (!contract.requiresSignature) {
    throw createError({
      statusCode: 400,
      message: 'Ce contrat ne requiert pas de signature',
    })
  }

  // Vérifier que c'est un contrat FEEF (oeId doit être null)
  if (contract.oeId !== null) {
    throw createError({
      statusCode: 400,
      message: 'Seuls les contrats FEEF peuvent être signés via ce processus',
    })
  }

  // Déterminer qui doit signer et vérifier les autorisations
  let isEntitySigning = false
  let isFeefSigning = false

  if (contract.signatureStatus === 'PENDING_ENTITY') {
    // L'entity doit signer
    if (user.role !== Role.ENTITY) {
      throw createError({
        statusCode: 403,
        message: 'Seuls les utilisateurs ENTITY peuvent signer à cette étape',
      })
    }

    // Vérifier que l'utilisateur a le rôle SIGNATORY pour cette entity
    const accountToEntity = await db.query.accountsToEntities.findFirst({
      where: and(
        eq(accountsToEntities.accountId, user.id),
        eq(accountsToEntities.entityId, contract.entityId)
      ),
    })

    if (!accountToEntity || accountToEntity.role !== 'SIGNATORY') {
      throw createError({
        statusCode: 403,
        message: 'Seuls les utilisateurs avec le rôle SIGNATORY peuvent signer ce contrat',
      })
    }

    isEntitySigning = true
  } else if (contract.signatureStatus === 'PENDING_FEEF') {
    // FEEF doit signer
    if (user.role !== Role.FEEF) {
      throw createError({
        statusCode: 403,
        message: 'Seuls les utilisateurs FEEF peuvent signer à cette étape',
      })
    }

    isFeefSigning = true
  } else {
    throw createError({
      statusCode: 400,
      message: `Le contrat ne peut pas être signé dans l'état actuel: ${contract.signatureStatus}`,
    })
  }

  // Déterminer le type MIME du fichier
  const mimeType = getMimeTypeFromFilename(fileData.filename)

  // Créer la nouvelle version (sans s3Key pour l'instant)
  const versionData = {
    contractId: contractId,
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
      contract.entityId,
      contractId,
      newVersion.id,
      'contract'
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

  // Mettre à jour le statut de signature du contrat
  const updateData: any = {
    updatedBy: user.id,
    updatedAt: new Date(),
  }

  if (isEntitySigning) {
    // Changer le statut selon le type de signature requis
    if (contract.signatureType === 'ENTITY_ONLY') {
      updateData.signatureStatus = 'COMPLETED'
    } else if (contract.signatureType === 'ENTITY_AND_FEEF') {
      updateData.signatureStatus = 'PENDING_FEEF'
    }
  } else if (isFeefSigning) {
    updateData.signatureStatus = 'COMPLETED'
  }

  await db.update(contracts)
    .set(updateData)
    .where(eq(contracts.id, contractId))

  // Enregistrer l'événement de signature
  if (isEntitySigning) {
    await recordEvent(event, {
      type: 'CONTRACT_ENTITY_SIGNED',
      contractId: contractId,
      entityId: contract.entityId,
      metadata: {
        signatureType: contract.signatureType,
        newStatus: updateData.signatureStatus,
        timestamp: new Date(),
      },
    })
  } else if (isFeefSigning) {
    await recordEvent(event, {
      type: 'CONTRACT_FEEF_SIGNED',
      contractId: contractId,
      entityId: contract.entityId,
      metadata: {
        newStatus: updateData.signatureStatus,
        timestamp: new Date(),
      },
    })
  }

  // Récupérer le contrat mis à jour avec toutes les relations
  const updatedContract = await db.query.contracts.findFirst({
    where: eq(contracts.id, contractId),
    with: {
      entity: true,
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

  if (!updatedContract) {
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la récupération du contrat mis à jour',
    })
  }

  // Déclencher la complétion des actions liées à la signature du contrat
  const { detectAndCompleteActionsForContractSign } = await import('~~/server/services/actions')
  await detectAndCompleteActionsForContractSign(
    updatedContract,
    user.id,
    event
  )

  return {
    data: updatedContract,
  }
})
