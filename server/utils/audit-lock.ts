import { eq, and, isNull, desc } from 'drizzle-orm'
import { db } from '~~/server/database'
import { audits } from '~~/server/database/schema'
import { Role } from '#shared/types/roles'
import { isAuditStatusActive } from '#shared/utils/audit-status'
import type { SessionUser } from '~~/server/types/session'

/**
 * Vérifie si une entité a un audit actif (bloquant pour l'édition des champs versionnés)
 *
 * Un audit est considéré "actif" s'il existe et que son statut n'est PAS dans ['COMPLETED', 'REFUSED_BY_OE']
 *
 * @param entityId - ID de l'entité à vérifier
 * @returns true si un audit actif existe (bloquant), false sinon
 */
export async function hasActiveAudit(entityId: number): Promise<boolean> {
  // Récupérer le dernier audit de l'entité (non supprimé)
  const latestAudit = await db.query.audits.findFirst({
    where: and(
      eq(audits.entityId, entityId),
      isNull(audits.deletedAt)
    ),
    orderBy: [desc(audits.createdAt)],
    columns: {
      id: true,
      status: true
    }
  })

  // Si aucun audit n'existe, les champs ne sont pas verrouillés
  if (!latestAudit) {
    return false
  }

  // Vérifier si le statut de l'audit est actif (bloquant)
  return isAuditStatusActive(latestAudit.status)
}

/**
 * Vérifie si un utilisateur peut modifier les champs versionnés d'une entité
 *
 * Règles d'autorisation :
 * - FEEF : peut toujours modifier (bypass du verrouillage audit)
 * - ENTITY : peut modifier uniquement si aucun audit actif
 * - OE : ne peut jamais modifier (lecture seule)
 * - AUDITOR : ne peut jamais modifier (lecture seule)
 *
 * @param user - Utilisateur connecté (de requireUserSession)
 * @param entityId - ID de l'entité concernée
 * @returns true si l'utilisateur peut modifier, false sinon
 */
export async function canEditVersionedFields(user: SessionUser, entityId: number): Promise<boolean> {
  // FEEF peut toujours modifier (bypass total)
  if (user.role === Role.FEEF) {
    return true
  }

  // OE et AUDITOR ne peuvent jamais modifier les champs versionnés
  if (user.role === Role.OE || user.role === Role.AUDITOR) {
    return false
  }

  // ENTITY : vérifier s'il y a un audit actif
  if (user.role === Role.ENTITY) {
    const auditActive = await hasActiveAudit(entityId)
    return !auditActive // Peut modifier uniquement si PAS d'audit actif
  }

  // Rôle non reconnu : refuser par défaut
  return false
}

/**
 * Vérifie l'accès à l'édition des champs versionnés et lance une erreur 403 si refusé
 * Helper pour simplifier les endpoints API
 *
 * @param user - Utilisateur connecté (de requireUserSession)
 * @param entityId - ID de l'entité concernée
 * @throws createError 403 si l'utilisateur ne peut pas modifier les champs versionnés
 */
export async function requireVersionedFieldsEditAccess(user: SessionUser, entityId: number): Promise<void> {
  const canEdit = await canEditVersionedFields(user, entityId)

  if (!canEdit) {
    throw createError({
      statusCode: 403,
      message: 'Impossible de modifier les champs versionnés pendant un audit en cours. Veuillez attendre la fin de l\'audit (statut COMPLETED) pour effectuer des modifications.',
    })
  }
}
