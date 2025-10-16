import { eq } from 'drizzle-orm'
import { accounts } from '~~/server/database/schema'
import { db } from '~~/server/database'
import { generatePasswordResetToken } from '~~/server/utils/jwt'
import { sendAccountCreationEmail } from '~~/server/services/mail'

/**
 * Endpoint pour renvoyer l'email de création de compte
 * Utilisé quand le token a expiré ou que l'email n'a pas été reçu
 */
export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur connecté est FEEF
  const { user: currentUser } = await requireUserSession(event)

  if (currentUser.role !== Role.FEEF) {
    throw createError({
      statusCode: 403,
      message: 'Seul un administrateur FEEF peut renvoyer des emails'
    })
  }

  // Récupérer l'ID du compte depuis l'URL
  const accountId = getRouterParam(event, 'id')

  if (!accountId) {
    throw createError({
      statusCode: 400,
      message: 'ID du compte requis'
    })
  }

  // Récupérer le compte
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, parseInt(accountId)))
    .limit(1)

  if (!account) {
    throw createError({
      statusCode: 404,
      message: 'Compte introuvable'
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
