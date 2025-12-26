import { eq, and, or, sql, isNull } from 'drizzle-orm'
import { db } from '~~/server/database'
import { accounts } from '~~/server/database/schema'
import { verifyEmailChangeToken } from '~~/server/utils/jwt'

interface VerifyEmailChangeBody {
  token: string
}

export default defineEventHandler(async (event) => {
  console.log('[Verify Email Change API] Vérification de changement d\'email')

  const body = await readBody<VerifyEmailChangeBody>(event)
  const { token } = body

  if (!token) {
    throw createError({
      statusCode: 400,
      message: 'Token requis'
    })
  }

  // Verify JWT token
  let payload
  try {
    payload = await verifyEmailChangeToken(token)
  } catch (error: any) {
    throw createError({
      statusCode: 400,
      message: error.message || 'Token invalide ou expiré'
    })
  }

  console.log('[Verify Email Change API] Token vérifié pour compte ID', payload.accountId)

  // Get account
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, payload.accountId))
    .limit(1)

  if (!account) {
    throw createError({
      statusCode: 404,
      message: 'Compte introuvable'
    })
  }

  if (account.deletedAt) {
    throw createError({
      statusCode: 404,
      message: 'Ce compte n\'existe plus'
    })
  }

  // Verify token was issued for the current request (anti-replay protection)
  // Allow 5 seconds tolerance for clock skew and DB write delay
  if (account.emailChangeRequestedAt) {
    // Get token issued at timestamp from payload
    const tokenIssuedAt = (payload as any).iat
      ? new Date((payload as any).iat * 1000)
      : null

    if (tokenIssuedAt && account.emailChangeRequestedAt) {
      // Calculate time difference in seconds
      const timeDiffSeconds = (account.emailChangeRequestedAt.getTime() - tokenIssuedAt.getTime()) / 1000

      // If emailChangeRequestedAt is more than 5 seconds AFTER token issuance,
      // it means a new request was made after this token was generated
      if (timeDiffSeconds > 5) {
        throw createError({
          statusCode: 400,
          message: 'Ce lien n\'est plus valide. Une nouvelle demande de changement d\'email a été effectuée.'
        })
      }

      // If token was issued more than 5 seconds BEFORE emailChangeRequestedAt,
      // it's an old token from a previous request
      if (timeDiffSeconds < -5) {
        throw createError({
          statusCode: 400,
          message: 'Ce lien n\'est plus valide. Veuillez demander un nouveau changement d\'email.'
        })
      }
    }
  }

  // Verify pending email matches token
  if (account.pendingEmail !== payload.newEmail) {
    throw createError({
      statusCode: 400,
      message: 'Le lien de vérification ne correspond pas à la demande en cours.'
    })
  }

  // Race condition protection: check email uniqueness again
  const conflictingAccount = await db.query.accounts.findFirst({
    where: and(
      or(
        eq(accounts.email, payload.newEmail),
        eq(accounts.pendingEmail, payload.newEmail)
      ),
      isNull(accounts.deletedAt),
      sql`${accounts.id} != ${payload.accountId}`
    )
  })

  if (conflictingAccount) {
    throw createError({
      statusCode: 409,
      message: 'Cette adresse email est désormais utilisée par un autre compte.'
    })
  }

  console.log('[Verify Email Change API] Mise à jour de l\'email pour le compte ID', payload.accountId)

  // Update email and clear pending fields
  let updatedAccount
  try {
    const result = await db
      .update(accounts)
      .set({
        email: payload.newEmail,
        pendingEmail: null,
        emailChangeRequestedAt: null,
        updatedAt: new Date()
      })
      .where(eq(accounts.id, payload.accountId))
      .returning({
        id: accounts.id,
        email: accounts.email,
        firstname: accounts.firstname,
        lastname: accounts.lastname
      })

    updatedAccount = result[0]

    if (!updatedAccount) {
      throw new Error('Aucune ligne mise à jour')
    }
  } catch (error: any) {
    console.error('[Verify Email Change API] Erreur lors de la mise à jour:', error)

    // Check if it's a unique constraint violation (check both error and error.cause)
    const errorCode = error.code || error.cause?.code
    const errorMessage = error.message || error.cause?.message || ''

    if (errorCode === '23505' || errorMessage.includes('unique') || errorMessage.includes('duplicate')) {
      throw createError({
        statusCode: 409,
        message: 'Cette adresse email est déjà utilisée par un autre compte.'
      })
    }

    throw createError({
      statusCode: 500,
      message: 'Une erreur est survenue lors de la mise à jour de votre email. Veuillez réessayer.'
    })
  }

  console.log('[Verify Email Change API] Email mis à jour:', updatedAccount.email)

  return {
    data: {
      success: true,
      message: 'Votre adresse email a été modifiée avec succès. Vous pouvez maintenant vous connecter avec votre nouvelle adresse.',
      newEmail: updatedAccount.email
    }
  }
})
