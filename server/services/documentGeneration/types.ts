import type { H3Event } from 'h3'

/**
 * Contexte de génération de document
 * Contient toutes les informations nécessaires pour générer un document
 */
export interface DocumentGenerationContext {
  event: H3Event           // Pour tracking (createdBy, etc.)
  data: Record<string, any> // Données métier (audit, entity, oe, etc.)
}

/**
 * Résultat de génération de document
 */
export interface DocumentGenerationResult {
  buffer: Buffer           // Contenu PDF généré
  filename: string         // Nom de fichier suggéré
  mimeType: string         // Type MIME (ex: 'application/pdf')
}

/**
 * Options pour sauvegarder le document généré
 */
export interface SaveDocumentOptions {
  auditId?: number
  auditDocumentType?: string
  documentaryReviewId?: number
  contractId?: number
  entityId: number
}
