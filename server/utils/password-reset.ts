import type { H3Event } from 'h3'
import { generatePasswordResetToken } from './jwt'

/**
 * Génère un token de réinitialisation de mot de passe et construit l'URL complète
 *
 * @param accountId - ID du compte pour lequel générer le token
 * @param event - Event H3 pour récupérer l'origine de l'URL
 * @returns Un objet contenant le token JWT et l'URL de réinitialisation complète
 */
export async function generatePasswordResetUrlAndToken(
  accountId: number,
  event: H3Event
): Promise<{ token: string; resetUrl: string }> {
  // Générer le JWT contenant l'ID du compte
  const token = await generatePasswordResetToken(accountId)

  // Construire l'URL de réinitialisation
  const origin = getRequestURL(event).origin
  const resetUrl = `${origin}/reset-password?token=${token}`

  return {
    token,
    resetUrl
  }
}
