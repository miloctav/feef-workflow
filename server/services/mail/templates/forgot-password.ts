import type { EmailTemplate, ForgotPasswordEmailData } from '~~/server/types/mail'

/**
 * Template d'email pour la réinitialisation de mot de passe
 * Envoyé lorsqu'un utilisateur demande à réinitialiser son mot de passe
 */
export const forgotPasswordTemplate: EmailTemplate<ForgotPasswordEmailData> = {
  type: 'password-reset',

  getSubject: (data) => {
    return `Réinitialisation de votre mot de passe - FEEF Workflow`
  },

  getHtml: (data) => {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation de mot de passe FEEF Workflow</title>
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
                Vous avez demandé à réinitialiser votre mot de passe sur <strong>FEEF Workflow</strong>.
              </p>

              <p style="margin: 0 0 30px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Pour créer un nouveau mot de passe, veuillez cliquer sur le bouton ci-dessous :
              </p>

              <!-- Bouton CTA -->
              <table role="presentation" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 6px; background-color: #3b82f6;">
                    <a href="${data.resetPasswordUrl}"
                       style="display: inline-block; padding: 16px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                      Réinitialiser mon mot de passe
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Ce lien est valable pendant <strong>${data.expiresInHours} heures</strong>. Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.
              </p>

              <!-- Lien alternatif -->
              <div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px;">
                  Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
                </p>
                <p style="margin: 0; word-break: break-all;">
                  <a href="${data.resetPasswordUrl}" style="color: #3b82f6; font-size: 13px; text-decoration: underline;">
                    ${data.resetPasswordUrl}
                  </a>
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
