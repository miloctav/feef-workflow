import { eq, and } from 'drizzle-orm'
import { db } from '~~/server/database'
import { accountsToEntities } from '~~/server/database/schema'

/**
 * DELETE /api/accounts-to-entities
 *
 * Supprime l'association entre un compte et une entité
 *
 * Query params:
 * - accountId: ID du compte (requis)
 * - entityId: ID de l'entité (requis)
 */
export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur connecté est FEEF
  const { user } = await requireUserSession(event)

  if (user.role !== Role.FEEF) {
    throw createError({
      statusCode: 403,
      message: 'Seul un administrateur FEEF peut supprimer des associations compte-entité',
    })
  }

  // Récupérer les paramètres de la requête
  const query = getQuery(event)
  const accountId = query.accountId ? Number(query.accountId) : undefined
  const entityId = query.entityId ? Number(query.entityId) : undefined

  // Validation
  if (!accountId || !entityId) {
    throw createError({
      statusCode: 400,
      message: 'accountId et entityId sont requis',
    })
  }

  // Vérifier que l'association existe
  const [existingAssociation] = await db
    .select()
    .from(accountsToEntities)
    .where(
      and(
        eq(accountsToEntities.accountId, accountId),
        eq(accountsToEntities.entityId, entityId)
      )
    )
    .limit(1)

  if (!existingAssociation) {
    throw createError({
      statusCode: 404,
      message: 'Association compte-entité introuvable',
    })
  }

  // Supprimer l'association
  await db
    .delete(accountsToEntities)
    .where(
      and(
        eq(accountsToEntities.accountId, accountId),
        eq(accountsToEntities.entityId, entityId)
      )
    )

  return {
    data: {
      success: true,
      message: 'Association supprimée avec succès',
    },
  }
})
