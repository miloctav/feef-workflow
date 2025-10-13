import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { accounts } from '~~/server/database/schema'
import { generatePasswordResetUrlAndToken } from '~~/server/utils/password-reset'
import { sendForgotPasswordEmail } from '~~/server/services/mail'

interface ForgotPasswordBody {
  email: string
}

export default defineEventHandler(async (event) => {
  console.log('[Forgot Password API] Demande de réinitialisation de mot de passe')

  // Récupérer l'email du corps de la requête
  const body = await readBody<ForgotPasswordBody>(event)
  const { email } = body

  // Validation de base
  if (!email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'L\'email est requis',
    })
  }

  // Valider le format de l'email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Format d\'email invalide',
    })
  }

  console.log('[Forgot Password API] Recherche du compte avec l\'email', email)

  // Rechercher le compte par email
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.email, email))
    .limit(1)

  // Pour des raisons de sécurité, on retourne toujours un message de succès
  // même si le compte n'existe pas (pour ne pas divulguer l'existence d'un compte)
  if (!account) {
    console.log('[Forgot Password API] Aucun compte trouvé pour cet email (réponse générique pour sécurité)')
    return {
      success: true,
      message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
    }
  }

  console.log('[Forgot Password API] Génération du token pour le compte ID', account.id)

  // Générer le token et l'URL de réinitialisation
  const { resetUrl } = await generatePasswordResetUrlAndToken(account.id, event)

  // Envoyer l'email de réinitialisation
  const emailResult = await sendForgotPasswordEmail({
    email: account.email,
    firstName: account.firstname,
    lastName: account.lastname,
    resetPasswordUrl: resetUrl,
    expiresInHours: 48,
  })

  console.log('[Forgot Password API] Email envoyé à', account.email, 'avec le résultat', emailResult)

  if (!emailResult.success) {
    console.error('[Forgot Password API] Erreur lors de l\'envoi de l\'email:', emailResult.error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Une erreur est survenue lors de l\'envoi de l\'email. Veuillez réessayer plus tard.',
    })
  }

  // Retourner un message de succès générique
  return {
    success: true,
    message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
  }
})
