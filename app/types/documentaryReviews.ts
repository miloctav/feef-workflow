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

// Compte minimal renvoyé par l'API sur les versions
export interface DocumentVersionAccount {
  id: number
  firstname: string | null
  lastname: string | null
}

// Version de document telle que renvoyée par la liste des documentary reviews
export interface DocumentaryReviewVersion {
  id: number
  uploadAt: string | Date
  s3Key: string | null
  mimeType: string | null
  askedBy: number | null
  askedAt: string | Date | null
  comment: string | null
  uploadByAccount?: DocumentVersionAccount | null
  askedByAccount?: DocumentVersionAccount | null
}

// Type pour un documentary review (depuis la DB), enrichi des versions par l'API de liste
export type DocumentaryReview = DBDocumentaryReview & {
  documentVersions?: DocumentaryReviewVersion[]
}
