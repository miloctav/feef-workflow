import { eq, and } from 'drizzle-orm'
import { accounts, auditorsToOE } from '~~/server/database/schema'
import { db } from '~~/server/database'
import { generatePasswordResetToken } from '~~/server/utils/jwt'
import { sendAccountCreationEmail } from '~~/server/services/mail'

/**
 * Endpoint pour renvoyer l'email de création de compte
 * Utilisé quand le token a expiré ou que l'email n'a pas été reçu
 */
export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur est authentifié
  const { user: currentUser } = await requireUserSession(event)

  // Récupérer l'ID du compte depuis l'URL
  const accountId = getRouterParam(event, 'id')

  if (!accountId) {
    throw createError({
      statusCode: 400,
      message: 'ID du compte requis'
    })
  }

  const accountIdInt = parseInt(accountId)

  if (isNaN(accountIdInt)) {
    throw createError({
      statusCode: 400,
      message: 'ID du compte invalide',
    })
  }

  // Récupérer le compte
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountIdInt))
    .limit(1)

  if (!account) {
    throw createError({
      statusCode: 404,
      message: 'Compte introuvable'
    })
  }

  // Vérifier les permissions
  if (currentUser.role === Role.FEEF) {
    // FEEF peut renvoyer les emails pour tous les comptes
  } else if (currentUser.role === Role.OE && currentUser.oeRole === OERole.ADMIN) {
    // OE ADMIN peut renvoyer les emails pour les comptes de son propre OE

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
        message: 'Vous ne pouvez renvoyer les emails que pour les comptes de votre propre OE',
      })
    }
  } else {
    throw createError({
      statusCode: 403,
      message: 'Vous n\'êtes pas autorisé à renvoyer des emails',
    })
  }

  // Vérifier que le compte n'est pas déjà actif
  if (account.isActive) {
    throw createError({
      statusCode: 400,
      message: 'Ce compte est déjà actif. L\'utilisateur a déjà défini son mot de passe.'
    })
  }

  // Générer un nouveau JWT (pas besoin de stocker en BDD)
  const jwtToken = await generatePasswordResetToken(account.id)

  // Envoyer l'email
  const resetUrl = `${getRequestURL(event).origin}/reset-password?token=${jwtToken}`

  const emailResult = await sendAccountCreationEmail({
    email: account.email,
    firstName: account.firstname,
    lastName: account.lastname,
    role: getRoleName(account.role),
    resetPasswordUrl: resetUrl,
    expiresInHours: 48
  })

  if (!emailResult.success) {
    console.error('[Resend Email API] Erreur lors de l\'envoi:', emailResult.error)
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de l\'envoi de l\'email. Veuillez réessayer.'
    })
  }

  return {
    success: true,
    message: 'Email renvoyé avec succès',
    emailId: emailResult.id
  }
})

/**
 * Helper pour formater les noms de rôles en français
 */
function getRoleName(role: string): string {
  const roleNames: Record<string, string> = {
    'FEEF': 'Administrateur FEEF',
    'OE': 'Organisme Évaluateur',
    'AUDITOR': 'Auditeur',
    'ENTITY': 'Entreprise'
  }
  return roleNames[role] || role
}
