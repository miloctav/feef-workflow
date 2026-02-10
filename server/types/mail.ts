/**
 * Types pour le système d'envoi d'emails
 */

/**
 * Types d'emails disponibles dans l'application
 */
export type EmailType =
  | 'account-creation'
  | 'password-reset'
  | 'email-change-verification'
  | 'two-factor-code'
  | 'audit-reminder'
  | 'decision-notification'
  | 'oe-assignment'
  | 'attestation-issued'
  | 'action-created'
  | 'action-reminder'

/**
 * Configuration de base pour l'envoi d'un email
 */
export interface EmailConfig {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
}

/**
 * Résultat de l'envoi d'un email
 */
export interface EmailResult {
  success: boolean
  id?: string
  error?: string
}

/**
 * Données pour l'email de création de compte
 */
export interface AccountCreationEmailData {
  email: string
  firstName: string
  lastName: string
  role: string
  resetPasswordUrl: string
  expiresInHours: number
}

/**
 * Données pour l'email de mot de passe oublié
 */
export interface ForgotPasswordEmailData {
  email: string
  firstName: string
  lastName: string
  resetPasswordUrl: string
  expiresInHours: number
}

/**
 * Données pour l'email de vérification de changement d'adresse email
 */
export interface EmailChangeVerificationData {
  email: string          // Nouvelle adresse email
  firstName: string
  lastName: string
  oldEmail: string       // Adresse email actuelle
  verificationUrl: string
  expiresInHours: number
}

/**
 * Données pour l'email de code 2FA
 */
export interface TwoFactorCodeData {
  email: string
  firstName: string
  lastName: string
  code: string
  expiresInMinutes: number
}

/**
 * Données pour l'email de notification d'action créée
 */
export interface ActionCreatedEmailData {
  email: string
  firstName: string
  lastName: string
  actionTitle: string
  actionDescription: string
  entityName: string
  deadline: string
  actionUrl: string
}

/**
 * Données pour l'email de rappel de deadline d'action
 */
export interface ActionReminderEmailData {
  email: string
  firstName: string
  lastName: string
  actionTitle: string
  actionDescription: string
  entityName: string
  deadline: string
  daysRemaining: number
  actionUrl: string
}

/**
 * Template d'email générique
 */
export interface EmailTemplate<T = any> {
  type: EmailType
  getSubject: (data: T) => string
  getHtml: (data: T) => string
}
