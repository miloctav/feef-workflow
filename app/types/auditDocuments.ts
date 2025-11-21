// Enum pour les types de documents d'audit
export const AuditDocumentType = {
  PLAN: 'PLAN',
  REPORT: 'REPORT',
  CORRECTIVE_PLAN: 'CORRECTIVE_PLAN',
  OE_OPINION: 'OE_OPINION',
} as const

export type AuditDocumentTypeType = typeof AuditDocumentType[keyof typeof AuditDocumentType]

// Labels français pour les types de documents d'audit
export const AuditDocumentTypeLabels: Record<AuditDocumentTypeType, string> = {
  PLAN: 'Plan d\'audit',
  REPORT: 'Rapport d\'audit',
  CORRECTIVE_PLAN: 'Plan d\'action correctif',
  OE_OPINION: 'Avis de labellisation',
}

// Icônes pour les types de documents d'audit
export const AuditDocumentTypeIcons: Record<AuditDocumentTypeType, string> = {
  PLAN: 'i-lucide-calendar-check',
  REPORT: 'i-lucide-file-text',
  CORRECTIVE_PLAN: 'i-lucide-list-checks',
  OE_OPINION: 'i-lucide-shield-check',
}

// Couleurs pour les types de documents d'audit
export const AuditDocumentTypeColors: Record<AuditDocumentTypeType, 'primary' | 'success' | 'warning' | 'neutral'> = {
  PLAN: 'primary',
  REPORT: 'success',
  CORRECTIVE_PLAN: 'warning',
  OE_OPINION: 'neutral',
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
