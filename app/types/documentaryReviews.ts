import type { DocumentaryReview as DBDocumentaryReview } from '~~/server/database/schema'

// Type pour la création d'un documentary review
export interface CreateDocumentaryReviewData {
  entityId: number
  // Cas 1 : Création manuelle
  title?: string
  description?: string
  category?: 'LEGAL' | 'FINANCIAL' | 'TECHNICAL' | 'OTHER'
  // Cas 2 : Depuis un documentType
  documentTypeId?: number
}

// Type pour la mise à jour d'un documentary review
export interface UpdateDocumentaryReviewData {
  title?: string
  description?: string
  category?: 'LEGAL' | 'FINANCIAL' | 'TECHNICAL' | 'OTHER'
}

// Type pour un documentary review (depuis la DB)
export type DocumentaryReview = DBDocumentaryReview

// Enum pour les catégories (pour l'UI)
export const DocumentCategory = {
  LEGAL: 'LEGAL',
  FINANCIAL: 'FINANCIAL',
  TECHNICAL: 'TECHNICAL',
  OTHER: 'OTHER',
} as const

export type DocumentCategoryType = typeof DocumentCategory[keyof typeof DocumentCategory]

// Labels français pour les catégories
export const DocumentCategoryLabels: Record<DocumentCategoryType, string> = {
  LEGAL: 'Juridique',
  FINANCIAL: 'Financier',
  TECHNICAL: 'Technique',
  OTHER: 'Autre',
}

// Icônes pour les catégories
export const DocumentCategoryIcons: Record<DocumentCategoryType, string> = {
  LEGAL: 'i-lucide-scale',
  FINANCIAL: 'i-lucide-coins',
  TECHNICAL: 'i-lucide-wrench',
  OTHER: 'i-lucide-folder',
}

// Couleurs pour les catégories
export const DocumentCategoryColors: Record<DocumentCategoryType, 'primary' | 'success' | 'warning' | 'neutral'> = {
  LEGAL: 'primary',
  FINANCIAL: 'success',
  TECHNICAL: 'warning',
  OTHER: 'neutral',
}
