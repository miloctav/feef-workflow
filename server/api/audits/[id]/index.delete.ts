import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { audits } from '~~/server/database/schema'
import { softDelete } from '~~/server/utils/softDelete'

/**
 * DELETE /api/audits/:id
 *
 * Supprime (soft delete) un audit
 *
 * Autorisations: FEEF et OE
 */
export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur est authentifié et a le rôle FEEF ou OE
  const { user: currentUser } = await requireUserSession(event)

  if (currentUser.role !== Role.FEEF && currentUser.role !== Role.OE) {
    throw createError({
      statusCode: 403,
      message: 'Accès refusé. Seuls les rôles FEEF et OE peuvent supprimer des audits.',
    })
  }

  // Récupérer l'ID de l'audit à supprimer
  const auditId = getRouterParam(event, 'id')

  if (!auditId) {
    throw createError({
      statusCode: 400,
      message: 'ID de l\'audit manquant',
    })
  }

  const auditIdInt = parseInt(auditId)

  if (isNaN(auditIdInt)) {
    throw createError({
      statusCode: 400,
      message: 'ID de l\'audit invalide',
    })
  }

  // Vérifier que l'audit existe
  const audit = await db.query.audits.findFirst({
    where: eq(audits.id, auditIdInt),
  })

  if (!audit) {
    throw createError({
      statusCode: 404,
      message: 'Audit non trouvé',
    })
  }

  // Soft delete de l'audit
  await softDelete(event, audits, eq(audits.id, auditIdInt))

  return {
    success: true,
  }
})
