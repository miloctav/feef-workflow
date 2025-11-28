import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { db } from '../database'
import { Audit, audits, entities } from '../database/schema'
import { forInsert } from './tracking'
import { AuditStatusType, AuditTypeType } from '~~/shared/types/enums'

/**
 * Crée automatiquement un audit pour une entité
 * Le type d'audit est déterminé par l'historique des audits de l'entité :
 * - INITIAL : si aucun audit existant
 * - RENEWAL : si des audits existent déjà
 *
 * @param entityId - L'ID de l'entité
 * @param event - L'événement H3 pour le contexte utilisateur
 * @returns L'audit créé
 * @throws {Error} Si l'entité n'existe pas ou est supprimée
 */
/**
 * Crée automatiquement un audit pour une entité selon la nouvelle logique :
 * - Si aucun audit : type INITIAL, plannedDate optionnelle (paramètre)
 * - Si dernier audit INITIAL ou RENEWAL : type MONITORING, plannedDate = labelExpirationDate du dernier audit
 * - Si dernier audit MONITORING : type RENEWAL, plannedDate = labelExpirationDate du dernier audit
 * @param entityId - L'ID de l'entité
 * @param event - L'événement H3 pour le contexte utilisateur
 * @param plannedDate - Date prévisionnelle pour audit INITIAL (optionnelle)
 * @returns L'audit créé
 */
export async function createAuditForEntity(entityId: number, event: H3Event, plannedDate?: string | null) {
  // Récupérer l'entité avec son dernier audit
  const entity = await db.query.entities.findFirst({
    where: eq(entities.id, entityId),
    with: {
      audits: {
        orderBy: (audits, { desc }) => [desc(audits.createdAt)],
        limit: 1,
      },
    },
  })

  if (!entity) {
    throw new Error(`Entity with ID ${entityId} not found`)
  }

  let auditType: AuditTypeType
  let auditStatus: AuditStatusType
  let nextPlannedDate: string | null = null

  const lastAudit = entity.audits[0]

  if (!lastAudit) {
    auditType = AuditType.INITIAL
    auditStatus = AuditStatus.PENDING_CASE_APPROVAL
    nextPlannedDate = plannedDate ?? null
  } else if (lastAudit.type === AuditType.INITIAL || lastAudit.type === AuditType.RENEWAL) {
    auditType = AuditType.MONITORING
    nextPlannedDate = lastAudit.labelExpirationDate ?? null
    auditStatus = AuditStatus.PLANNING
  } else if (lastAudit.type === AuditType.MONITORING) {
    auditType = AuditType.RENEWAL
    auditStatus = AuditStatus.PENDING_CASE_APPROVAL
    nextPlannedDate = lastAudit.labelExpirationDate ?? null
  } else {
    throw new Error('Type d’audit précédent inconnu')
  }

  const auditData = {
    entityId,
    type: auditType,
    oeId: entity.oeId,
    status: auditStatus,
    plannedDate: nextPlannedDate,
  }

  const [newAudit] = await db
    .insert(audits)
    .values(forInsert(event, auditData))
    .returning()

  return newAudit
}
