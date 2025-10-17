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
  // V�rifier que l'utilisateur est authentifi� et a le r�le FEEF ou OE
  const { user: currentUser } = await requireUserSession(event)

  if (currentUser.role !== Role.FEEF && currentUser.role !== Role.OE) {
    throw createError({
      statusCode: 403,
      message: 'Acc�s refus�. Seuls les r�les FEEF et OE peuvent supprimer des audits.',
    })
  }

  // R�cup�rer l'ID de l'audit � supprimer
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

  // V�rifier que l'audit existe
  const audit = await db.query.audits.findFirst({
    where: eq(audits.id, auditIdInt),
  })

  if (!audit) {
    throw createError({
      statusCode: 404,
      message: 'Audit non trouv�',
    })
  }

  // Soft delete de l'audit
  await softDelete(event, audits, eq(audits.id, auditIdInt))

  return {
    success: true,
  }
})
