import { eq, and } from 'drizzle-orm'
import { db } from '~~/server/database'
import { accounts, auditorsToOE } from '~~/server/database/schema'
import { forUpdate } from '~~/server/utils/tracking'

interface UpdateAccountBody {
  firstname?: string
  lastname?: string
  email?: string
}

export default defineEventHandler(async (event) => {
  console.log('[Accounts API] Modification de compte')

  // Vérifier que l'utilisateur est authentifié
  const { user: currentUser } = await requireUserSession(event)

  // Récupérer l'ID du compte à modifier
  const accountId = getRouterParam(event, 'id')

  if (!accountId) {
    throw createError({
      statusCode: 400,
      message: 'ID du compte manquant',
    })
  }

  const accountIdInt = parseInt(accountId)

  if (isNaN(accountIdInt)) {
    throw createError({
      statusCode: 400,
      message: 'ID du compte invalide',
    })
  }

  // Vérifier que le compte existe
  const existingAccount = await db.query.accounts.findFirst({
    where: eq(accounts.id, accountIdInt),
  })

  if (!existingAccount) {
    throw createError({
      statusCode: 404,
      message: 'Compte non trouvé',
    })
  }

  // Vérifier les permissions
  if (currentUser.role === Role.FEEF) {
    // FEEF peut modifier tous les comptes
  } else if (currentUser.role === Role.OE && currentUser.oeRole === OERole.ADMIN) {
    // OE ADMIN peut modifier les comptes de son propre OE

    // Vérifier si c'est un compte OE de son organisation
    const isOwnOeAccount = existingAccount.role === Role.OE && existingAccount.oeId === currentUser.oeId

    // Vérifier si c'est un auditeur lié à son OE
    let isOwnAuditor = false
    if (existingAccount.role === Role.AUDITOR) {
      const auditorLink = await db.query.auditorsToOE.findFirst({
        where: and(
          eq(auditorsToOE.auditorId, accountIdInt),
          eq(auditorsToOE.oeId, currentUser.oeId!)
        ),
      })
      isOwnAuditor = !!auditorLink
    }

    if (!isOwnOeAccount && !isOwnAuditor) {
      throw createError({
        statusCode: 403,
        message: 'Vous ne pouvez modifier que les comptes de votre propre OE',
      })
    }
  } else {
    throw createError({
      statusCode: 403,
      message: 'Vous n\'êtes pas autorisé à modifier des comptes',
    })
  }

  // Récupérer les données du corps de la requête
  const body = await readBody<UpdateAccountBody>(event)

  const { firstname, lastname, email } = body

  // Vérifier qu'au moins un champ est fourni
  if (!firstname && !lastname && !email) {
    throw createError({
      statusCode: 400,
      message: 'Au moins un champ doit être fourni pour la modification',
    })
  }

  // Si l'email est modifié, vérifier qu'il n'est pas déjà utilisé par un autre compte
  if (email && email !== existingAccount.email) {
    const [emailExists] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.email, email))
      .limit(1)

    if (emailExists) {
      throw createError({
        statusCode: 409,
        message: 'Un compte avec cet email existe déjà',
      })
    }
  }

  console.log('[Accounts API] Mise à jour du compte', accountIdInt)

  // Préparer les données à mettre à jour
  const updateData: Partial<UpdateAccountBody> = {}

  if (firstname !== undefined) updateData.firstname = firstname
  if (lastname !== undefined) updateData.lastname = lastname
  if (email !== undefined) updateData.email = email

  // Mettre à jour le compte
  const [updatedAccount] = await db
    .update(accounts)
    .set(forUpdate(event, updateData))
    .where(eq(accounts.id, accountIdInt))
    .returning({
      id: accounts.id,
      firstname: accounts.firstname,
      lastname: accounts.lastname,
      email: accounts.email,
      role: accounts.role,
      oeId: accounts.oeId,
      oeRole: accounts.oeRole,
      isActive: accounts.isActive,
      createdAt: accounts.createdAt,
    })

  console.log('[Accounts API] Compte mis à jour avec ID', updatedAccount.id)

  // Retourner le compte mis à jour
  return {
    data: updatedAccount,
  }
})
