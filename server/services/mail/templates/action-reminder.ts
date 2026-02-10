import type { EmailTemplate, ActionReminderEmailData } from '~~/server/types/mail'

/**
 * Template d'email pour le rappel de deadline d'une action
 */
export const actionReminderTemplate: EmailTemplate<ActionReminderEmailData> = {
  type: 'action-reminder',

  getSubject: (data) => {
    return `Rappel : ${data.actionTitle} — échéance dans ${data.daysRemaining} jour(s)`
  },

  getHtml: (data) => {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rappel d'action - FEEF Workflow</title>
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
                Une action qui vous est assignée approche de son échéance.
              </p>

              <!-- Alerte deadline -->
              <table role="presentation" style="width: 100%; background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; margin: 0 0 20px;">
                <tr>
                  <td style="padding: 16px 20px; text-align: center;">
                    <p style="margin: 0; color: #c2410c; font-size: 20px; font-weight: 700;">
                      Échéance dans ${data.daysRemaining} jour(s)
                    </p>
                    <p style="margin: 4px 0 0; color: #9a3412; font-size: 14px;">
                      ${data.deadline}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Détails de l'action -->
              <table role="presentation" style="width: 100%; background-color: #f9fafb; border-radius: 8px; margin: 0 0 20px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px; color: #1f2937; font-size: 18px; font-weight: 600;">
                      ${data.actionTitle}
                    </p>
                    <p style="margin: 0 0 12px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                      ${data.actionDescription}
                    </p>
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">
                      <strong>Entité :</strong> ${data.entityName}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Bouton CTA -->
              <table role="presentation" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 6px; background-color: #ea580c;">
                    <a href="${data.actionUrl}"
                       style="display: inline-block; padding: 16px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                      Voir l'action
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Lien alternatif -->
              <div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px;">
                  Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
                </p>
                <p style="margin: 0; word-break: break-all;">
                  <a href="${data.actionUrl}" style="color: #3b82f6; font-size: 13px; text-decoration: underline;">
                    ${data.actionUrl}
                  </a>
                </p>
              </div>
            </td>
          </tr>

          <!-- Pied de page -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 10px; color: #9ca3af; font-size: 12px;">
                Vous recevez cet email car vous avez un compte sur FEEF Workflow.
                Vous pouvez désactiver les notifications email dans vos paramètres de compte.
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                © ${new Date().getFullYear()} FEEF Workflow. Tous droits réservés.
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
