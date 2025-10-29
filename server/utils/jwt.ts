import * as jose from 'jose'

/**
 * Utilitaires JWT pour la gestion des tokens de réinitialisation de mot de passe
 * Utilise la bibliothèque 'jose' pour signer et vérifier les JWT
 */

/**
 * Récupère la clé secrète pour signer les JWT depuis le runtimeConfig
 */
function getJWTSecret(): Uint8Array {
  const config = useRuntimeConfig()
  const secret = config.jwtSecret
  if (!secret) {
    throw new Error('JWT_SECRET n\'est pas défini dans le runtimeConfig')
  }
  return new TextEncoder().encode(secret)
}

/**
 * Interface pour les données contenues dans le token de réinitialisation
 */
export interface PasswordResetTokenPayload {
  accountId: number
  type: 'reset-password'
}

/**
 * Génère un JWT pour la réinitialisation de mot de passe
 * Le token contient l'ID du compte et expire après 48 heures
 *
 * @param accountId - ID du compte pour lequel générer le token
 * @returns Token JWT signé
 */
export async function generatePasswordResetToken(accountId: number): Promise<string> {
  const secret = getJWTSecret()

  const token = await new jose.SignJWT({
    accountId,
    type: 'reset-password'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('48h') // Token valide pendant 48 heures
    .sign(secret)

  return token
}

/**
 * Vérifie et décode un JWT de réinitialisation de mot de passe
 * Vérifie la signature, l'expiration et le type de token
 *
 * @param token - Token JWT à vérifier
 * @returns Payload du token contenant l'accountId
 * @throws Error si le token est invalide, expiré ou mal formaté
 */
export async function verifyPasswordResetToken(token: string): Promise<PasswordResetTokenPayload> {
  try {
    const secret = getJWTSecret()

    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: ['HS256']
    })

    // Vérifier que le payload contient les champs attendus
    if (!payload.accountId || payload.type !== 'reset-password') {
      throw new Error('Token invalide : format incorrect')
    }

    return payload as unknown as PasswordResetTokenPayload
  } catch (error: any) {
    // Gérer les différents types d'erreurs JWT
    if (error.code === 'ERR_JWT_EXPIRED') {
      throw new Error('Le lien a expiré. Contactez un administrateur pour recevoir un nouveau lien.')
    }
    if (error.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
      throw new Error('Token invalide : signature incorrecte')
    }
    throw new Error('Token invalide ou expiré')
  }
}
