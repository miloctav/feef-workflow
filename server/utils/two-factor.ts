import { eq, and, isNull, gt } from 'drizzle-orm'
import { db } from '~~/server/database'
import { twoFactorCodes } from '~~/server/database/schema'

/**
 * Génère un code 2FA
 * - Mode dev (NUXT_DEV_MODE=true) : retourne "000000"
 * - Mode production : retourne un code aléatoire à 6 chiffres
 */
export function generate2FACode(): string {
  const config = useRuntimeConfig()
  if (config.devMode === true) {
    return '000000'
  }
  // Génère un nombre entre 0 et 999999, paddé à 6 chiffres
  return Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
}

/**
 * Crée un nouveau code 2FA pour un utilisateur
 * @param accountId - L'ID du compte
 * @returns Le code généré
 */
export async function create2FACode(accountId: number): Promise<string> {
  // Invalider tous les codes existants pour cet utilisateur
  await invalidateExisting2FACodes(accountId)

  // Générer un nouveau code
  const code = generate2FACode()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

  // Enregistrer le code en base
  await db.insert(twoFactorCodes).values({
    accountId,
    code,
    expiresAt,
  })

  return code
}

/**
 * Vérifie si un code 2FA est valide
 * @param accountId - L'ID du compte
 * @param code - Le code fourni par l'utilisateur
 * @returns Un objet avec le statut de validation
 */
export async function validate2FACode(accountId: number, code: string): Promise<{
  valid: boolean
  error?: string
  attemptsRemaining?: number
  codeId?: number
}> {
  // Récupérer le dernier code 2FA non vérifié pour cet utilisateur
  const twoFactorCode = await db.query.twoFactorCodes.findFirst({
    where: and(
      eq(twoFactorCodes.accountId, accountId),
      isNull(twoFactorCodes.verifiedAt)
    ),
    orderBy: (twoFactorCodes, { desc }) => [desc(twoFactorCodes.createdAt)],
  })

  // Vérifier que le code existe
  if (!twoFactorCode) {
    return {
      valid: false,
      error: 'Code invalide ou expiré.',
    }
  }

  // Vérifier que le code n'a pas expiré
  const now = new Date()
  if (now > twoFactorCode.expiresAt) {
    return {
      valid: false,
      error: 'Le code a expiré. Veuillez vous reconnecter.',
    }
  }

  // Vérifier le nombre de tentatives
  if (twoFactorCode.attempts >= 3) {
    return {
      valid: false,
      error: 'Trop de tentatives. Veuillez vous reconnecter.',
    }
  }

  // Vérifier le code
  if (twoFactorCode.code !== code) {
    // Incrémenter le nombre de tentatives
    const newAttempts = twoFactorCode.attempts + 1
    await db.update(twoFactorCodes)
      .set({ attempts: newAttempts })
      .where(eq(twoFactorCodes.id, twoFactorCode.id))

    const attemptsRemaining = 3 - newAttempts

    if (attemptsRemaining === 0) {
      return {
        valid: false,
        error: 'Trop de tentatives. Veuillez vous reconnecter.',
        attemptsRemaining: 0,
      }
    }

    return {
      valid: false,
      error: `Code incorrect. Il vous reste ${attemptsRemaining} tentative(s).`,
      attemptsRemaining,
    }
  }

  // Code valide : marquer comme vérifié
  await db.update(twoFactorCodes)
    .set({ verifiedAt: new Date() })
    .where(eq(twoFactorCodes.id, twoFactorCode.id))

  return {
    valid: true,
    codeId: twoFactorCode.id,
  }
}

/**
 * Invalide tous les codes 2FA existants pour un utilisateur
 * @param accountId - L'ID du compte
 */
export async function invalidateExisting2FACodes(accountId: number): Promise<void> {
  // Marquer tous les codes non vérifiés comme expirés
  await db.update(twoFactorCodes)
    .set({ expiresAt: new Date(Date.now() - 1000) }) // Expiré il y a 1 seconde
    .where(and(
      eq(twoFactorCodes.accountId, accountId),
      isNull(twoFactorCodes.verifiedAt)
    ))
}
