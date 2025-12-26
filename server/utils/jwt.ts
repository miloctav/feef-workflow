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
    throw new Error('NUXT_JWT_SECRET n\'est pas défini dans le runtimeConfig')
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
 * Interface pour les données contenues dans le token de changement d'email
 */
export interface EmailChangeTokenPayload {
  accountId: number
  newEmail: string
  type: 'email-change'
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

/**
 * Génère un JWT pour le changement d'email
 * Le token contient l'ID du compte, la nouvelle adresse email et expire après 48 heures
 *
 * @param accountId - ID du compte pour lequel générer le token
 * @param newEmail - Nouvelle adresse email à vérifier
 * @returns Token JWT signé
 */
export async function generateEmailChangeToken(accountId: number, newEmail: string): Promise<string> {
  const secret = getJWTSecret()

  const token = await new jose.SignJWT({
    accountId,
    newEmail,
    type: 'email-change'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('48h') // Token valide pendant 48 heures
    .sign(secret)

  return token
}

/**
 * Vérifie et décode un JWT de changement d'email
 * Vérifie la signature, l'expiration et le type de token
 *
 * @param token - Token JWT à vérifier
 * @returns Payload du token contenant l'accountId et le newEmail
 * @throws Error si le token est invalide, expiré ou mal formaté
 */
export async function verifyEmailChangeToken(token: string): Promise<EmailChangeTokenPayload> {
  try {
    const secret = getJWTSecret()

    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: ['HS256']
    })

    // Vérifier que le payload contient les champs attendus
    if (!payload.accountId || !payload.newEmail || payload.type !== 'email-change') {
      throw new Error('Token invalide : format incorrect')
    }

    return payload as unknown as EmailChangeTokenPayload
  } catch (error: any) {
    // Gérer les différents types d'erreurs JWT
    if (error.code === 'ERR_JWT_EXPIRED') {
      throw new Error('Le lien a expiré. Veuillez faire une nouvelle demande de changement d\'email.')
    }
    if (error.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
      throw new Error('Token invalide : signature incorrecte')
    }
    throw new Error('Token invalide ou expiré')
  }
}
