import { desc, eq, inArray } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { db } from '../database'
import { Audit, audits, entities } from '../database/schema'
import { forInsert } from './tracking'
import { AuditStatus, AuditStatusType, AuditType, AuditTypeType } from '~~/shared/types/enums'

/**
 * Détermine le type d'audit en cours ou suivant pour une entité
 * Logique :
 * - Si pas d'audit → INITIAL
 * - Si dernier audit NON COMPLETED → type de cet audit
 * - Si dernier audit COMPLETED :
 *   - Si INITIAL ou RENEWAL → MONITORING
 *   - Si MONITORING → RENEWAL
 * 
 * @param entityId - L'ID de l'entité
 * @returns Le type d'audit en cours ou suivant
 */
export async function getEntityCurrentAuditType(entityId: number): Promise<AuditTypeType> {
  // Récupérer le dernier audit de l'entité
  const lastAudit = await db.query.audits.findFirst({
    where: eq(audits.entityId, entityId),
    orderBy: [desc(audits.createdAt)],
  })

  // Si pas d'audit, c'est un audit INITIAL
  if (!lastAudit) {
    return AuditType.INITIAL
  }

  // Si le dernier audit n'est pas COMPLETED, on retourne son type
  if (lastAudit.status !== AuditStatus.COMPLETED) {
    return lastAudit.type
  }

  // Si le dernier audit est COMPLETED, on détermine le type suivant
  if (lastAudit.type === AuditType.INITIAL || lastAudit.type === AuditType.RENEWAL) {
    return AuditType.MONITORING
  } else if (lastAudit.type === AuditType.MONITORING) {
    return AuditType.RENEWAL
  }

  // Par défaut (ne devrait pas arriver)
  return AuditType.INITIAL
}

/**
 * Détermine le type d'audit pour plusieurs entités de manière optimisée
 * Utilise une seule requête SQL au lieu de N requêtes
 * 
 * @param entityIds - Liste des IDs d'entités
 * @returns Map avec entityId -> auditType
 */
export async function getEntitiesCurrentAuditTypes(entityIds: number[]): Promise<Map<number, AuditTypeType>> {
  if (entityIds.length === 0) {
    return new Map()
  }

  // Récupérer le dernier audit pour chaque entité en une seule requête
  const latestAudits = await db
    .select({
      entityId: audits.entityId,
      type: audits.type,
      status: audits.status,
      createdAt: audits.createdAt,
    })
    .from(audits)
    .where(inArray(audits.entityId, entityIds))
    .orderBy(desc(audits.createdAt))

  // Grouper par entité et garder seulement le plus récent
  const latestAuditByEntity = new Map<number, { type: AuditTypeType, status: AuditStatusType }>()
  for (const audit of latestAudits) {
    if (!latestAuditByEntity.has(audit.entityId)) {
      latestAuditByEntity.set(audit.entityId, {
        type: audit.type,
        status: audit.status,
      })
    }
  }

  // Déterminer le type d'audit pour chaque entité
  const result = new Map<number, AuditTypeType>()

  for (const entityId of entityIds) {
    const lastAudit = latestAuditByEntity.get(entityId)

    if (!lastAudit) {
      // Pas d'audit -> INITIAL
      result.set(entityId, AuditType.INITIAL)
    } else if (lastAudit.status !== AuditStatus.COMPLETED) {
      // Dernier audit non complété -> utiliser son type
      result.set(entityId, lastAudit.type)
    } else {
      // Dernier audit complété -> déterminer le suivant
      if (lastAudit.type === AuditType.INITIAL || lastAudit.type === AuditType.RENEWAL) {
        result.set(entityId, AuditType.MONITORING)
      } else if (lastAudit.type === AuditType.MONITORING) {
        result.set(entityId, AuditType.RENEWAL)
      } else {
        result.set(entityId, AuditType.INITIAL)
      }
    }
  }

  return result
}

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

/**
 * Vérifie si un plan d'audit existe pour un audit donné
 * @param auditId - L'ID de l'audit
 * @returns true si un plan d'audit existe, false sinon
 */
export async function checkIfAuditPlanExists(auditId: number): Promise<boolean> {
  const { documentVersions } = await import('../database/schema')
  const { eq, and, isNull } = await import('drizzle-orm')

  const plan = await db.query.documentVersions.findFirst({
    where: and(
      eq(documentVersions.auditId, auditId),
      eq(documentVersions.auditDocumentType, 'PLAN'),
      isNull(documentVersions.updatedAt) // Not deleted/replaced
    ),
  })

  return !!plan
}

