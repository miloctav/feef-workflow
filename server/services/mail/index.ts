import type { EmailConfig, EmailResult, AccountCreationEmailData } from '~~/server/types/mail'
import { accountCreationTemplate } from './templates/account-creation'
import { Resend } from 'resend'

/**
 * Service d'envoi d'emails via Resend
 * Fournit des méthodes haut niveau pour envoyer des emails typés
 */

/**
 * Adresse email par défaut de l'expéditeur
 * Peut être surchargée dans chaque méthode d'envoi
 */
const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || 'FEEF Workflow <noreply@feef-workflow.com>'

export const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Fonction générique pour envoyer un email via Resend
 */
async function sendEmail(config: EmailConfig): Promise<EmailResult> {
  try {
    // Vérifier que la clé API Resend est configurée
    if (!process.env.RESEND_API_KEY) {
      console.error('[Mail Service] RESEND_API_KEY n\'est pas configurée')
      return {
        success: false,
        error: 'Configuration Resend manquante'
      }
    }

    // Envoyer l'email via Resend
    const { data, error } = await resend.emails.send({
      from: config.from || DEFAULT_FROM,
      to: config.to,
      subject: config.subject,
      html: config.html,
      replyTo: config.replyTo,
      cc: config.cc,
      bcc: config.bcc,
    })

    if (error) {
      console.error('[Mail Service] Erreur lors de l\'envoi:', error)
      return {
        success: false,
        error: error.message || 'Erreur inconnue'
      }
    }

    console.log('[Mail Service] Email envoyé avec succès:', data?.id)
    return {
      success: true,
      id: data?.id
    }
  } catch (error: any) {
    console.error('[Mail Service] Exception lors de l\'envoi:', error)
    return {
      success: false,
      error: error.message || 'Erreur inconnue'
    }
  }
}

/**
 * Envoie un email de création de compte avec lien de réinitialisation du mot de passe
 *
 * @example
 * ```typescript
 * const result = await sendAccountCreationEmail({
 *   email: 'user@example.com',
 *   firstName: 'Jean',
 *   lastName: 'Dupont',
 *   role: 'Évaluateur',
 *   resetPasswordUrl: 'https://feef-workflow.com/reset-password?token=abc123',
 *   expiresInHours: 48
 * })
 * ```
 */
export async function sendAccountCreationEmail(
  data: AccountCreationEmailData
): Promise<EmailResult> {
  const subject = accountCreationTemplate.getSubject(data)
  const html = accountCreationTemplate.getHtml(data)

  return sendEmail({
    to: data.email,
    subject,
    html
  })
}

/**
 * Fonction générique pour envoyer n'importe quel template d'email
 * Utile pour étendre le système avec de nouveaux types d'emails
 *
 * @example
 * ```typescript
 * import { auditReminderTemplate } from './templates/audit-reminder'
 *
 * const result = await sendTemplatedEmail(auditReminderTemplate, {
 *   email: 'oe@example.com',
 *   companyName: 'Acme Corp',
 *   auditDate: '2025-11-01'
 * })
 * ```
 */
export async function sendTemplatedEmail<T>(
  template: { getSubject: (data: T) => string; getHtml: (data: T) => string },
  data: T & { email: string }
): Promise<EmailResult> {
  const subject = template.getSubject(data)
  const html = template.getHtml(data)

  return sendEmail({
    to: data.email,
    subject,
    html
  })
}

/**
 * Export du service complet
 */
export const mailService = {
  sendAccountCreationEmail,
  sendTemplatedEmail,
  sendEmail // Pour des cas d'usage avancés
}
