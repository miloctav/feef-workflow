import { eq, and } from 'drizzle-orm'
import { db } from '~~/server/database'
import { accountsToEntities, entities } from '~~/server/database/schema'
import type { EntityRoleType } from '#shared/types/roles'

/**
 * Récupère le contexte d'une entité pour un utilisateur donné
 * Retourne l'entité complète et le rôle de l'utilisateur sur cette entité
 */
export async function getEntityContext(userId: number, entityId: number) {
  const accountToEntity = await db.query.accountsToEntities.findFirst({
    where: and(
      eq(accountsToEntities.accountId, userId),
      eq(accountsToEntities.entityId, entityId)
    ),
    with: {
      entity: true,
    },
  })

  if (!accountToEntity) {
    return null
  }

  return {
    entity: accountToEntity.entity,
    role: accountToEntity.role as EntityRoleType,
  }
}

/**
 * Vérifie qu'un utilisateur a accès à une entité donnée
 * Retourne true si l'accès est autorisé, false sinon
 */
export async function verifyEntityAccess(userId: number, entityId: number): Promise<boolean> {
  const access = await db.query.accountsToEntities.findFirst({
    where: and(
      eq(accountsToEntities.accountId, userId),
      eq(accountsToEntities.entityId, entityId)
    ),
  })

  return !!access
}

/**
 * Récupère toutes les entités accessibles par un utilisateur avec leurs rôles
 */
export async function getUserEntities(userId: number) {
  const userEntities = await db.query.accountsToEntities.findMany({
    where: eq(accountsToEntities.accountId, userId),
    with: {
      entity: true,
    },
  })

  return userEntities.map(ate => ({
    entity: ate.entity,
    role: ate.role as EntityRoleType,
  }))
}
