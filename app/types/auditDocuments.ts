// Enum pour les types de documents d'audit
export const AuditDocumentType = {
  PLAN: 'PLAN',
  REPORT: 'REPORT',
  SHORT_ACTION_PLAN: 'SHORT_ACTION_PLAN',
  LONG_ACTION_PLAN: 'LONG_ACTION_PLAN',
  OE_OPINION: 'OE_OPINION',
  ATTESTATION: 'ATTESTATION',
} as const

export type AuditDocumentTypeType = typeof AuditDocumentType[keyof typeof AuditDocumentType]

// Labels français pour les types de documents d'audit
export const AuditDocumentTypeLabels: Record<AuditDocumentTypeType, string> = {
  PLAN: 'Plan d\'audit',
  REPORT: 'Rapport d\'audit',
  SHORT_ACTION_PLAN: 'Plan d\'action court terme (15 jours)',
  LONG_ACTION_PLAN: 'Plan d\'action long terme (6 mois)',
  OE_OPINION: 'Avis de labellisation',
  ATTESTATION: 'Attestation de labellisation',
}

// Icônes pour les types de documents d'audit
export const AuditDocumentTypeIcons: Record<AuditDocumentTypeType, string> = {
  PLAN: 'i-lucide-calendar-check',
  REPORT: 'i-lucide-file-text',
  SHORT_ACTION_PLAN: 'i-lucide-list-checks',
  LONG_ACTION_PLAN: 'i-lucide-clipboard-list',
  OE_OPINION: 'i-lucide-shield-check',
  ATTESTATION: 'i-lucide-award',
}

// Couleurs pour les types de documents d'audit
export const AuditDocumentTypeColors: Record<AuditDocumentTypeType, 'primary' | 'success' | 'warning' | 'neutral'> = {
  PLAN: 'primary',
  REPORT: 'success',
  SHORT_ACTION_PLAN: 'warning',
  LONG_ACTION_PLAN: 'warning',
  OE_OPINION: 'neutral',
  ATTESTATION: 'success',
}

// Interface pour créer un document d'audit
export interface CreateAuditDocumentData {
  auditId: number
  auditDocumentType: AuditDocumentTypeType
  file: File
  comment?: string
}

// Interface pour les filtres de documents d'audit
export interface AuditDocumentFilters {
  auditId: number
  auditDocumentType?: AuditDocumentTypeType
}
