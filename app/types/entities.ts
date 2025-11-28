import type { Entity, EntityTypeType, EntityModeType, Audit } from '~~/server/database/schema'
import type { AuditPublic } from './audits'

/**
 * Types pour les entités (entreprises et groupes)
 */

// Entity public (pour affichage)
export type EntityPublic = Omit<Entity, 'deletedAt'>

// Données pour créer une entité
export interface CreateEntityData {
  name: string
  type: EntityTypeType
  mode: EntityModeType
  siret?: string
  parentGroupId?: number
  oeId?: number
  accountManagerId?: number
}

// Données pour mettre à jour une entité
export interface UpdateEntityData {
  name?: string
  siret?: string
  type?: EntityTypeType
  mode?: EntityModeType
  parentGroupId?: number | null
  oeId?: number | null
  accountManagerId?: number | null
}

// Types pour les relations
export interface EntityOE {
  id: number
  name: string
}

export interface EntityAccountManager {
  id: number
  firstname: string
  lastname: string
  email: string
}

export interface EntityParentGroup {
  id: number
  name: string
}

export interface EntityAccount {
  id: number
  firstname: string
  lastname: string
  email: string
}

// Champ versionné d'une entité
export interface EntityField {
  key: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'date'
  value: string | number | boolean | Date | null
  unit?: string
  lastUpdatedAt?: Date
  lastUpdatedBy?: number
}

// Entity avec relations complètes
export interface EntityWithRelations extends EntityPublic {
  oe?: EntityOE | null
  accountManager?: EntityAccountManager | null
  parentGroup?: EntityParentGroup | null
  childEntities?: EntityWithRelations[]
  fields?: EntityField[]
  audits?: AuditPublic[]
}
