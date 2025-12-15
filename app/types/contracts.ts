import type { Contract as DBContract, Entity, OE, Account, DocumentVersion } from '~~/server/database/schema'

// Type de base depuis la DB
export type Contract = DBContract

// Type avec relations complètes
export interface ContractWithRelations extends Contract {
  entity: Entity
  oe: OE | null
  createdByAccount: Pick<Account, 'id' | 'firstname' | 'lastname' | 'email'>
  documentVersions: Array<DocumentVersion & {
    uploadByAccount: Pick<Account, 'id' | 'firstname' | 'lastname'>
  }>
}

// Type pour la création d'un contrat
export interface CreateContractData {
  entityId?: number // Optionnel pour les utilisateurs ENTITY (utilise user.currentEntityId par défaut)
  title: string
  description?: string
  forceOeId?: number | null // null pour forcer FEEF, number pour forcer un OE, undefined pour auto
  requiresSignature?: boolean // Si le contrat doit être signé (FEEF uniquement)
  signatureType?: 'ENTITY_ONLY' | 'ENTITY_AND_FEEF' | null // Qui doit signer
  // Validity fields - only one should be provided
  validityMonths?: number // Duration in months
  validityYears?: number // Duration in years
  validityEndDate?: string // Direct end date (ISO format)
}

// Type pour la mise à jour d'un contrat
export interface UpdateContractData {
  title?: string
  description?: string | null
  // Validity fields - only one should be provided, or null to clear
  validityMonths?: number | null
  validityYears?: number | null
  validityEndDate?: string | null
}
