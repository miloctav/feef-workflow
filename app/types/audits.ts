import type { Audit, AuditTypeType } from '~~/server/database/schema'
import type { EntityWithRelations } from './entities'

/**
 * Types pour les audits
 */

// Audit public (pour affichage)
export type AuditPublic = Omit<Audit, 'deletedAt'>

// Données pour créer un audit
export interface CreateAuditData {
  entityId: number
  type: AuditTypeType
  oeId: number
  auditorId: number
  plannedDate?: string
  actualDate?: string
  score?: number
  labelingOpinion?: any
}

// Données pour mettre à jour un audit
// IMPORTANT: entityId et type ne peuvent PAS être modifiés
export interface UpdateAuditData {
  oeId?: number
  auditorId?: number
  plannedDate?: string | null
  actualDate?: string | null
  score?: number | null
  labelingOpinion?: any | null
}

// Types pour les relations

export interface AuditEntity {
  id: number
  name: string
  type: string
  mode: string
  siren: string | null
  siret: string | null
  oe?: {
    id: number
    name: string
  } | null
  accountManager?: {
    id: number
    firstname: string
    lastname: string
    email: string
  } | null
  parentGroup?: {
    id: number
    name: string
    type: string
  } | null
}

export interface AuditOE {
  id: number
  name: string
}

export interface AuditAuditor {
  id: number
  firstname: string
  lastname: string
  email: string
  role: string
  oe?: {
    id: number
    name: string
  } | null
}

// Audit avec relations complètes
export interface AuditWithRelations extends AuditPublic {
  entity: AuditEntity
  oe?: AuditOE | null
  auditor?: AuditAuditor | null
}
