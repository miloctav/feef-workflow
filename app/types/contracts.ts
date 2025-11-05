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
}

// Type pour la mise à jour d'un contrat
export interface UpdateContractData {
  title?: string
  description?: string | null
}
