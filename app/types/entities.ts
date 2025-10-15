import type { Entity, EntityTypeType, EntityModeType } from '~~/server/database/schema'

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
  siren?: string
  siret?: string
  parentGroupId?: number
  oeId?: number
  accountManagerId?: number
}

// Données pour mettre à jour une entité
export interface UpdateEntityData {
  name?: string
  siren?: string
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

// Entity avec relations complètes
export interface EntityWithRelations extends EntityPublic {
  oe?: EntityOE | null
  accountManager?: EntityAccountManager | null
  parentGroup?: EntityParentGroup | null
  childEntities?: EntityWithRelations[]
}
