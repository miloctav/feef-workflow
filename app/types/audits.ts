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
  pannedDate?: string
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
  pannedDate?: string | null
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

export interface AuditAccount {
  id: number
  firstname: string
  lastname: string
}

// Dernière version d'un document d'audit
export interface LastDocumentVersion {
  id: number
  uploadAt: Date | string
  s3Key: string | null
  filename: string | null
  fileSize: number | null
  mimeType: string | null
  uploadByAccount: {
    id: number
    firstname: string
    lastname: string
  }
}

// Dernières versions par type de document
export interface LastDocumentVersions {
  PLAN?: LastDocumentVersion
  REPORT?: LastDocumentVersion
  CORRECTIVE_PLAN?: LastDocumentVersion
  OE_OPINION?: LastDocumentVersion
  ATTESTATION?: LastDocumentVersion
}

// Audit avec relations complètes
export interface AuditWithRelations extends AuditPublic {
  entity: AuditEntity
  oe?: AuditOE | null
  auditor?: AuditAuditor | null
  caseSubmittedByAccount?: AuditAccount | null
  caseApprovedByAccount?: AuditAccount | null
  lastDocumentVersions?: LastDocumentVersions
}
