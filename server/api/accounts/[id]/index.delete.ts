import { eq, and } from "drizzle-orm"
import { db } from "~~/server/database"
import { accounts, auditorsToOE } from "~~/server/database/schema"
import { revokeAllTrustedDevices } from "~~/server/utils/trusted-devices"

export default defineEventHandler(async (event) => {

  const { user: currentUser } = await requireUserSession(event)

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

  const account = await db.query.accounts.findFirst({
    where: eq(accounts.id, accountIdInt)
  })

  if (!account) {
    throw createError({
      statusCode: 404,
      message: 'Compte non trouvé'
    })
  }

  // Vérifier les permissions
  if (currentUser.role === Role.FEEF) {
    // FEEF peut supprimer tous les comptes
  } else if (currentUser.role === Role.OE && currentUser.oeRole === OERole.ADMIN) {
    // OE ADMIN peut supprimer les comptes de son propre OE

    // Vérifier si c'est un compte OE de son organisation
    const isOwnOeAccount = account.role === Role.OE && account.oeId === currentUser.oeId

    // Vérifier si c'est un auditeur lié à son OE
    let isOwnAuditor = false
    if (account.role === Role.AUDITOR) {
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
        message: 'Vous ne pouvez supprimer que les comptes de votre propre OE',
      })
    }
  } else {
    throw createError({
      statusCode: 403,
      message: 'Vous n\'êtes pas autorisé à supprimer des comptes',
    })
  }

  // Révoquer tous les devices de confiance avant le soft-delete
  await revokeAllTrustedDevices(accountIdInt)

  await softDelete(event, accounts, eq(accounts.id, accountIdInt))

  return {
    success: true
  }
})
