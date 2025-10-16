import type { DocumentType } from '~~/server/database/schema'

/**
 * Types pour les documents types
 */

// Document type public (pour affichage)
export type DocumentTypePublic = Omit<DocumentType, 'deletedAt'>

// Données pour créer un document type
export interface CreateDocumentTypeData {
  title: string
  description?: string
  category: DocumentType['category']
  autoAsk?: boolean
}

// Données pour mettre à jour un document type
export interface UpdateDocumentTypeData {
  title?: string
  description?: string
  category?: DocumentType['category']
  autoAsk?: boolean
}

// Document type avec relations (pour extensions futures)
export interface DocumentTypeWithRelations extends DocumentTypePublic {
  // Relations possibles à ajouter plus tard
  // documents?: Document[]
}
