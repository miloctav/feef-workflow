import { eq, and, isNotNull } from 'drizzle-orm'
import { db } from '~~/server/database'
import { audits, auditNotation, documentVersions } from '~~/server/database/schema'
import { AuditStatus, AuditPhase } from '#shared/types/enums'
import { AuditDocumentType } from '~~/app/types/auditDocuments'
import { getLatestEvent } from '~~/server/services/events'

/**
 * Calcule le type de plan d'action nécessaire pour un audit
 *
 * Règles:
 * - LONG si globalScore < 65 (priorité)
 * - SHORT si globalScore >= 65 ET au moins une notation >= 3 (C ou D)
 * - NONE sinon
 *
 * @param auditId - ID de l'audit
 * @returns Le type de plan d'action requis ('NONE', 'SHORT', 'LONG')
 */
export async function calculateActionPlanType(auditId: number): Promise<'NONE' | 'SHORT' | 'LONG'> {
  // 1. Récupérer l'audit pour obtenir le globalScore
  const audit = await db.query.audits.findFirst({
    where: eq(audits.id, auditId),
    columns: {
      id: true,
      globalScore: true,
    },
  })

  if (!audit) {
    throw new Error(`Audit ${auditId} not found`)
  }

  // 2. Vérifier si globalScore < 65 → LONG PLAN (priorité)
  if (audit.globalScore !== null && audit.globalScore < 65) {
    return 'LONG'
  }

  // 3. Récupérer les notations pour vérifier les scores C ou D
  const notations = await db.query.auditNotation.findMany({
    where: eq(auditNotation.auditId, auditId),
    columns: {
      score: true,
    },
  })

  // 4. Vérifier s'il y a au moins un score >= 3 (C ou D) → SHORT PLAN
  const hasBadNotation = notations.some(notation => notation.score >= 3)

  if (audit.globalScore !== null && audit.globalScore >= 65 && hasBadNotation) {
    return 'SHORT'
  }

  // 5. Aucun plan nécessaire
  return 'NONE'
}

/**
 * Calcule la deadline du plan d'action basée sur le type et la date d'upload du rapport
 *
 * @param auditId - ID de l'audit
 * @param planType - Type de plan ('SHORT' ou 'LONG' ou 'NONE')
 * @returns Date de deadline ou null si pas de plan
 */
export async function calculateActionPlanDeadline(
  auditId: number,
  planType: 'SHORT' | 'LONG' | 'NONE'
): Promise<Date | null> {
  if (planType === 'NONE') return null

  // Récupérer la date d'upload du rapport via l'événement AUDIT_REPORT_UPLOADED
  const reportUploadEvent = await getLatestEvent('AUDIT_REPORT_UPLOADED', { auditId })

  if (!reportUploadEvent) {
    console.warn(`⚠️ [calculateActionPlanDeadline] Aucun événement AUDIT_REPORT_UPLOADED trouvé pour audit ${auditId}`)
    return null
  }

  const reportUploadDate = new Date(reportUploadEvent.performedAt)
  const deadline = new Date(reportUploadDate)

  // Ajouter le délai selon le type de plan
  if (planType === 'SHORT') {
    deadline.setDate(deadline.getDate() + 15) // 15 jours
  }
  else if (planType === 'LONG') {
    deadline.setDate(deadline.getDate() + 180) // 6 mois (180 jours)
  }

  return deadline
}

/**
 * Vérifie si un plan d'action du type spécifié a déjà été uploadé pour cet audit
 *
 * @param auditId - ID de l'audit
 * @param planType - Type de plan ('SHORT' ou 'LONG')
 * @returns boolean - true si un plan du type spécifié existe (avec s3Key non null)
 */
export async function actionPlanDocumentExists(
  auditId: number,
  planType: 'SHORT' | 'LONG'
): Promise<boolean> {
  const documentType = planType === 'SHORT' ? AuditDocumentType.SHORT_ACTION_PLAN : AuditDocumentType.LONG_ACTION_PLAN

  const doc = await db.query.documentVersions.findFirst({
    where: and(
      eq(documentVersions.auditId, auditId),
      eq(documentVersions.auditDocumentType, documentType),
      isNotNull(documentVersions.s3Key) // Document uploadé (pas en attente)
    ),
    columns: {
      id: true,
    },
  })

  return !!doc
}

/**
 * Met à jour les champs actionPlanType et actionPlanDeadline d'un audit
 * en les recalculant automatiquement
 *
 * @param auditId - ID de l'audit
 * @param currentUserId - ID de l'utilisateur effectuant la modification (optionnel)
 * @returns Le type de plan d'action calculé
 */
export async function updateActionPlanType(auditId: number, currentUserId?: number): Promise<'NONE' | 'SHORT' | 'LONG'> {
  const actionPlanType = await calculateActionPlanType(auditId)
  const actionPlanDeadline = await calculateActionPlanDeadline(auditId, actionPlanType)

  // Récupérer l'audit pour obtenir le status actuel
  const audit = await db.query.audits.findFirst({
    where: eq(audits.id, auditId),
    columns: {
      id: true,
      status: true,
      actionPlanType: true,
    },
  })

  const updateData: any = {
    actionPlanType,
    actionPlanDeadline,
  }

  // Si le plan n'est plus nécessaire et le status est en attente de plan correctif ou validation, passer à PENDING_OE_OPINION
  if (
    actionPlanType === 'NONE'
    && audit
    && (audit.status === AuditStatus.PENDING_CORRECTIVE_PLAN || audit.status === AuditStatus.PENDING_CORRECTIVE_PLAN_VALIDATION)
  ) {
    updateData.status = AuditStatus.PENDING_OE_OPINION
  }

  // Si un plan devient nécessaire et le status est PENDING_OE_OPINION
  if (
    actionPlanType !== 'NONE'
    && audit
    && audit.status === AuditStatus.PENDING_OE_OPINION
  ) {
    // Vérifier si un plan existe déjà
    const planExists = await actionPlanDocumentExists(auditId, actionPlanType)

    if (planExists) {
      console.log(`⚠️ [updateActionPlanType] Plan ${actionPlanType} nécessaire pour audit ${auditId}, mais un plan existe déjà. Pas de changement de statut.`)
      // Ne pas changer le statut si un plan existe déjà
    }
    else {
      // Aucun plan n'existe encore, transition vers PENDING_CORRECTIVE_PLAN
      updateData.status = AuditStatus.PENDING_CORRECTIVE_PLAN
      console.log(`✅ [updateActionPlanType] Transition PENDING_OE_OPINION → PENDING_CORRECTIVE_PLAN pour audit ${auditId} (type: ${actionPlanType})`)
    }
  }

  if (currentUserId) {
    updateData.updatedBy = currentUserId
    updateData.updatedAt = new Date()
  }

  // Avertissement si le type de plan a changé et qu'un plan était déjà validé
  if (audit && audit.actionPlanType && audit.actionPlanType !== 'NONE' && actionPlanType !== audit.actionPlanType) {
    const planValidated = await getLatestEvent('AUDIT_CORRECTIVE_PLAN_VALIDATED', { auditId: audit.id })
    if (planValidated) {
      console.warn(`⚠️ [updateActionPlanType] Attention: audit ${auditId} a un plan d'action déjà validé, mais le type a changé (${audit.actionPlanType} → ${actionPlanType}). Vérifier manuellement.`)
    }
  }

  await db.update(audits)
    .set(updateData)
    .where(eq(audits.id, auditId))

  return actionPlanType
}

/**
 * Calcule le type de plan d'action nécessaire pour un audit en phase 2 (audit complémentaire)
 *
 * Utilise complementaryGlobalScore et les notations PHASE_2.
 *
 * Règles:
 * - LONG si complementaryGlobalScore < 65 (priorité)
 * - SHORT si complementaryGlobalScore >= 65 ET au moins une notation phase 2 >= 3 (C ou D)
 * - NONE sinon
 *
 * @param auditId - ID de l'audit
 * @returns Le type de plan d'action requis ('NONE', 'SHORT', 'LONG')
 */
export async function calculateActionPlanTypePhase2(auditId: number): Promise<'NONE' | 'SHORT' | 'LONG'> {
  // 1. Récupérer l'audit pour obtenir le complementaryGlobalScore
  const audit = await db.query.audits.findFirst({
    where: eq(audits.id, auditId),
    columns: {
      id: true,
      complementaryGlobalScore: true,
    },
  })

  if (!audit) {
    throw new Error(`Audit ${auditId} not found`)
  }

  // 2. Vérifier si complementaryGlobalScore < 65 → LONG PLAN (priorité)
  if (audit.complementaryGlobalScore !== null && audit.complementaryGlobalScore < 65) {
    return 'LONG'
  }

  // 3. Récupérer les notations de la phase 2 pour vérifier les scores C ou D
  const notations = await db.query.auditNotation.findMany({
    where: and(
      eq(auditNotation.auditId, auditId),
      eq(auditNotation.phase, AuditPhase.PHASE_2)
    ),
    columns: {
      score: true,
    },
  })

  // 4. Vérifier s'il y a au moins un score >= 3 (C ou D) → SHORT PLAN
  const hasBadNotation = notations.some(notation => notation.score >= 3)

  if (audit.complementaryGlobalScore !== null && audit.complementaryGlobalScore >= 65 && hasBadNotation) {
    return 'SHORT'
  }

  // 5. Aucun plan nécessaire
  return 'NONE'
}

/**
 * Met à jour les champs actionPlanType et actionPlanDeadline d'un audit
 * après l'audit complémentaire (phase 2)
 *
 * @param auditId - ID de l'audit
 * @param currentUserId - ID de l'utilisateur effectuant la modification
 * @returns Le type de plan d'action calculé
 */
export async function updateActionPlanTypePhase2(auditId: number, currentUserId?: number): Promise<'NONE' | 'SHORT' | 'LONG'> {
  const actionPlanType = await calculateActionPlanTypePhase2(auditId)

  // Pour la phase 2, on calcule la deadline depuis l'événement AUDIT_COMPLEMENTARY_REPORT_UPLOADED
  let actionPlanDeadline: Date | null = null

  if (actionPlanType !== 'NONE') {
    const reportUploadEvent = await getLatestEvent('AUDIT_COMPLEMENTARY_REPORT_UPLOADED', { auditId })

    if (reportUploadEvent) {
      const reportUploadDate = new Date(reportUploadEvent.performedAt)
      actionPlanDeadline = new Date(reportUploadDate)

      // Ajouter le délai selon le type de plan
      if (actionPlanType === 'SHORT') {
        actionPlanDeadline.setDate(actionPlanDeadline.getDate() + 15) // 15 jours
      }
      else if (actionPlanType === 'LONG') {
        actionPlanDeadline.setDate(actionPlanDeadline.getDate() + 180) // 6 mois (180 jours)
      }
    }
  }

  // Récupérer l'audit pour obtenir le status actuel
  const audit = await db.query.audits.findFirst({
    where: eq(audits.id, auditId),
    columns: {
      id: true,
      status: true,
      actionPlanType: true,
    },
  })

  const updateData: any = {
    actionPlanType,
    actionPlanDeadline,
  }

  // Si le plan n'est plus nécessaire, passer directement à PENDING_OE_OPINION
  if (actionPlanType === 'NONE' && audit) {
    updateData.status = AuditStatus.PENDING_OE_OPINION
    console.log(`✅ [updateActionPlanTypePhase2] Aucun plan nécessaire pour audit ${auditId} → PENDING_OE_OPINION`)
  }
  // Si un plan est nécessaire, passer à PENDING_CORRECTIVE_PLAN
  else if (actionPlanType !== 'NONE' && audit) {
    updateData.status = AuditStatus.PENDING_CORRECTIVE_PLAN
    console.log(`✅ [updateActionPlanTypePhase2] Plan ${actionPlanType} nécessaire pour audit ${auditId} → PENDING_CORRECTIVE_PLAN`)
  }

  if (currentUserId) {
    updateData.updatedBy = currentUserId
    updateData.updatedAt = new Date()
  }

  await db.update(audits)
    .set(updateData)
    .where(eq(audits.id, auditId))

  return actionPlanType
}
