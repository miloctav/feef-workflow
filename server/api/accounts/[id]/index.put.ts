import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { accounts, Role } from '~~/server/database/schema'

interface UpdateAccountBody {
  firstname?: string
  lastname?: string
  email?: string
}

export default defineEventHandler(async (event) => {
  console.log('[Accounts API] Modification de compte')

  // Vérifier que l'utilisateur connecté est FEEF
  const { user: currentUser } = await requireUserSession(event)

  if (currentUser.role !== Role.FEEF) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Seul un administrateur FEEF peut modifier des comptes',
    })
  }

  // Récupérer l'ID du compte à modifier
  const accountId = getRouterParam(event, 'id')

  if (!accountId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID du compte manquant',
    })
  }

  const accountIdInt = parseInt(accountId)

  if (isNaN(accountIdInt)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID du compte invalide',
    })
  }

  // Vérifier que le compte existe
  const existingAccount = await db.query.accounts.findFirst({
    where: eq(accounts.id, accountIdInt),
  })

  if (!existingAccount) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Compte non trouvé',
    })
  }

  // Récupérer les données du corps de la requête
  const body = await readBody<UpdateAccountBody>(event)

  const { firstname, lastname, email } = body

  // Vérifier qu'au moins un champ est fourni
  if (!firstname && !lastname && !email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Au moins un champ doit être fourni pour la modification',
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
        statusMessage: 'Un compte avec cet email existe déjà',
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
    .set(updateData)
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
