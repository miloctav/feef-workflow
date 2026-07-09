import { and, eq, inArray, isNull, or } from 'drizzle-orm'
import { db } from '~~/server/database'
import { actions, audits, notifications } from '~~/server/database/schema'
import { forDelete, forUpdate } from '~~/server/utils/tracking'
import { requireAuditAccess, AccessType } from '~~/server/utils/authorization'
import { Role } from '#shared/types/roles'

/**
 * DELETE /api/audits/:id
 *
 * Supprime (soft delete) un audit ainsi que ce qui en dépend et resterait
 * visible dans l'application :
 * - les actions de l'audit sont annulées puis soft deleted (sinon elles
 *   continueraient d'apparaître dans les listes de tâches, notamment côté FEEF
 *   qui ne filtre pas sur les audits supprimés) ;
 * - les notifications rattachées à l'audit sont supprimées (elles pointeraient
 *   vers un audit inaccessible).
 *
 * Les notations, versions de documents et événements sont conservés : ils ne
 * sont accessibles qu'à travers l'audit et constituent la piste d'audit.
 *
 * Autorisations: FEEF et OE
 */
export default defineEventHandler(async (event) => {
  const { user: currentUser } = await requireUserSession(event)

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

  // Seuls FEEF et OE peuvent supprimer un audit (deny-by-default pour ENTITY/AUDITOR,
  // que requireAuditAccess ne bloque pas systématiquement en écriture)
  if (currentUser.role !== Role.FEEF && currentUser.role !== Role.OE) {
    throw createError({
      statusCode: 403,
      message: 'Vous n\'êtes pas autorisé à supprimer un audit',
    })
  }

  // Vérifier l'accès en écriture à l'audit
  await requireAuditAccess({
    user: currentUser,
    auditId: auditIdInt,
    accessType: AccessType.WRITE,
  })

  // Vérifier que l'audit existe
  const audit = await db.query.audits.findFirst({
    where: and(eq(audits.id, auditIdInt), isNull(audits.deletedAt)),
  })

  if (!audit) {
    throw createError({
      statusCode: 404,
      message: 'Audit non trouvé',
    })
  }

  await db.transaction(async (tx) => {
    // Annuler les actions encore en attente pour couper les relances et rappels
    await tx
      .update(actions)
      .set(forUpdate(event, { status: 'CANCELLED' }))
      .where(
        and(
          eq(actions.auditId, auditIdInt),
          eq(actions.status, 'PENDING'),
          isNull(actions.deletedAt),
        ),
      )

    // Puis les sortir définitivement des listes
    await tx
      .update(actions)
      .set(forDelete(event))
      .where(and(eq(actions.auditId, auditIdInt), isNull(actions.deletedAt)))

    // Les notifications n'ont pas de soft delete : suppression physique.
    // On vise aussi celles rattachées aux actions de l'audit, qui pointeraient
    // sinon vers une action devenue invisible.
    const auditActionIds = db
      .select({ id: actions.id })
      .from(actions)
      .where(eq(actions.auditId, auditIdInt))

    await tx
      .delete(notifications)
      .where(
        or(
          eq(notifications.auditId, auditIdInt),
          inArray(notifications.actionId, auditActionIds),
        ),
      )

    await tx
      .update(audits)
      .set(forDelete(event))
      .where(eq(audits.id, auditIdInt))
  })

  return {
    success: true,
  }
})
