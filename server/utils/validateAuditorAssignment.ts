import type { AssignAuditorData } from '~~/app/types/audits'

interface ValidationResult {
  isValid: boolean
  error?: string
  sanitizedData?: { auditorId: number | null; externalAuditorName: string | null }
}

/**
 * Valide les données d'assignation d'auditeur
 * Garantit la mutual exclusivité entre auditorId et externalAuditorName
 */
export function validateAuditorAssignment(data: AssignAuditorData): ValidationResult {
  const { auditorType, auditorId, externalAuditorName } = data

  // Valider le type d'auditeur
  if (!['account', 'external'].includes(auditorType)) {
    return { isValid: false, error: 'auditorType doit être "account" ou "external"' }
  }

  if (auditorType === 'account') {
    // Valider l'assignation basée sur un compte
    if (!auditorId || typeof auditorId !== 'number') {
      return { isValid: false, error: 'auditorId est requis pour un compte existant' }
    }
    return {
      isValid: true,
      sanitizedData: { auditorId, externalAuditorName: null },
    }
  }
  else {
    // Valider l'assignation d'un auditeur externe
    if (!externalAuditorName || typeof externalAuditorName !== 'string') {
      return { isValid: false, error: 'externalAuditorName est requis pour un auditeur externe' }
    }
    const trimmedName = externalAuditorName.trim()
    if (trimmedName.length === 0) {
      return { isValid: false, error: 'Le nom de l\'auditeur externe ne peut pas être vide' }
    }
    if (trimmedName.length > 255) {
      return { isValid: false, error: 'Le nom de l\'auditeur externe ne peut pas dépasser 255 caractères' }
    }
    return {
      isValid: true,
      sanitizedData: { auditorId: null, externalAuditorName: trimmedName },
    }
  }
}
