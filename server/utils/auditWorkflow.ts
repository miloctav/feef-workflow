import { db } from '~~/server/database'
import { audits } from '~~/server/database/schema'
import { eq } from 'drizzle-orm'
import { AuditStatus, type AuditStatusType } from '#shared/types/enums'
import { AuditDocumentType, type AuditDocumentTypeType } from '~~/app/types/auditDocuments'

/**
 * Règles de transition automatique du status d'audit lors de l'upload d'un document
 *
 * Format: documentType → { currentStatus → newStatus }
 */
const transitionRules: Partial<Record<AuditDocumentTypeType, Partial<Record<AuditStatusType, AuditStatusType>>>> = {
  [AuditDocumentType.REPORT]: {
    [AuditStatus.PENDING_REPORT]: AuditStatus.PENDING_CORRECTIVE_PLAN
  },
  [AuditDocumentType.CORRECTIVE_PLAN]: {
    [AuditStatus.PENDING_CORRECTIVE_PLAN]: AuditStatus.PENDING_CORRECTIVE_PLAN_VALIDATION
  },
  [AuditDocumentType.OE_OPINION]: {
    [AuditStatus.PENDING_OE_OPINION]: AuditStatus.PENDING_FEEF_DECISION
  },
}

/**
 * Gère la transition automatique du status d'un audit lors de l'upload d'un document
 *
 * @param auditId - ID de l'audit
 * @param documentType - Type de document uploadé
 * @param currentStatus - Status actuel de l'audit
 * @param userId - ID de l'utilisateur qui effectue l'action
 * @returns Le nouveau status si une transition a eu lieu, null sinon
 */
export async function handleAuditDocumentUpload(
  auditId: number,
  documentType: AuditDocumentTypeType,
  currentStatus: AuditStatusType | null,
  userId: number
): Promise<AuditStatusType | null> {
  if (!currentStatus) return null

  const newStatus = transitionRules[documentType]?.[currentStatus]
  if (!newStatus) return null

  await db.update(audits)
    .set({
      status: newStatus,
      updatedBy: userId,
      updatedAt: new Date()
    })
    .where(eq(audits.id, auditId))

  return newStatus
}
