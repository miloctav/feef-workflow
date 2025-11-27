import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { audits, auditNotation } from '~~/server/database/schema'

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

  // Si le plan correctif devient nécessaire et le status est PENDING_OE_OPINION, repasser à PENDING_CORRECTIVE_PLAN
  if (
    needsCorrectivePlan &&
    audit &&
    audit.status === AuditStatus.PENDING_OE_OPINION
  ) {
    updateData.status = AuditStatus.PENDING_CORRECTIVE_PLAN
  }

  if (currentUserId) {
    updateData.updatedBy = currentUserId
    updateData.updatedAt = new Date()
  }

  await db.update(audits)
    .set(updateData)
    .where(eq(audits.id, auditId))

  return needsCorrectivePlan
}
