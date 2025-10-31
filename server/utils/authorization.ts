import { eq, and, isNull, desc } from 'drizzle-orm'
import { db } from '~~/server/database'
import { accountsToEntities, audits, entities } from '~~/server/database/schema'
import { Role, OERole } from '#shared/types/roles'

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
  userId: number
  userRole: string
  entityId: number
  userOeId?: number | null
  accessType?: AccessType
  errorMessage?: string
}

/**
 * Paramètres pour la vérification d'accès à un audit
 */
export interface AuditAccessParams {
  userId: number
  userRole: string
  auditId: number
  userOeId?: number | null
  userOeRole?: string | null
  currentEntityId?: number | null
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
 * @param userId - ID de l'utilisateur
 * @param userRole - Rôle de l'utilisateur
 * @param entityId - ID de l'entité à vérifier
 * @param userOeId - ID de l'OE de l'utilisateur (requis pour rôle OE)
 * @param accessType - Type d'accès demandé (READ ou WRITE, défaut: READ)
 * @returns true si l'accès est autorisé, false sinon
 */
export async function verifyEntityAccessForUser(
  userId: number,
  userRole: string,
  entityId: number,
  userOeId?: number | null,
  accessType: AccessType = AccessType.READ
): Promise<boolean> {
  // FEEF a accès à tout
  if (userRole === Role.FEEF) {
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
        where: eq(accountsToEntities.accountId, userId)
      },
      // Pour AUDITOR : charger le dernier audit non supprimé
      audits: {
        where: isNull(audits.deletedAt),
        orderBy: [desc(audits.createdAt)],
        limit: 1
      }
    }
  })

  if (!entity) {
    return false
  }

  // OE : accès complet si entité assignée, ou lecture seule si candidature approuvée sans OE
  if (userRole === Role.OE) {
    // Accès complet (read + write) si l'entité est assignée à l'OE
    if (entity.oeId === userOeId) {
      return true
    }

    // Accès lecture seule si l'entité n'a pas d'OE mais sa candidature est approuvée
    if (accessType === AccessType.READ && entity.oeId === null && entity.caseApprovedAt !== null) {
      return true
    }

    return false
  }

  // ENTITY doit être lié via accountsToEntities
  if (userRole === Role.ENTITY) {
    return entity.accountsToEntities.length > 0
  }

  // AUDITOR doit être l'auditeur de l'audit le plus récent (non supprimé)
  if (userRole === Role.AUDITOR) {
    return entity.audits[0]?.auditorId === userId
  }

  // Rôle non reconnu
  return false
}

/**
 * Vérifie l'accès à une entité et lance une erreur 403 si refusé
 * Helper pour simplifier les endpoints
 *
 * @param params - Paramètres de vérification d'accès
 * @param params.userId - ID de l'utilisateur
 * @param params.userRole - Rôle de l'utilisateur
 * @param params.entityId - ID de l'entité à vérifier
 * @param params.userOeId - ID de l'OE de l'utilisateur (requis pour rôle OE)
 * @param params.accessType - Type d'accès demandé (READ ou WRITE, défaut: READ)
 * @param params.errorMessage - Message d'erreur personnalisé
 * @throws createError 403 si l'accès est refusé
 */
export async function requireEntityAccess(params: EntityAccessParams): Promise<void> {
  const {
    userId,
    userRole,
    entityId,
    userOeId,
    accessType = AccessType.READ,
    errorMessage = 'Vous n\'avez pas accès à cette entité'
  } = params

  const hasAccess = await verifyEntityAccessForUser(
    userId,
    userRole,
    entityId,
    userOeId,
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
 * @param userId - ID de l'utilisateur
 * @param userRole - Rôle de l'utilisateur
 * @param auditId - ID de l'audit à vérifier
 * @param userOeId - ID de l'OE de l'utilisateur (requis pour rôle OE)
 * @param userOeRole - Sous-rôle OE (ADMIN ou ACCOUNT_MANAGER)
 * @param currentEntityId - ID de l'entité courante (pour rôle ENTITY)
 * @param accessType - Type d'accès demandé (READ ou WRITE, défaut: READ)
 * @returns true si l'accès est autorisé, false sinon
 */
export async function verifyAuditAccessForUser(
  userId: number,
  userRole: string,
  auditId: number,
  userOeId?: number | null,
  userOeRole?: string | null,
  currentEntityId?: number | null,
  accessType: AccessType = AccessType.READ
): Promise<boolean> {
  // FEEF a accès à tout
  if (userRole === Role.FEEF) {
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
  if (userRole === Role.OE) {
    // 1. L'audit doit appartenir à mon OE
    if (audit.oeId !== userOeId) {
      return false
    }

    // 2. Si ACCOUNT_MANAGER, vérifier que je suis responsable de l'entité
    if (userOeRole === OERole.ACCOUNT_MANAGER) {
      if (audit.entity?.accountManagerId !== userId) {
        return false
      }
    }

    return true
  }

  // AUDITOR : accès complet si c'est son audit
  if (userRole === Role.AUDITOR) {
    return audit.auditorId === userId
  }

  // ENTITY : accès si l'audit appartient à l'entité courante
  if (userRole === Role.ENTITY) {
    return audit.entityId === currentEntityId
  }

  // Rôle non reconnu
  return false
}

/**
 * Vérifie l'accès à un audit et lance une erreur 403 si refusé
 * Helper pour simplifier les endpoints
 *
 * @param params - Paramètres de vérification d'accès
 * @param params.userId - ID de l'utilisateur
 * @param params.userRole - Rôle de l'utilisateur
 * @param params.auditId - ID de l'audit à vérifier
 * @param params.userOeId - ID de l'OE de l'utilisateur (requis pour rôle OE)
 * @param params.userOeRole - Sous-rôle OE (ADMIN ou ACCOUNT_MANAGER)
 * @param params.currentEntityId - ID de l'entité courante (pour rôle ENTITY)
 * @param params.accessType - Type d'accès demandé (READ ou WRITE, défaut: READ)
 * @param params.errorMessage - Message d'erreur personnalisé
 * @throws createError 403 si l'accès est refusé
 */
export async function requireAuditAccess(params: AuditAccessParams): Promise<void> {
  const {
    userId,
    userRole,
    auditId,
    userOeId,
    userOeRole,
    currentEntityId,
    accessType = AccessType.READ,
    errorMessage = 'Vous n\'avez pas accès à cet audit'
  } = params

  const hasAccess = await verifyAuditAccessForUser(
    userId,
    userRole,
    auditId,
    userOeId,
    userOeRole,
    currentEntityId,
    accessType
  )

  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      message: errorMessage,
    })
  }
}
