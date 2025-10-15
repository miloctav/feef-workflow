import type { OE } from '~~/server/database/schema'

/**
 * Types pour les organismes évaluateurs (OE)
 */

// OE public (pour affichage)
export type OEPublic = Omit<OE, 'deletedAt'>

// Données pour créer un OE
export interface CreateOEData {
  name: string
}

// Données pour mettre à jour un OE
export interface UpdateOEData {
  name?: string
}

// OE avec relations (pour extensions futures)
export interface OEWithRelations extends OEPublic {
  // Relations possibles à ajouter plus tard
  // accounts?: Account[]
  // entities?: Entity[]
  // audits?: Audit[]
}
