import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { accounts } from '~~/server/database/schema'
import { validate2FACode } from '~~/server/utils/two-factor'
import { buildSessionData } from '~~/server/utils/session-builder'
import { createTrustedDevice, getTrustCookieName, getTrustMaxAge } from '~~/server/utils/trusted-devices'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const { accountId, code, trustDevice } = body

  // Validation
  if (!accountId || !code) {
    throw createError({
      statusCode: 400,
      message: 'ID de compte et code requis',
    })
  }

  // Vérifier le code 2FA
  const validation = await validate2FACode(accountId, code)

  if (!validation.valid) {
    throw createError({
      statusCode: 400,
      message: validation.error || 'Code invalide',
      data: {
        attemptsRemaining: validation.attemptsRemaining,
      },
    })
  }

  // Code valide, charger les données utilisateur
  const user = await db.query.accounts.findFirst({
    where: eq(accounts.id, accountId),
    with: {
      accountsToEntities: {
        columns: {
          entityId: true,
          role: true,
        },
      },
    },
  })

  if (!user || user.deletedAt) {
    throw createError({
      statusCode: 404,
      message: 'Utilisateur non trouvé',
    })
  }

  // Préparer les données de session
  const sessionData = await buildSessionData(user)

  // Créer la session utilisateur
  await setUserSession(event, {
    user: sessionData,
  })

  // Poser le cookie de confiance via setCookie (h3) pour éviter
  // la perte silencieuse lors de la déduplication des Set-Cookie headers
  if (trustDevice === true) {
    const userAgent = getHeader(event, 'user-agent')
    const token = await createTrustedDevice(accountId, userAgent ?? undefined)
    setCookie(event, getTrustCookieName(), token, {
      httpOnly: true,
      secure: !useRuntimeConfig().devMode,
      sameSite: 'lax',
      maxAge: getTrustMaxAge(),
      path: '/',
    })
    console.log('[Trust] Cookie SET via setCookie() for account:', accountId, '| secure:', !useRuntimeConfig().devMode)
  }

  // Retourner les informations utilisateur
  return {
    data: {
      success: true,
      user: sessionData,
    },
  }
})
