import { db } from '~~/server/database'
import { audits, documentVersions } from '~~/server/database/schema'
import { eq, and, isNotNull } from 'drizzle-orm'
import { AuditStatus, type AuditStatusType } from '#shared/types/enums'
import { AuditDocumentType } from '~~/app/types/auditDocuments'

/**
 * Conditions requises pour la transition PENDING_REPORT → PENDING_OE_OPINION
 */
interface ReportTransitionConditions {
  hasReport: boolean
  hasGlobalScore: boolean
  canTransition: boolean
}

/**
 * Vérifie si toutes les conditions sont remplies pour transitionner vers PENDING_OE_OPINION
 *
 * Conditions requises:
 * 1. Un rapport d'audit (REPORT) uploadé avec s3Key non null
 * 2. Un score global (globalScore) renseigné (non null)
 *
 * @param auditId - ID de l'audit à vérifier
 * @returns Les conditions de transition
 */
export async function checkReportTransitionConditions(
  auditId: number
): Promise<ReportTransitionConditions> {
  // Récupérer l'audit avec son score
  const audit = await db.query.audits.findFirst({
    where: eq(audits.id, auditId),
    columns: {
      globalScore: true,
    },
  })

  if (!audit) {
    return { hasReport: false, hasGlobalScore: false, canTransition: false }
  }

  // Vérifier si le score global est renseigné
  // Important: 0 est une valeur valide, donc on vérifie !== null
  const hasGlobalScore = audit.globalScore !== null && audit.globalScore !== undefined

  // Vérifier si un rapport existe avec un fichier uploadé (s3Key non null)
  const reportVersion = await db.query.documentVersions.findFirst({
    where: and(
      eq(documentVersions.auditId, auditId),
      eq(documentVersions.auditDocumentType, AuditDocumentType.REPORT),
      isNotNull(documentVersions.s3Key)
    ),
    columns: {
      id: true,
    },
  })

  const hasReport = reportVersion !== null

  return {
    hasReport,
    hasGlobalScore,
    canTransition: hasReport && hasGlobalScore,
  }
}

/**
 * Vérifie les conditions et effectue la transition si applicable
 *
 * Cette fonction est idempotente: elle peut être appelée plusieurs fois sans effet de bord.
 * Si les conditions ne sont pas remplies ou si le statut n'est pas PENDING_REPORT,
 * elle retourne null sans effectuer de transition.
 *
 * @param auditId - ID de l'audit
 * @param currentStatus - Statut actuel de l'audit
 * @param userId - ID de l'utilisateur qui déclenche l'action
 * @returns Le nouveau statut si une transition a eu lieu, null sinon
 */
export async function checkAndTransitionToPendingOEOpinion(
  auditId: number,
  currentStatus: AuditStatusType | null,
  userId: number
): Promise<AuditStatusType | null> {
  // Vérifier que le statut actuel est PENDING_REPORT
  if (currentStatus !== AuditStatus.PENDING_REPORT) {
    return null
  }

  // Vérifier les conditions de transition
  const conditions = await checkReportTransitionConditions(auditId)

  if (!conditions.canTransition) {
    console.log(`[auditReportTransition] Conditions non remplies pour audit ${auditId}:`, {
      hasReport: conditions.hasReport,
      hasGlobalScore: conditions.hasGlobalScore,
    })
    return null
  }

  // Effectuer la transition
  await db.update(audits)
    .set({
      status: AuditStatus.PENDING_OE_OPINION,
      updatedBy: userId,
      updatedAt: new Date(),
    })
    .where(eq(audits.id, auditId))

  console.log(`✅ [auditReportTransition] Transition PENDING_REPORT → PENDING_OE_OPINION effectuée pour audit ${auditId}`)

  return AuditStatus.PENDING_OE_OPINION
}
