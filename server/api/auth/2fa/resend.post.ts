import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { accounts } from '~~/server/database/schema'
import { create2FACode } from '~~/server/utils/two-factor'
import { send2FACodeEmail } from '~~/server/services/mail'

// Rate limiting: stocke les dernières demandes par accountId
const lastResendTimes = new Map<number, number>()
const RESEND_COOLDOWN_MS = 60 * 1000 // 1 minute

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const { accountId } = body

  // Validation
  if (!accountId) {
    throw createError({
      statusCode: 400,
      message: 'ID de compte requis',
    })
  }

  // Rate limiting: vérifier si l'utilisateur a déjà demandé un code récemment
  const lastResend = lastResendTimes.get(accountId)
  const now = Date.now()

  if (lastResend && now - lastResend < RESEND_COOLDOWN_MS) {
    const remainingSeconds = Math.ceil((RESEND_COOLDOWN_MS - (now - lastResend)) / 1000)
    throw createError({
      statusCode: 429,
      message: `Veuillez attendre ${remainingSeconds} secondes avant de demander un nouveau code`,
    })
  }

  // Charger l'utilisateur
  const user = await db.query.accounts.findFirst({
    where: eq(accounts.id, accountId),
  })

  if (!user || user.deletedAt) {
    throw createError({
      statusCode: 404,
      message: 'Utilisateur non trouvé',
    })
  }

  // Créer un nouveau code 2FA (invalide automatiquement les anciens)
  const code = await create2FACode(accountId)

  // Envoyer l'email (sauf en mode dev)
  const config = useRuntimeConfig()
  if (config.devMode !== true) {
    await send2FACodeEmail({
      email: user.email,
      firstName: user.firstname,
      lastName: user.lastname,
      code,
      expiresInMinutes: 5,
    })
  } else {
    console.log('[2FA] Mode dev: code non envoyé par email:', code)
  }

  // Mettre à jour le timestamp de la dernière demande
  lastResendTimes.set(accountId, now)

  return {
    data: {
      success: true,
      message: 'Un nouveau code a été envoyé',
    },
  }
})
