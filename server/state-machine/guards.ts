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
import { eq, and, isNotNull } from 'drizzle-orm'
import type { Audit } from '~~/server/database/schema'

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
 * Vérifie si un plan correctif est nécessaire
 *
 * Vérifie le flag needsCorrectivePlan calculé par updateNeedsCorrectivePlan().
 * Ce flag est true si score < 65 OU si notation C/D détectée.
 */
export async function needsCorrectivePlan(audit: Audit): Promise<boolean> {
  return audit.needsCorrectivePlan === true
}

/**
 * Vérifie qu'aucun plan correctif n'a été uploadé
 *
 * Recherche un document de type CORRECTIVE_PLAN avec s3Key non null.
 * Retourne true si AUCUN plan n'existe.
 */
export async function noCorrectivePlanUploaded(audit: Audit): Promise<boolean> {
  const correctivePlanDocument = await db.query.documentVersions.findFirst({
    where: and(
      eq(documentVersions.auditId, audit.id),
      eq(documentVersions.auditDocumentType, 'CORRECTIVE_PLAN'),
      isNotNull(documentVersions.s3Key)
    )
  })

  return correctivePlanDocument === undefined
}

/**
 * Vérifie si un plan correctif existe
 *
 * Inverse de noCorrectivePlanUploaded.
 */
export async function hasCorrectivePlanDocument(audit: Audit): Promise<boolean> {
  return !(await noCorrectivePlanUploaded(audit))
}

/**
 * Vérifie si le plan correctif a été validé
 *
 * Vérifie que correctivePlanValidatedAt est non null.
 */
export async function correctivePlanValidated(audit: Audit): Promise<boolean> {
  return audit.correctivePlanValidatedAt !== null
}

/**
 * Vérifie si l'avis OE a été transmis
 *
 * Vérifie que oeOpinionTransmittedAt est non null.
 */
export async function hasOeOpinion(audit: Audit): Promise<boolean> {
  return audit.oeOpinionTransmittedAt !== null
}

/**
 * Vérifie si la décision FEEF a été prise
 *
 * Vérifie que feefDecisionAt est non null.
 */
export async function hasFeefDecision(audit: Audit): Promise<boolean> {
  return audit.feefDecisionAt !== null
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
 * Vérifie que oeAccepted === true et oeResponseAt est non null.
 */
export async function oeHasAccepted(audit: Audit): Promise<boolean> {
  return audit.oeAccepted === true && audit.oeResponseAt !== null
}

/**
 * Vérifie si l'OE a refusé l'audit
 *
 * Vérifie que oeAccepted === false et oeResponseAt est non null.
 */
export async function oeHasRefused(audit: Audit): Promise<boolean> {
  return audit.oeAccepted === false && audit.oeResponseAt !== null
}
