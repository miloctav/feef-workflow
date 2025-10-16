import { eq } from "drizzle-orm"
import { db } from "~~/server/database"
import { accounts } from "~~/server/database/schema"

export default defineEventHandler(async (event) => {
  
  const { user: currentUser } = await requireUserSession(event)

    if (currentUser.role !== Role.FEEF) {
    throw createError({
      statusCode: 403,
      message: 'Seul un administrateur FEEF peut supprimer des comptes',
    })
  }

  const accountId = getRouterParam(event, 'id')

  const account = await db.query.accounts.findFirst({
    where: eq(accounts.id, parseInt(accountId || '0'))
  })

  if (!account) {
    throw createError({
      statusCode: 404,
      message: 'Compte non trouvé'
    })
  }

  await softDelete(accounts, eq(accounts.id, parseInt(accountId || '0')))

  return {
    success: true
  }
})
