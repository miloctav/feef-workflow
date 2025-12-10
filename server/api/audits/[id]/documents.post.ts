import { db } from '~~/server/database'
import { audits, documentVersions, entities, accountsToEntities } from '~~/server/database/schema'
import { eq, and, isNull, isNotNull, desc } from 'drizzle-orm'
import { uploadFile } from '~~/server/services/garage'
import { getMimeTypeFromFilename } from '~~/server/utils/mimeTypes'
import { auditStateMachine } from '~~/server/state-machine'
import { detectAndCompleteActionsForDocumentUpload, checkAndCompleteAllPendingActions } from '~~/server/services/actions'
import { Role } from '#shared/types/roles'
import type { AuditDocumentTypeType } from '~~/app/types/auditDocuments'

export default defineEventHandler(async (event) => {
  // Authentification
  const { user } = await requireUserSession(event)

  // Récupérer l'ID de l'audit depuis l'URL
  const auditId = Number(event.context.params?.id)

  if (!auditId || isNaN(auditId)) {
    throw createError({
      statusCode: 400,
      message: 'ID d\'audit invalide',
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

  // Extraire auditDocumentType et le fichier
  let auditDocumentType: string | null = null
  let fileData: { filename: string, data: Buffer } | null = null

  for (const part of formData) {
    if (part.name === 'auditDocumentType') {
      auditDocumentType = part.data.toString()
    } else if (part.name === 'file' && part.filename) {
      fileData = {
        filename: part.filename,
        data: part.data,
      }
    }
  }

  // Validation
  if (!auditDocumentType) {
    throw createError({
      statusCode: 400,
      message: 'Type de document d\'audit manquant',
    })
  }

  // Valider que le type de document est bien un des types attendus
  const validTypes = ['PLAN', 'REPORT', 'CORRECTIVE_PLAN', 'OE_OPINION']
  if (!validTypes.includes(auditDocumentType)) {
    throw createError({
      statusCode: 400,
      message: `Type de document invalide. Types valides: ${validTypes.join(', ')}`,
    })
  }

  if (!fileData) {
    throw createError({
      statusCode: 400,
      message: 'Aucun fichier fourni',
    })
  }

  // Récupérer l'audit et vérifier les autorisations
  const audit = await db.query.audits.findFirst({
    where: and(
      eq(audits.id, auditId),
      isNull(audits.deletedAt)
    ),
    with: {
      entity: true,
      oe: true,
    },
  })

  if (!audit) {
    throw createError({
      statusCode: 404,
      message: 'Audit non trouvé',
    })
  }

  if (audit.entity.deletedAt) {
    throw createError({
      statusCode: 404,
      message: 'Entité non trouvée',
    })
  }

  // Autorisation selon le type de document
  // PLAN et REPORT: FEEF, OE (qui gère l'audit), AUDITOR (assigné à l'audit)
  // CORRECTIVE_PLAN: FEEF, OE, ENTITY (qui appartient à l'entité de l'audit)
  if (user.role === Role.FEEF) {
    // FEEF a accès à tout
  } else if (auditDocumentType === 'PLAN' || auditDocumentType === 'REPORT') {
    // Pour PLAN et REPORT: OE ou AUDITOR uniquement
    if (user.role === Role.OE) {
      // Vérifier que l'OE est bien celui qui gère l'audit
      if (audit.oeId !== user.oeId) {
        throw createError({
          statusCode: 403,
          message: 'Seul l\'OE assigné à cet audit peut uploader ce document',
        })
      }
    } else if (user.role === Role.AUDITOR) {
      // Vérifier que l'auditeur est bien celui assigné à l'audit
      if (audit.auditorId !== user.id) {
        throw createError({
          statusCode: 403,
          message: 'Seul l\'auditeur assigné à cet audit peut uploader ce document',
        })
      }
    } else {
      throw createError({
        statusCode: 403,
        message: 'Seuls OE et AUDITOR peuvent uploader le plan ou le rapport d\'audit',
      })
    }
  } else if (auditDocumentType === 'CORRECTIVE_PLAN') {
    // Pour CORRECTIVE_PLAN: ENTITY uniquement (celle de l'audit)
    if (user.role === Role.ENTITY) {
      // Vérifier que l'utilisateur appartient bien à l'entité de l'audit
      const accountToEntity = await db.query.accountsToEntities.findFirst({
        where: and(
          eq(accountsToEntities.accountId, user.id),
          eq(accountsToEntities.entityId, audit.entityId)
        ),
      })

      if (!accountToEntity) {
        throw createError({
          statusCode: 403,
          message: 'Vous n\'avez pas accès à cet audit',
        })
      }
    } else if (user.role === Role.OE) {
      // L'OE peut aussi uploader le plan correctif si besoin
      if (audit.oeId !== user.oeId) {
        throw createError({
          statusCode: 403,
          message: 'Vous n\'avez pas accès à cet audit',
        })
      }
    } else {
      throw createError({
        statusCode: 403,
        message: 'Seule l\'entreprise peut uploader le plan d\'action correctif',
      })
    }
  } else if (auditDocumentType === 'OE_OPINION') {
    // Pour OE_OPINION: OE uniquement (celui qui gère l'audit)
    if (user.role === Role.OE) {
      if (audit.oeId !== user.oeId) {
        throw createError({
          statusCode: 403,
          message: 'Seul l\'OE assigné à cet audit peut uploader l\'avis',
        })
      }
    } else {
      throw createError({
        statusCode: 403,
        message: 'Seul l\'OE peut uploader l\'avis',
      })
    }
  }

  // Déterminer le type MIME du fichier
  const mimeType = getMimeTypeFromFilename(fileData.filename)

  // Chercher une demande de mise à jour en attente pour ce document (même type)
  const pendingRequest = await db.query.documentVersions.findFirst({
    where: and(
      eq(documentVersions.auditId, auditId),
      eq(documentVersions.auditDocumentType, auditDocumentType as any),
      isNull(documentVersions.s3Key),
      isNotNull(documentVersions.askedBy)
    ),
    orderBy: [desc(documentVersions.uploadAt)],
  })

  let newVersion: any

  if (pendingRequest) {
    // Une demande existe : mettre à jour cette version au lieu d'en créer une nouvelle
    const [updatedVersion] = await db
      .update(documentVersions)
      .set({
        s3Key: null, // Sera mis à jour après l'upload
        mimeType,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(documentVersions.id, pendingRequest.id))
      .returning()

    newVersion = updatedVersion
  } else {
    // Pas de demande : créer une nouvelle version normale
    const [createdVersion] = await db.insert(documentVersions).values(forInsert(event, {
      auditId,
      auditDocumentType: auditDocumentType as any,
      uploadBy: user.id,
      s3Key: null,
      mimeType,
    })).returning()

    newVersion = createdVersion
  }

  // Uploader le fichier vers Garage
  let uploadedS3Key: string | null = null
  try {
    uploadedS3Key = await uploadFile(
      fileData.data,
      fileData.filename,
      mimeType,
      audit.entityId,
      auditId,
      newVersion.id,
      'audit',
      auditDocumentType
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

  // Recharger l'audit pour avoir le statut le plus récent avant de vérifier les auto-transitions
  const freshAudit = await db.query.audits.findFirst({
    where: eq(audits.id, auditId)
  })

  if (freshAudit) {
    // Vérifier les auto-transitions via la state machine
    await auditStateMachine.checkAutoTransition(freshAudit, event)

    // Vérifier et compléter les actions en attente (ex: UPLOAD_AUDIT_PLAN)
    await checkAndCompleteAllPendingActions(freshAudit, user.id, event)
  }

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
      askedByAccount: {
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
