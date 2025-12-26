import type { EmailConfig, EmailResult, AccountCreationEmailData, ForgotPasswordEmailData, EmailChangeVerificationData } from '~~/server/types/mail'
import { accountCreationTemplate } from './templates/account-creation'
import { forgotPasswordTemplate } from './templates/forgot-password'
import { emailChangeVerificationTemplate } from './templates/email-verification'
import { Resend } from 'resend'

/**
 * Service d'envoi d'emails via Resend
 * Fournit des méthodes haut niveau pour envoyer des emails typés
 */

// Singleton du client Resend
let _resendClient: Resend | null = null

/**
 * Obtenir le client Resend (lazy initialization)
 */
function getResendClient(): Resend {
  if (!_resendClient) {
    const config = useRuntimeConfig()
    _resendClient = new Resend(config.resend.apiKey)
  }
  return _resendClient
}

/**
 * Obtenir l'adresse email par défaut de l'expéditeur depuis le runtimeConfig
 */
function getDefaultFrom(): string {
  const config = useRuntimeConfig()
  return config.resend.fromEmail
}

export const resend = getResendClient()

/**
 * Fonction générique pour envoyer un email via Resend
 */
async function sendEmail(config: EmailConfig): Promise<EmailResult> {
  try {
    // Obtenir la configuration Resend depuis le runtimeConfig
    const runtimeConfig = useRuntimeConfig()

    // Vérifier que la clé API Resend est configurée
    if (!runtimeConfig.resend.apiKey) {
      console.error('[Mail Service] RESEND_API_KEY n\'est pas configurée dans le runtimeConfig')
      return {
        success: false,
        error: 'Configuration Resend manquante'
      }
    }

    // Obtenir le client Resend et l'email par défaut
    const resendClient = getResendClient()
    const defaultFrom = getDefaultFrom()

    // Envoyer l'email via Resend
    const { data, error } = await resendClient.emails.send({
      from: config.from || defaultFrom,
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
 * Envoie un email de réinitialisation de mot de passe
 *
 * @example
 * ```typescript
 * const result = await sendForgotPasswordEmail({
 *   email: 'user@example.com',
 *   firstName: 'Jean',
 *   lastName: 'Dupont',
 *   resetPasswordUrl: 'https://feef-workflow.com/reset-password?token=abc123',
 *   expiresInHours: 48
 * })
 * ```
 */
export async function sendForgotPasswordEmail(
  data: ForgotPasswordEmailData
): Promise<EmailResult> {
  const subject = forgotPasswordTemplate.getSubject(data)
  const html = forgotPasswordTemplate.getHtml(data)

  return sendEmail({
    to: data.email,
    subject,
    html
  })
}

/**
 * Envoie un email de vérification de changement d'adresse email
 *
 * @example
 * ```typescript
 * const result = await sendEmailChangeVerificationEmail({
 *   email: 'newemail@example.com',
 *   firstName: 'Jean',
 *   lastName: 'Dupont',
 *   oldEmail: 'oldemail@example.com',
 *   verificationUrl: 'https://feef-workflow.com/verify-email?token=abc123',
 *   expiresInHours: 48
 * })
 * ```
 */
export async function sendEmailChangeVerificationEmail(
  data: EmailChangeVerificationData
): Promise<EmailResult> {
  const subject = emailChangeVerificationTemplate.getSubject(data)
  const html = emailChangeVerificationTemplate.getHtml(data)

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
  sendForgotPasswordEmail,
  sendEmailChangeVerificationEmail,
  sendTemplatedEmail,
  sendEmail // Pour des cas d'usage avancés
}
