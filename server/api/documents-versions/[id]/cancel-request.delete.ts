import { eq, isNotNull } from 'drizzle-orm'
import { db } from '~~/server/database'
import { documentVersions } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  // 1. Authentification
  const {user} = await requireUserSession(event)

  // 2. Récupérer l'ID de la version depuis les paramètres
  const versionId = parseInt(getRouterParam(event, 'id') || '')

  if (!versionId || isNaN(versionId)) {
    throw createError({
      statusCode: 400,
      message: 'ID de version invalide',
    })
  }

  // 3. Récupérer la version
  const version = await db.query.documentVersions.findFirst({
    where: eq(documentVersions.id, versionId),
  })

  if (!version) {
    throw createError({
      statusCode: 404,
      message: 'Version introuvable',
    })
  }

  // 4. Vérifier que c'est bien une demande (askedBy non null)
  if (!version.askedBy) {
    throw createError({
      statusCode: 400,
      message: 'Cette version n\'est pas une demande de mise à jour',
    })
  }

  console.log('version.askedBy', version.askedBy)
  console.log('user.id', user.id)

  // 5. Vérifier que l'utilisateur est celui qui a demandé
  if (version.askedBy !== parseInt(user.id)) {
    throw createError({
      statusCode: 403,
      message: 'Vous ne pouvez annuler que vos propres demandes',
    })
  }

  // 6. Vérifier que s3Key est toujours null (demande non encore satisfaite)
  if (version.s3Key !== null) {
    throw createError({
      statusCode: 400,
      message: 'Impossible d\'annuler : le document a déjà été uploadé',
    })
  }

  // 7. HARD DELETE de la version
  await db
    .delete(documentVersions)
    .where(eq(documentVersions.id, versionId))

  // 8. Retourner succès
  return {
    data: {
      success: true,
    },
  }
})
