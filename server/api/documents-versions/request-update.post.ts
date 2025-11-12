import { eq, and, isNull } from 'drizzle-orm'
import { db } from '~~/server/database'
import { documentVersions, documentaryReviews, contracts } from '~~/server/database/schema'
import { requireEntityAccess, AccessType } from '~~/server/utils/authorization'

export default defineEventHandler(async (event) => {
  // 1. Authentification
  const {user} = await requireUserSession(event)

  // 2. Parse body
  const body = await readBody(event)
  const { documentaryReviewId, contractId, comment } = body

  // Validation : exactement un des deux IDs doit être fourni
  if (
    (documentaryReviewId && contractId) ||
    (!documentaryReviewId && !contractId)
  ) {
    throw createError({
      statusCode: 400,
      message: 'Vous devez fournir soit documentaryReviewId soit contractId, mais pas les deux',
    })
  }

  let entityId: number

  // 3. Récupération du document parent et extraction de l'entityId
  if (documentaryReviewId) {
    const documentaryReview = await db.query.documentaryReviews.findFirst({
      where: and(
        eq(documentaryReviews.id, documentaryReviewId),
        isNull(documentaryReviews.deletedAt)
      ),
    })

    if (!documentaryReview) {
      throw createError({
        statusCode: 404,
        message: 'Revue documentaire introuvable',
      })
    }

    entityId = documentaryReview.entityId
  } else {
    // contractId
    const contract = await db.query.contracts.findFirst({
      where: and(
        eq(contracts.id, contractId),
        isNull(contracts.deletedAt)
      ),
    })

    if (!contract) {
      throw createError({
        statusCode: 404,
        message: 'Contrat introuvable',
      })
    }

    entityId = contract.entityId
  }

  // 4. Authorization : FEEF ou OE affecté (WRITE access)
  await requireEntityAccess({
    user,
    entityId,
    accessType: AccessType.WRITE,
    errorMessage: 'Vous n\'avez pas l\'autorisation de demander une mise à jour pour cette entité',
  })

  // 5. Créer la version "fantôme" (sans s3Key)
  const newVersionData = {
    documentaryReviewId: documentaryReviewId || null,
    contractId: contractId || null,
    uploadBy: user.id,
    askedBy: user.id,
    askedAt: new Date(),
    comment: comment || null,
    s3Key: null, // Pas de fichier pour une demande
    mimeType: null,
  }

  const [createdVersion] = await db
    .insert(documentVersions)
    .values(newVersionData)
    .returning()

  // 6. Récupérer la version créée avec les relations
  const versionWithRelations = await db.query.documentVersions.findFirst({
    where: eq(documentVersions.id, createdVersion.id),
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

  // 7. Retourner la version créée
  return {
    data: versionWithRelations,
  }
})
