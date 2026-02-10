import { eq, and, isNull, desc } from 'drizzle-orm'
import { db } from '~~/server/database'
import { accountsToEntities, audits, entities } from '~~/server/database/schema'
import { Role, OERole } from '#shared/types/roles'
import { AuditStatus } from '#shared/types/enums'
import type { SessionUser } from '~~/server/types/session'

/**
 * Types d'accès pour les autorisations
 */
export enum AccessType {
  READ = 'read',
  WRITE = 'write'
}

/**
 * Paramètres pour la vérification d'accès à une entité
 */
export interface EntityAccessParams {
  user: SessionUser
  entityId: number
  accessType?: AccessType
  errorMessage?: string
}

/**
 * Paramètres pour la vérification d'accès à un audit
 */
export interface AuditAccessParams {
  user: SessionUser
  auditId: number
  accessType?: AccessType
  errorMessage?: string
}

/**
 * Vérifie si un utilisateur a accès à une entité donnée
 *
 * Règles d'autorisation :
 * - FEEF : accès à toutes les entités
 * - OE : accès aux entités assignées à leur OE (read + write)
 *       OU accès en lecture seule aux entités sans OE avec candidature approuvée
 * - ENTITY : accès uniquement aux entités liées via accountsToEntities
 * - AUDITOR : accès uniquement aux entités dont il est l'auditeur de l'audit le plus récent
 *
 * @param user - Utilisateur connecté (de requireUserSession)
 * @param entityId - ID de l'entité à vérifier
 * @param accessType - Type d'accès demandé (READ ou WRITE, défaut: READ)
 * @returns true si l'accès est autorisé, false sinon
 */
export async function verifyEntityAccessForUser(
  user: SessionUser,
  entityId: number,
  accessType: AccessType = AccessType.READ
): Promise<boolean> {
  // FEEF a accès à tout
  if (user.role === Role.FEEF) {
    return true
  }

  // Récupérer l'entité avec toutes les relations nécessaires en UNE SEULE requête
  const entity = await db.query.entities.findFirst({
    where: and(
      eq(entities.id, entityId),
      isNull(entities.deletedAt)
    ),
    with: {
      // Pour ENTITY : charger les liens accountsToEntities filtrés par userId
      accountsToEntities: {
        where: eq(accountsToEntities.accountId, user.id)
      },
      // Pour AUDITOR : charger le dernier audit non supprimé
      audits: {
        where: isNull(audits.deletedAt),
        orderBy: [desc(audits.createdAt)],
        limit: 1
      },
      // NEW: Charger le groupe parent pour vérifier les permissions OE héritées
      parentGroup: {
        columns: {
          id: true,
          oeId: true,
          accountManagerId: true
        }
      }
    }
  })

  if (!entity) {
    return false
  }

  // OE : accès complet si entité assignée
  if (user.role === Role.OE) {
    // Cas spécial : entités avec un audit en appel d'offre (PENDING_OE_CHOICE)
    // Tous les OE peuvent voir ces entités en lecture seule
    const latestAudit = entity.audits[0]
    if (latestAudit?.status === AuditStatus.PENDING_OE_CHOICE && accessType === AccessType.READ) {
      return true
    }

    // 1. Accès direct : l'entité est assignée à l'OE
    if (entity.oeId === user.oeId) {
      if (user.oeRole === OERole.ACCOUNT_MANAGER && entity.accountManagerId !== user.id) {
        return false
      }
      return true
    }

    // 2. Accès hérité : l'entité est une suiveuse et son parent est assigné à l'OE
    if (entity.mode === 'FOLLOWER' && entity.parentGroup?.oeId === user.oeId) {
      // Si Account Manager, doit être responsable du parent
      if (user.oeRole === OERole.ACCOUNT_MANAGER && entity.parentGroup.accountManagerId !== user.id) {
        return false
      }
      return true
    }

    return false
  }

  // ENTITY doit être lié via accountsToEntities OU être une suiveuse de currentEntity
  if (user.role === Role.ENTITY) {
    // Accès direct via accountsToEntities
    if (entity.accountsToEntities.length > 0) {
      return true
    }

    // Accès aux entités suiveuses de currentEntity
    if (user.currentEntityId) {
      // Récupérer l'entité maître de l'utilisateur
      const masterEntity = await db.query.entities.findFirst({
        where: and(
          eq(entities.id, user.currentEntityId),
          isNull(entities.deletedAt)
        ),
        columns: {
          id: true,
          type: true,
          parentGroupId: true
        }
      })

      if (masterEntity) {
        // Si master est un GROUP : l'entité demandée doit avoir parentGroupId = masterEntity.id ET mode = FOLLOWER
        if (masterEntity.type === 'GROUP' && entity.parentGroupId === masterEntity.id && entity.mode === 'FOLLOWER') {
          return true
        }
        // Si master est une COMPANY : l'entité demandée doit être le parentGroup du master ET mode = FOLLOWER
        if (masterEntity.type === 'COMPANY' && masterEntity.parentGroupId === entityId && entity.mode === 'FOLLOWER') {
          return true
        }
      }
    }

    return false
  }

  // AUDITOR doit être l'auditeur de l'audit le plus récent (non supprimé)
  if (user.role === Role.AUDITOR) {
    return entity.audits[0]?.auditorId === user.id
  }

  // Rôle non reconnu
  return false
}

/**
 * Vérifie l'accès à une entité et lance une erreur 403 si refusé
 * Helper pour simplifier les endpoints
 *
 * @param params - Paramètres de vérification d'accès
 * @param params.user - Utilisateur connecté (de requireUserSession)
 * @param params.entityId - ID de l'entité à vérifier
 * @param params.accessType - Type d'accès demandé (READ ou WRITE, défaut: READ)
 * @param params.errorMessage - Message d'erreur personnalisé
 * @throws createError 403 si l'accès est refusé
 */
export async function requireEntityAccess(params: EntityAccessParams): Promise<void> {
  const {
    user,
    entityId,
    accessType = AccessType.READ,
    errorMessage = 'Vous n\'avez pas accès à cette entité'
  } = params

  const hasAccess = await verifyEntityAccessForUser(
    user,
    entityId,
    accessType
  )

  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      message: errorMessage,
    })
  }
}

/**
 * Vérifie si un utilisateur a accès à un audit donné
 *
 * Règles d'autorisation :
 * - FEEF : accès à tous les audits
 * - OE ADMIN : accès aux audits de leur OE (audit.oeId === userOeId)
 * - OE ACCOUNT_MANAGER : accès aux audits de leur OE dont ils sont responsables de l'entité
 *   (audit.oeId === userOeId ET audit.entity.accountManagerId === userId)
 * - AUDITOR : accès aux audits dont ils sont l'auditeur (audit.auditorId === userId)
 * - ENTITY : accès aux audits de leur entité courante (audit.entityId === currentEntityId)
 *
 * @param user - Utilisateur connecté (de requireUserSession)
 * @param auditId - ID de l'audit à vérifier
 * @param accessType - Type d'accès demandé (READ ou WRITE, défaut: READ)
 * @returns true si l'accès est autorisé, false sinon
 */
export async function verifyAuditAccessForUser(
  user: SessionUser,
  auditId: number,
  accessType: AccessType = AccessType.READ
): Promise<boolean> {
  // FEEF a accès à tout
  if (user.role === Role.FEEF) {
    return true
  }

  // Récupérer l'audit avec l'entité en UNE SEULE requête
  const audit = await db.query.audits.findFirst({
    where: and(
      eq(audits.id, auditId),
      isNull(audits.deletedAt)
    ),
    with: {
      entity: {
        columns: {
          id: true,
          accountManagerId: true
        }
      }
    }
  })

  if (!audit) {
    return false
  }

  // OE : vérifier l'appartenance à l'OE + restriction ACCOUNT_MANAGER
  if (user.role === Role.OE) {
    // Cas spécial : audits en appel d'offre (PENDING_OE_CHOICE)
    // Tous les OE peuvent voir ces audits en lecture seule
    if (audit.status === AuditStatus.PENDING_OE_CHOICE && accessType === AccessType.READ) {
      return true
    }

    // 1. L'audit doit appartenir à mon OE
    if (audit.oeId !== user.oeId) {
      return false
    }

    // 2. Si ACCOUNT_MANAGER, vérifier que je suis responsable de l'entité
    if (user.oeRole === OERole.ACCOUNT_MANAGER) {
      // audit.entity est une relation one-to-one, donc c'est un objet (pas un tableau)
      const entity = audit.entity as { id: number; accountManagerId: number } | undefined
      if (entity?.accountManagerId !== user.id) {
        return false
      }
    }

    return true
  }

  // AUDITOR : accès complet si c'est son audit
  if (user.role === Role.AUDITOR) {
    return audit.auditorId === user.id
  }

  // ENTITY : accès si l'audit appartient à l'entité courante
  if (user.role === Role.ENTITY) {
    return audit.entityId === user.currentEntityId
  }

  // Rôle non reconnu
  return false
}

/**
 * Vérifie l'accès à un audit et lance une erreur 403 si refusé
 * Helper pour simplifier les endpoints
 *
 * @param params - Paramètres de vérification d'accès
 * @param params.user - Utilisateur connecté (de requireUserSession)
 * @param params.auditId - ID de l'audit à vérifier
 * @param params.accessType - Type d'accès demandé (READ ou WRITE, défaut: READ)
 * @param params.errorMessage - Message d'erreur personnalisé
 * @throws createError 403 si l'accès est refusé
 */
export async function requireAuditAccess(params: AuditAccessParams): Promise<void> {
  const {
    user,
    auditId,
    accessType = AccessType.READ,
    errorMessage = 'Vous n\'avez pas accès à cet audit'
  } = params

  const hasAccess = await verifyAuditAccessForUser(
    user,
    auditId,
    accessType
  )

  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      message: errorMessage,
    })
  }
}
