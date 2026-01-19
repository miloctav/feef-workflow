import type { EmailTemplate, TwoFactorCodeData } from '~~/server/types/mail'

/**
 * Template d'email pour l'envoi du code 2FA
 * Envoyé après chaque connexion réussie pour vérifier l'identité
 */
export const twoFactorCodeTemplate: EmailTemplate<TwoFactorCodeData> = {
  type: 'two-factor-code',

  getSubject: (data) => {
    return `Votre code de vérification - FEEF Workflow`
  },

  getHtml: (data) => {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code de vérification FEEF Workflow</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px; text-align: center;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          <!-- En-tête -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background-color: #3b82f6; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                FEEF Workflow
              </h1>
            </td>
          </tr>

          <!-- Corps du message -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 600;">
                Bonjour ${data.firstName} ${data.lastName},
              </h2>

              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Voici votre code de vérification pour finaliser votre connexion à <strong>FEEF Workflow</strong>.
              </p>

              <!-- Encadré avec le code -->
              <div style="margin: 30px 0; padding: 30px; background-color: #f9fafb; border: 2px solid #3b82f6; border-radius: 8px; text-align: center;">
                <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                  Votre code de vérification
                </p>
                <p style="margin: 0; color: #1f2937; font-size: 48px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                  ${data.code}
                </p>
              </div>

              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Ce code est valable pendant <strong>${data.expiresInMinutes} minutes</strong>. Ne le partagez avec personne.
              </p>

              <!-- Message de sécurité -->
              <div style="margin-top: 30px; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  <strong>Important :</strong> Si vous n'avez pas demandé ce code, ignorez cet email et assurez-vous que votre mot de passe est sécurisé.
                </p>
              </div>
            </td>
          </tr>

          <!-- Pied de page -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                © ${new Date().getFullYear()} FEEF Workflow. Tous droits réservés.
              </p>
              <p style="margin: 10px 0 0; color: #9ca3af; font-size: 12px;">
                Cet email a été envoyé à ${data.email}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()
  }
}
