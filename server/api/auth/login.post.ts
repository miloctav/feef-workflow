import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { accounts } from '~~/server/database/schema'
import { create2FACode } from '~~/server/utils/two-factor'
import { send2FACodeEmail } from '~~/server/services/mail'
import { buildSessionData } from '~~/server/utils/session-builder'
import { validateTrustToken, getTrustCookieName } from '~~/server/utils/trusted-devices'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const { email, password } = body

  // Validation
  if (!email || !password) {
    throw createError({
      statusCode: 400,
      message: 'Email et mot de passe requis',
    })
  }

  // Recherche de l'utilisateur avec Drizzle Query
  const user = await db.query.accounts.findFirst({
    where: (accounts: { email: any }, { eq }: any) => eq(accounts.email, email),
    with: {
      accountsToEntities: {
        columns: {
          entityId: true,
          role: true,
        },
      },
    },
  })

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Email ou mot de passe incorrect',
    })
  }

  // Vérifier si le compte n'est pas supprimé
  if (user.deletedAt) {
    throw createError({
      statusCode: 401,
      message: 'Ce compte a été désactivé',
    })
  }

  // Vérifier si le compte est actif (mot de passe défini)
  if (!user.isActive || !user.password) {
    throw createError({
      statusCode: 403,
      message: 'Votre compte n\'est pas encore activé. Veuillez consulter l\'email que vous avez reçu pour créer votre mot de passe.',
    })
  }

  // Vérification du mot de passe
  const isPasswordValid = await bcrypt.compare(password, user.password)

  if (!isPasswordValid) {
    throw createError({
      statusCode: 401,
      message: 'Email ou mot de passe incorrect',
    })
  }

  // Vérifier le cookie de confiance (skip 2FA si valide)
  const trustToken = getCookie(event, getTrustCookieName())
  console.log('[Trust] Cookie name:', getTrustCookieName(), '| Cookie value:', trustToken ? `${trustToken.substring(0, 8)}...` : 'NOT FOUND')
  if (trustToken) {
    try {
      const trustedAccountId = await validateTrustToken(trustToken)
      console.log('[Trust] Validated accountId:', trustedAccountId, '| Expected userId:', user.id)
      if (trustedAccountId === user.id) {
        // Trust valide pour ce compte → créer session directement
        const sessionData = await buildSessionData(user)
        await setUserSession(event, { user: sessionData })
        await db.update(accounts).set({ lastLoginAt: new Date() }).where(eq(accounts.id, user.id))
        return { data: { success: true, user: sessionData } }
      }
    } catch (err) {
      console.error('[Trust] Error validating trust token:', err)
    }
    // Token invalide ou pour un autre compte → continuer vers 2FA normalement
  }

  // Générer le code 2FA
  const code = await create2FACode(user.id)

  // Envoyer l'email avec le code 2FA
  const config = useRuntimeConfig()
  if (!config.devMode || config.devMailOverride) {
    await send2FACodeEmail({
      email: user.email,
      firstName: user.firstname,
      lastName: user.lastname,
      code,
      expiresInMinutes: 5,
    })
  } else {
    console.log('[2FA] Mode dev sans override: code non envoyé par email:', code)
  }

  // Retourner que l'utilisateur doit vérifier le code 2FA
  return {
    requiresTwoFactor: true,
    accountId: user.id,
  }
})
