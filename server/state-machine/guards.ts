/**
 * Guards (Prédicats) pour la State Machine des audits
 *
 * Les guards sont des fonctions de vérification qui déterminent
 * si une transition est autorisée en fonction de l'état de l'audit.
 *
 * Chaque guard retourne true si la condition est remplie, false sinon.
 */

import { db } from '~~/server/database'
import { entities, documentVersions } from '~~/server/database/schema'
import { eq, and, isNotNull, or } from 'drizzle-orm'
import type { Audit } from '~~/server/database/schema'
import { hasEventOccurred } from '~~/server/services/events'
import { AuditDocumentType } from '~~/app/types/auditDocuments'

/**
 * Vérifie si l'audit a un OE assigné
 *
 * Vérifie d'abord audit.oeId, puis entity.oeId si nécessaire.
 */
export async function hasOeAssigned(audit: Audit): Promise<boolean> {
  if (audit.oeId) return true

  // Vérifier aussi au niveau de l'entité
  const entity = await db.query.entities.findFirst({
    where: eq(entities.id, audit.entityId),
    columns: { oeId: true }
  })

  return entity?.oeId !== null && entity?.oeId !== undefined
}

/**
 * Vérifie si l'audit n'a PAS d'OE assigné
 *
 * Inverse de hasOeAssigned.
 */
export async function noOeAssigned(audit: Audit): Promise<boolean> {
  return !(await hasOeAssigned(audit))
}

/**
 * Vérifie si un plan d'audit existe (document PLAN uploadé)
 *
 * Recherche un document de type PLAN avec s3Key non null.
 */
export async function hasAuditPlan(audit: Audit): Promise<boolean> {
  const planDocument = await db.query.documentVersions.findFirst({
    where: and(
      eq(documentVersions.auditId, audit.id),
      eq(documentVersions.auditDocumentType, 'PLAN'),
      isNotNull(documentVersions.s3Key)
    )
  })

  return planDocument !== undefined
}

/**
 * Vérifie si les dates réelles sont définies
 *
 * Vérifie que actualStartDate ET actualEndDate sont non nulles.
 */
export async function hasActualDates(audit: Audit): Promise<boolean> {
  return audit.actualStartDate !== null && audit.actualEndDate !== null
}

/**
 * Vérifie si la date de fin est dans le futur
 *
 * Compare actualEndDate avec aujourd'hui (sans les heures).
 */
export async function endDateIsFuture(audit: Audit): Promise<boolean> {
  if (!audit.actualEndDate) return false

  const today = new Date()
  const endDate = new Date(audit.actualEndDate)
  today.setHours(0, 0, 0, 0)
  endDate.setHours(0, 0, 0, 0)

  return endDate >= today
}

/**
 * Vérifie si la date de fin est passée
 *
 * Compare actualEndDate avec aujourd'hui (sans les heures).
 * Inverse de endDateIsFuture mais avec date strictement passée.
 */
export async function actualEndDatePassed(audit: Audit): Promise<boolean> {
  if (!audit.actualEndDate) return false

  const today = new Date()
  const endDate = new Date(audit.actualEndDate)
  today.setHours(0, 0, 0, 0)
  endDate.setHours(0, 0, 0, 0)

  return endDate < today
}

/**
 * Vérifie si un rapport d'audit existe (document REPORT uploadé)
 *
 * Recherche un document de type REPORT avec s3Key non null.
 */
export async function hasReportDocument(audit: Audit): Promise<boolean> {
  const reportDocument = await db.query.documentVersions.findFirst({
    where: and(
      eq(documentVersions.auditId, audit.id),
      eq(documentVersions.auditDocumentType, 'REPORT'),
      isNotNull(documentVersions.s3Key)
    )
  })

  return reportDocument !== undefined
}

/**
 * Vérifie si le score global est défini
 *
 * Vérifie que globalScore est non null et non undefined.
 */
export async function hasGlobalScore(audit: Audit): Promise<boolean> {
  return audit.globalScore !== null && audit.globalScore !== undefined
}

/**
 * Vérifie si un plan d'action est nécessaire
 *
 * Vérifie le champ actionPlanType calculé par updateActionPlanType().
 * Retourne true si le type est SHORT ou LONG (pas NONE).
 */
export async function needsActionPlan(audit: Audit): Promise<boolean> {
  return audit.actionPlanType !== 'NONE' && audit.actionPlanType !== null
}

/**
 * Vérifie qu'aucun plan d'action n'a été uploadé
 *
 * Recherche un document de type SHORT_ACTION_PLAN ou LONG_ACTION_PLAN avec s3Key non null.
 * Retourne true si AUCUN plan n'existe.
 */
export async function noActionPlanUploaded(audit: Audit): Promise<boolean> {
  const actionPlanDocument = await db.query.documentVersions.findFirst({
    where: and(
      eq(documentVersions.auditId, audit.id),
      or(
        eq(documentVersions.auditDocumentType, AuditDocumentType.SHORT_ACTION_PLAN),
        eq(documentVersions.auditDocumentType, AuditDocumentType.LONG_ACTION_PLAN)
      ),
      isNotNull(documentVersions.s3Key)
    )
  })

  return actionPlanDocument === undefined
}

/**
 * Vérifie si un plan d'action existe
 *
 * Inverse de noActionPlanUploaded.
 */
export async function hasActionPlanDocument(audit: Audit): Promise<boolean> {
  return !(await noActionPlanUploaded(audit))
}

/**
 * Vérifie si le plan d'action a été validé
 *
 * Vérifie qu'un événement AUDIT_CORRECTIVE_PLAN_VALIDATED existe.
 */
export async function actionPlanValidated(audit: Audit): Promise<boolean> {
  return await hasEventOccurred('AUDIT_CORRECTIVE_PLAN_VALIDATED', { auditId: audit.id })
}

/**
 * Vérifie si l'avis OE a été transmis
 *
 * Vérifie qu'un événement AUDIT_OE_OPINION_TRANSMITTED existe.
 */
export async function hasOeOpinion(audit: Audit): Promise<boolean> {
  return await hasEventOccurred('AUDIT_OE_OPINION_TRANSMITTED', { auditId: audit.id })
}

/**
 * Vérifie si la décision FEEF a été prise
 *
 * Vérifie qu'un événement AUDIT_FEEF_DECISION_ACCEPTED ou AUDIT_FEEF_DECISION_REJECTED existe.
 */
export async function hasFeefDecision(audit: Audit): Promise<boolean> {
  const acceptedEvent = await hasEventOccurred('AUDIT_FEEF_DECISION_ACCEPTED', { auditId: audit.id })
  const rejectedEvent = await hasEventOccurred('AUDIT_FEEF_DECISION_REJECTED', { auditId: audit.id })
  return acceptedEvent || rejectedEvent
}

/**
 * Vérifie si l'audit nécessite une acceptation OE
 *
 * Vérifie que le type d'audit est INITIAL ou RENEWAL (pas MONITORING).
 */
export async function requiresOeAcceptance(audit: Audit): Promise<boolean> {
  return audit.type === 'INITIAL' || audit.type === 'RENEWAL'
}

/**
 * Vérifie si l'audit est de type MONITORING
 *
 * Les audits MONITORING passent directement en PLANNING sans acceptation OE.
 */
export async function isMonitoringAudit(audit: Audit): Promise<boolean> {
  return audit.type === 'MONITORING'
}

/**
 * Vérifie si l'OE a accepté l'audit
 *
 * Vérifie qu'un événement AUDIT_OE_ACCEPTED existe.
 */
export async function oeHasAccepted(audit: Audit): Promise<boolean> {
  return await hasEventOccurred('AUDIT_OE_ACCEPTED', { auditId: audit.id })
}

/**
 * Vérifie si l'OE a refusé l'audit
 *
 * Vérifie qu'un événement AUDIT_OE_REFUSED existe.
 */
export async function oeHasRefused(audit: Audit): Promise<boolean> {
  return await hasEventOccurred('AUDIT_OE_REFUSED', { auditId: audit.id })
}

// ============================================
// Guards pour l'audit complémentaire
// ============================================

/**
 * Vérifie si le plan d'action a été refusé
 *
 * Vérifie qu'un événement AUDIT_CORRECTIVE_PLAN_REFUSED existe.
 */
export async function actionPlanRefused(audit: Audit): Promise<boolean> {
  return await hasEventOccurred('AUDIT_CORRECTIVE_PLAN_REFUSED', { auditId: audit.id })
}

/**
 * Vérifie si un audit complémentaire a été demandé
 *
 * Vérifie qu'un événement AUDIT_COMPLEMENTARY_REQUESTED existe.
 */
export async function complementaryAuditRequested(audit: Audit): Promise<boolean> {
  return await hasEventOccurred('AUDIT_COMPLEMENTARY_REQUESTED', { auditId: audit.id })
}

/**
 * Vérifie qu'aucun audit complémentaire n'a été fait précédemment
 *
 * Vérifie que hasComplementaryAudit est false.
 */
export async function noPreviousComplementaryAudit(audit: Audit): Promise<boolean> {
  return audit.hasComplementaryAudit !== true
}

/**
 * Vérifie si le score global complémentaire est défini
 *
 * Vérifie que complementaryGlobalScore est non null.
 */
export async function hasComplementaryGlobalScore(audit: Audit): Promise<boolean> {
  return audit.complementaryGlobalScore !== null && audit.complementaryGlobalScore !== undefined
}

/**
 * Vérifie si un rapport d'audit complémentaire existe
 *
 * Recherche un document de type REPORT uploadé après le début de l'audit complémentaire
 * ou vérifie que complementaryGlobalScore est défini (rapport uploadé avec score).
 */
export async function hasComplementaryReport(audit: Audit): Promise<boolean> {
  // Un rapport complémentaire est considéré comme uploadé si le score complémentaire est défini
  // car le score n'est défini que lors de l'upload du rapport complémentaire
  return audit.complementaryGlobalScore !== null && audit.complementaryGlobalScore !== undefined
}
