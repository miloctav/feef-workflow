import { eq, and, or, sql, isNull } from 'drizzle-orm'
import { db } from '~~/server/database'
import { accounts } from '~~/server/database/schema'
import { forUpdate } from '~~/server/utils/tracking'
import { generateEmailChangeToken } from '~~/server/utils/jwt'
import { sendEmailChangeVerificationEmail } from '~~/server/services/mail'

interface RequestEmailChangeBody {
  newEmail: string
}

export default defineEventHandler(async (event) => {
  console.log('[Request Email Change API] Demande de changement d\'email')

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

  // Authorization: only allow users to change their own email
  if (currentUser.id !== accountIdInt) {
    throw createError({
      statusCode: 403,
      message: 'Vous ne pouvez modifier que votre propre adresse email'
    })
  }

  const body = await readBody<RequestEmailChangeBody>(event)
  const { newEmail } = body

  if (!newEmail) {
    throw createError({
      statusCode: 400,
      message: 'La nouvelle adresse email est requise'
    })
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(newEmail)) {
    throw createError({
      statusCode: 400,
      message: 'Format d\'email invalide'
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

  // Check if new email is same as current
  if (existingAccount.email === newEmail) {
    throw createError({
      statusCode: 400,
      message: 'La nouvelle adresse email est identique à l\'adresse actuelle'
    })
  }

  // Check uniqueness: new email must not exist in email or pendingEmail of other accounts
  const conflictingAccount = await db.query.accounts.findFirst({
    where: and(
      or(
        eq(accounts.email, newEmail),
        eq(accounts.pendingEmail, newEmail)
      ),
      isNull(accounts.deletedAt),
      sql`${accounts.id} != ${accountIdInt}`
    )
  })

  if (conflictingAccount) {
    throw createError({
      statusCode: 409,
      message: 'Cette adresse email est déjà utilisée par un autre compte'
    })
  }

  console.log('[Request Email Change API] Génération du token pour le compte ID', accountIdInt)

  // Generate JWT token
  const token = await generateEmailChangeToken(accountIdInt, newEmail)

  // Update account with pending email
  await db
    .update(accounts)
    .set(forUpdate(event, {
      pendingEmail: newEmail,
      emailChangeRequestedAt: new Date()
    }))
    .where(eq(accounts.id, accountIdInt))

  // Build verification URL
  const origin = getRequestURL(event).origin
  const verificationUrl = `${origin}/verify-email?token=${token}`

  // Send verification email
  const emailResult = await sendEmailChangeVerificationEmail({
    email: newEmail,
    firstName: existingAccount.firstname,
    lastName: existingAccount.lastname,
    oldEmail: existingAccount.email,
    verificationUrl,
    expiresInHours: 48
  })

  console.log('[Request Email Change API] Email envoyé à', newEmail, 'résultat:', emailResult)

  if (!emailResult.success) {
    console.error('[Request Email Change API] Erreur:', emailResult.error)

    // Rollback: reset pendingEmail and emailChangeRequestedAt
    await db
      .update(accounts)
      .set(forUpdate(event, {
        pendingEmail: null,
        emailChangeRequestedAt: null
      }))
      .where(eq(accounts.id, accountIdInt))

    throw createError({
      statusCode: 500,
      message: 'Une erreur est survenue lors de l\'envoi de l\'email de vérification'
    })
  }

  return {
    data: {
      success: true,
      message: `Un email de vérification a été envoyé à ${newEmail}. Veuillez consulter votre boîte de réception.`
    }
  }
})
