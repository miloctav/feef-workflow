import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { audits } from '~~/server/database/schema'
import { softDelete } from '~~/server/utils/softDelete'
import { requireAuditAccess, AccessType } from '~~/server/utils/authorization'

/**
 * DELETE /api/audits/:id
 *
 * Supprime (soft delete) un audit
 *
 * Autorisations: FEEF et OE
 */
export default defineEventHandler(async (event) => {
  // Authentification requise
  const { user: currentUser } = await requireUserSession(event)

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

  // Vérifier l'accès en écriture à l'audit
  await requireAuditAccess({
    userId: currentUser.id,
    userRole: currentUser.role,
    auditId: auditIdInt,
    userOeId: currentUser.oeId,
    userOeRole: currentUser.oeRole,
    currentEntityId: currentUser.currentEntityId,
    accessType: AccessType.WRITE
  })

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
