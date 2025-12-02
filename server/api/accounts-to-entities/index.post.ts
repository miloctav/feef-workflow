import { eq, and } from 'drizzle-orm'
import { db } from '~~/server/database'
import { accounts, entities, accountsToEntities } from '~~/server/database/schema'
import { forCreate } from '~~/server/utils/tracking'

interface CreateAccountToEntityBody {
  accountId: number
  entityId: number
  role: string
}

/**
 * POST /api/accounts-to-entities
 *
 * Crée une association entre un compte et une entité
 *
 * Body:
 * - accountId: ID du compte (requis)
 * - entityId: ID de l'entité (requis)
 * - role: Rôle du compte dans l'entité - SIGNATORY ou PROCESS_MANAGER (requis)
 */
export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur connecté est FEEF
  const { user } = await requireUserSession(event)

  if (user.role !== Role.FEEF) {
    throw createError({
      statusCode: 403,
      message: 'Seul un administrateur FEEF peut créer des associations compte-entité',
    })
  }

  // Récupérer les données du corps de la requête
  const body = await readBody<CreateAccountToEntityBody>(event)
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

  // Vérifier que le compte existe et a le rôle ENTITY
  const account = await db.query.accounts.findFirst({
    where: eq(accounts.id, accountId),
  })

  if (!account) {
    throw createError({
      statusCode: 404,
      message: 'Compte introuvable',
    })
  }

  if (account.role !== Role.ENTITY) {
    throw createError({
      statusCode: 400,
      message: 'Le compte doit avoir le rôle ENTITY',
    })
  }

  // Vérifier que l'entité existe
  const entity = await db.query.entities.findFirst({
    where: eq(entities.id, entityId),
  })

  if (!entity) {
    throw createError({
      statusCode: 404,
      message: 'Entité introuvable',
    })
  }

  // Vérifier que l'association n'existe pas déjà
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

  if (existingAssociation.length > 0) {
    throw createError({
      statusCode: 409,
      message: 'Cette association compte-entité existe déjà',
    })
  }

  // Créer l'association
  const [newAssociation] = await db
    .insert(accountsToEntities)
    .values({
      accountId,
      entityId,
      role: role as any,
    })
    .returning()

  console.log('[Accounts-to-Entities API] Association créée:', newAssociation)

  return {
    data: {
      success: true,
      association: newAssociation,
    },
  }
})
