import { eq, and, isNotNull } from 'drizzle-orm'
import { db } from '~~/server/database'
import { audits, auditNotation, documentVersions } from '~~/server/database/schema'
import { AuditStatus } from '#shared/types/enums'
import { AuditDocumentType } from '~~/app/types/auditDocuments'

/**
 * Calcule si un audit nécessite un plan correctif
 *
 * Règles:
 * - needsCorrectivePlan = true si globalScore < 65
 * - needsCorrectivePlan = true si au moins une notation a un score >= 3 (C ou D)
 * - needsCorrectivePlan = false sinon
 *
 * @param auditId - ID de l'audit
 * @returns boolean - true si un plan correctif est nécessaire
 */
export async function calculateNeedsCorrectivePlan(auditId: number): Promise<boolean> {
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

  // 2. Vérifier si globalScore < 65
  const hasLowGlobalScore = audit.globalScore !== null && audit.globalScore < 65

  // 3. Récupérer les notations pour vérifier les scores C ou D
  const notations = await db.query.auditNotation.findMany({
    where: eq(auditNotation.auditId, auditId),
    columns: {
      score: true,
    },
  })

  // 4. Vérifier s'il y a au moins un score >= 3 (C ou D)
  const hasBadNotation = notations.some(notation => notation.score >= 3)

  // 5. Retourner true si l'une des deux conditions est vraie
  return hasLowGlobalScore || hasBadNotation
}

/**
 * Vérifie si un plan correctif a déjà été uploadé pour cet audit
 *
 * @param auditId - ID de l'audit
 * @returns boolean - true si un plan correctif existe (avec s3Key non null)
 */
export async function correctivePlanExists(auditId: number): Promise<boolean> {
  const correctivePlanDoc = await db.query.documentVersions.findFirst({
    where: and(
      eq(documentVersions.auditId, auditId),
      eq(documentVersions.auditDocumentType, AuditDocumentType.CORRECTIVE_PLAN),
      isNotNull(documentVersions.s3Key) // Document uploadé (pas en attente)
    ),
    columns: {
      id: true,
    },
  })

  return !!correctivePlanDoc
}

/**
 * Met à jour le champ needsCorrectivePlan d'un audit
 * en le recalculant automatiquement
 *
 * @param auditId - ID de l'audit
 * @param currentUserId - ID de l'utilisateur effectuant la modification (optionnel)
 * @returns boolean - La nouvelle valeur de needsCorrectivePlan
 */
export async function updateNeedsCorrectivePlan(auditId: number, currentUserId?: number): Promise<boolean> {
  const needsCorrectivePlan = await calculateNeedsCorrectivePlan(auditId)

  // Récupérer l'audit pour obtenir le status actuel
  const audit = await db.query.audits.findFirst({
    where: eq(audits.id, auditId),
    columns: {
      id: true,
      status: true,
    },
  })

  const updateData: any = { needsCorrectivePlan }

  // Si le plan correctif n'est plus nécessaire et le status est en attente de plan correctif ou validation, passer à PENDING_OE_OPINION
  if (
    !needsCorrectivePlan &&
    audit &&
    (audit.status === AuditStatus.PENDING_CORRECTIVE_PLAN || audit.status === AuditStatus.PENDING_CORRECTIVE_PLAN_VALIDATION)
  ) {
    updateData.status = AuditStatus.PENDING_OE_OPINION
  }

  // Si le plan correctif devient nécessaire et le status est PENDING_OE_OPINION
  if (
    needsCorrectivePlan &&
    audit &&
    audit.status === AuditStatus.PENDING_OE_OPINION
  ) {
    // NOUVEAU: Vérifier si un plan correctif existe déjà
    const planExists = await correctivePlanExists(auditId)

    if (planExists) {
      console.log(`⚠️ [auditCorrectivePlan] Plan correctif nécessaire pour audit ${auditId}, mais un plan existe déjà. Pas de changement de statut.`)
      // Ne pas changer le statut si un plan existe déjà
    } else {
      // Aucun plan n'existe encore, transition vers PENDING_CORRECTIVE_PLAN
      updateData.status = AuditStatus.PENDING_CORRECTIVE_PLAN
      console.log(`✅ [auditCorrectivePlan] Transition PENDING_OE_OPINION → PENDING_CORRECTIVE_PLAN pour audit ${auditId}`)
    }
  }

  if (currentUserId) {
    updateData.updatedBy = currentUserId
    updateData.updatedAt = new Date()
  }

  // NOUVEAU: Avertissement si plan validé et needsCorrectivePlan change
  if (audit && audit.correctivePlanValidatedAt && needsCorrectivePlan !== audit.needsCorrectivePlan) {
    console.warn(`⚠️ [auditCorrectivePlan] Attention: audit ${auditId} a un plan correctif déjà validé, mais needsCorrectivePlan a changé (${audit.needsCorrectivePlan} → ${needsCorrectivePlan}). Vérifier manuellement.`)
  }

  await db.update(audits)
    .set(updateData)
    .where(eq(audits.id, auditId))

  return needsCorrectivePlan
}
