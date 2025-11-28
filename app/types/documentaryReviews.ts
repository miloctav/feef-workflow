import type { DocumentaryReview as DBDocumentaryReview } from '~~/server/database/schema'
import type { DocumentaryReviewCategoryType } from '#shared/types/enums'

// Type pour la création d'un documentary review
export interface CreateDocumentaryReviewData {
  entityId: number
  // Cas 1 : Création manuelle
  title?: string
  description?: string
  category?: DocumentaryReviewCategoryType
  // Cas 2 : Depuis un documentType
  documentTypeId?: number
}

// Type pour la mise à jour d'un documentary review
export interface UpdateDocumentaryReviewData {
  title?: string
  description?: string
  category?: DocumentaryReviewCategoryType
}

// Type pour un documentary review (depuis la DB)
export type DocumentaryReview = DBDocumentaryReview
