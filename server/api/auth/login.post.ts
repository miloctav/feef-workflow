import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { accounts } from '~~/server/database/schema'
import { SessionUser } from '~~/server/types/session'
import { getEntityContext } from '~~/server/utils/entity-context'
import { create2FACode } from '~~/server/utils/two-factor'
import { send2FACodeEmail } from '~~/server/services/mail'

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

  // Générer le code 2FA
  const code = await create2FACode(user.id)

  // Envoyer l'email avec le code (sauf en mode dev)
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

  // Retourner que l'utilisateur doit vérifier le code 2FA
  return {
    requiresTwoFactor: true,
    accountId: user.id,
  }
})
