import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { accounts } from '~~/server/database/schema'
import { forUpdate } from '~~/server/utils/tracking'

export default defineEventHandler(async (event) => {
  console.log('[Cancel Email Change API] Annulation de changement d\'email')

  const { user: currentUser } = await requireUserSession(event)

  const accountId = getRouterParam(event, 'id')
  if (!accountId) {
    throw createError({
      statusCode: 400,
      message: 'ID du compte manquant'
    })
  }

  const accountIdInt = parseInt(accountId)
  if (isNaN(accountIdInt)) {
    throw createError({
      statusCode: 400,
      message: 'ID du compte invalide'
    })
  }

  // Authorization: only allow users to cancel their own email change request
  if (currentUser.id !== accountIdInt) {
    throw createError({
      statusCode: 403,
      message: 'Vous ne pouvez annuler que votre propre demande de changement d\'email'
    })
  }

  // Get existing account
  const existingAccount = await db.query.accounts.findFirst({
    where: eq(accounts.id, accountIdInt)
  })

  if (!existingAccount) {
    throw createError({
      statusCode: 404,
      message: 'Compte non trouvé'
    })
  }

  // Check if there's a pending email change
  if (!existingAccount.pendingEmail) {
    throw createError({
      statusCode: 400,
      message: 'Aucune demande de changement d\'email en cours'
    })
  }

  console.log('[Cancel Email Change API] Annulation pour le compte ID', accountIdInt)

  // Clear pending email and timestamp
  await db
    .update(accounts)
    .set(forUpdate(event, {
      pendingEmail: null,
      emailChangeRequestedAt: null
    }))
    .where(eq(accounts.id, accountIdInt))

  return {
    data: {
      success: true,
      message: 'La demande de changement d\'email a été annulée'
    }
  }
})
