import { eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import { accounts } from '~~/server/database/schema'
import { db } from '~~/server/database'
import { verifyPasswordResetToken } from '~~/server/utils/jwt'

interface ResetPasswordBody {
  token: string
  password: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ResetPasswordBody>(event)
  const { token, password } = body

  // Validation des données
  if (!token || !password) {
    throw createError({
      statusCode: 400,
      message: 'Token et mot de passe requis'
    })
  }

  if (password.length < 8) {
    throw createError({
      statusCode: 400,
      message: 'Le mot de passe doit contenir au moins 8 caractères'
    })
  }

  // Vérifier et décoder le JWT
  let payload
  try {
    payload = await verifyPasswordResetToken(token)
  } catch (error: any) {
    throw createError({
      statusCode: 400,
      message: error.message || 'Token invalide ou expiré'
    })
  }

  // Récupérer l'utilisateur via l'accountId contenu dans le JWT
  const [user] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, payload.accountId))
    .limit(1)

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'Compte introuvable'
    })
  }

  // Vérifier que le token a été émis APRÈS le dernier changement de mot de passe
  // (pour invalider les anciens tokens après un changement de mot de passe)
  if (user.passwordChangedAt) {
    // Le JWT contient 'iat' (issued at) dans le payload
    const tokenIssuedAt = (payload as any).iat ? new Date((payload as any).iat * 1000) : null

    if (tokenIssuedAt && user.passwordChangedAt > tokenIssuedAt) {
      throw createError({
        statusCode: 400,
        message: 'Ce lien n\'est plus valide car le mot de passe a déjà été modifié. Contactez un administrateur pour recevoir un nouveau lien.'
      })
    }
  }

  // Hasher le nouveau mot de passe
  const hashedPassword = await bcrypt.hash(password, 10)

  // Mettre à jour le compte : enregistrer le mot de passe, activer le compte, marquer la date de changement
  await db
    .update(accounts)
    .set({
      password: hashedPassword,
      passwordChangedAt: new Date(),
      isActive: true
    })
    .where(eq(accounts.id, user.id))

  return {
    success: true,
    message: 'Mot de passe créé avec succès. Vous pouvez maintenant vous connecter.'
  }
})
