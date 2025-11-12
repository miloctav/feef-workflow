import type { Audit, AuditTypeType } from '~~/server/database/schema'
import type { EntityWithRelations } from './entities'

/**
 * Types pour les audits
 */

// Audit public (pour affichage)
export type AuditPublic = Omit<Audit, 'deletedAt'>

// Donn�es pour cr�er un audit
export interface CreateAuditData {
  entityId: number
  type: AuditTypeType
  oeId: number
  auditorId: number
  plannedStartDate?: string
  plannedEndDate?: string
  actualStartDate?: string
  actualEndDate?: string
  score?: number
  labelingOpinion?: any
}

// Donn�es pour mettre � jour un audit
// IMPORTANT: entityId et type ne peuvent PAS �tre modifi�s
export interface UpdateAuditData {
  oeId?: number
  auditorId?: number
  plannedStartDate?: string | null
  plannedEndDate?: string | null
  actualStartDate?: string | null
  actualEndDate?: string | null
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

// Audit avec relations compl�tes
export interface AuditWithRelations extends AuditPublic {
  entity: AuditEntity
  oe?: AuditOE | null
  auditor?: AuditAuditor | null
}
