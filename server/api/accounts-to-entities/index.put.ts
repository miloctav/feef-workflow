import { eq, and } from 'drizzle-orm'
import { db } from '~~/server/database'
import { accountsToEntities } from '~~/server/database/schema'

interface UpdateAccountToEntityBody {
  accountId: number
  entityId: number
  role: string
}

/**
 * PUT /api/accounts-to-entities
 *
 * Met à jour le rôle d'une association existante entre un compte et une entité
 *
 * Body:
 * - accountId: ID du compte (requis)
 * - entityId: ID de l'entité (requis)
 * - role: Nouveau rôle du compte dans l'entité - SIGNATORY ou PROCESS_MANAGER (requis)
 */
export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur connecté est FEEF
  const { user } = await requireUserSession(event)

  if (user.role !== Role.FEEF) {
    throw createError({
      statusCode: 403,
      message: 'Seul un administrateur FEEF peut modifier des associations compte-entité',
    })
  }

  // Récupérer les données du corps de la requête
  const body = await readBody<UpdateAccountToEntityBody>(event)
  const { accountId, entityId, role } = body

  // Validation des champs requis
  if (!accountId || !entityId || !role) {
    throw createError({
      statusCode: 400,
      message: 'accountId, entityId et role sont requis',
    })
  }

  // Valider que le rôle est valide
  if (role !== EntityRole.SIGNATORY && role !== EntityRole.PROCESS_MANAGER) {
    throw createError({
      statusCode: 400,
      message: 'Le rôle doit être SIGNATORY ou PROCESS_MANAGER',
    })
  }

  // Vérifier que l'association existe
  const existingAssociation = await db
    .select()
    .from(accountsToEntities)
    .where(
      and(
        eq(accountsToEntities.accountId, accountId),
        eq(accountsToEntities.entityId, entityId)
      )
    )
    .limit(1)

  if (existingAssociation.length === 0) {
    throw createError({
      statusCode: 404,
      message: 'Association compte-entité introuvable',
    })
  }

  // Mettre à jour le rôle de l'association
  const [updatedAssociation] = await db
    .update(accountsToEntities)
    .set({
      role: role as any,
    })
    .where(
      and(
        eq(accountsToEntities.accountId, accountId),
        eq(accountsToEntities.entityId, entityId)
      )
    )
    .returning()

  console.log('[Accounts-to-Entities API] Rôle de l\'association mis à jour:', updatedAssociation)

  return {
    data: {
      success: true,
      association: updatedAssociation,
    },
  }
})
