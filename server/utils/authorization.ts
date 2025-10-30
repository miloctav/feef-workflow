import { eq, and, isNull, desc } from 'drizzle-orm'
import { db } from '~~/server/database'
import { accountsToEntities, audits, entities } from '~~/server/database/schema'
import { Role } from '#shared/types/roles'

/**
 * Vérifie si un utilisateur a accès à une entité donnée
 *
 * Règles d'autorisation :
 * - FEEF : accès à toutes les entités
 * - OE : accès uniquement aux entités assignées à leur OE
 * - ENTITY : accès uniquement aux entités liées via accountsToEntities
 * - AUDITOR : accès uniquement aux entités dont il est l'auditeur de l'audit le plus récent
 *
 * @param userId - ID de l'utilisateur
 * @param userRole - Rôle de l'utilisateur
 * @param entityId - ID de l'entité à vérifier
 * @param userOeId - ID de l'OE de l'utilisateur (requis pour rôle OE)
 * @returns true si l'accès est autorisé, false sinon
 */
export async function verifyEntityAccessForUser(
  userId: number,
  userRole: string,
  entityId: number,
  userOeId?: number | null
): Promise<boolean> {
  // FEEF a accès à tout
  if (userRole === Role.FEEF) {
    return true
  }

  // Récupérer l'entité pour vérifier qu'elle existe et n'est pas supprimée
  const entity = await db.query.entities.findFirst({
    where: and(
      eq(entities.id, entityId),
      isNull(entities.deletedAt)
    ),
  })

  if (!entity) {
    return false
  }

  // OE doit être assigné à l'entité
  if (userRole === Role.OE) {
    return entity.oeId === userOeId
  }

  // ENTITY doit être lié via accountsToEntities
  if (userRole === Role.ENTITY) {
    const accountToEntity = await db.query.accountsToEntities.findFirst({
      where: and(
        eq(accountsToEntities.accountId, userId),
        eq(accountsToEntities.entityId, entityId)
      ),
    })
    return !!accountToEntity
  }

  // AUDITOR doit être l'auditeur de l'audit le plus récent (non supprimé)
  if (userRole === Role.AUDITOR) {
    const mostRecentAudit = await db.query.audits.findFirst({
      where: and(
        eq(audits.entityId, entityId),
        isNull(audits.deletedAt)
      ),
      orderBy: [desc(audits.createdAt)],
    })

    return mostRecentAudit?.auditorId === userId
  }

  // Rôle non reconnu
  return false
}

/**
 * Vérifie l'accès à une entité et lance une erreur 403 si refusé
 * Helper pour simplifier les endpoints
 *
 * @param userId - ID de l'utilisateur
 * @param userRole - Rôle de l'utilisateur
 * @param entityId - ID de l'entité à vérifier
 * @param userOeId - ID de l'OE de l'utilisateur (requis pour rôle OE)
 * @param errorMessage - Message d'erreur personnalisé
 * @throws createError 403 si l'accès est refusé
 */
export async function requireEntityAccess(
  userId: number,
  userRole: string,
  entityId: number,
  userOeId?: number | null,
  errorMessage = 'Vous n\'avez pas accès à cette entité'
): Promise<void> {
  const hasAccess = await verifyEntityAccessForUser(userId, userRole, entityId, userOeId)

  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      message: errorMessage,
    })
  }
}
