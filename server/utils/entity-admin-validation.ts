import { and, eq, isNull, ne, desc } from 'drizzle-orm'
import { db } from '~~/server/database'
import { entities, audits, oes } from '~~/server/database/schema'
import { EntityType, EntityMode, AuditStatus, AuditType } from '~~/shared/types/enums'
import type { EntityTypeType, EntityModeType, AuditStatusType, AuditTypeType } from '~~/shared/types/enums'

export interface ValidationResult {
  ok: boolean
  reason?: string
}

/** Nombre maximum d'entreprises suiveuses rattachables à un groupe. */
export const MAX_GROUP_CHILDREN = 10

/**
 * Structure minimale d'entité utilisée par les helpers de validation.
 * Les champs optionnels sont chargés en fonction du contexte.
 */
export interface EntityForValidation {
  id: number
  name: string
  type: EntityTypeType
  mode: EntityModeType
  parentGroupId: number | null
  siret: string
  oeId: number | null
}

/**
 * Récupère une entité avec les champs nécessaires aux validations admin.
 */
export async function loadEntityForAdmin(entityId: number): Promise<EntityForValidation | null> {
  const entity = await db.query.entities.findFirst({
    where: and(eq(entities.id, entityId), isNull(entities.deletedAt)),
    columns: {
      id: true,
      name: true,
      type: true,
      mode: true,
      parentGroupId: true,
      siret: true,
      oeId: true,
    },
  })
  return entity ?? null
}

/**
 * Compte les audits non supprimés et non terminés (= différents de COMPLETED) d'une entité.
 */
export async function countActiveAudits(entityId: number): Promise<number> {
  const rows = await db.query.audits.findMany({
    where: and(
      eq(audits.entityId, entityId),
      isNull(audits.deletedAt),
      ne(audits.status, AuditStatus.COMPLETED),
    ),
    columns: { id: true },
  })
  return rows.length
}

/**
 * Compte tous les audits non supprimés (terminés inclus).
 */
export async function countAllAudits(entityId: number): Promise<number> {
  const rows = await db.query.audits.findMany({
    where: and(eq(audits.entityId, entityId), isNull(audits.deletedAt)),
    columns: { id: true },
  })
  return rows.length
}

/**
 * Liste les entités suiveuses (childEntities) liées à un parent.
 */
export async function listChildEntities(
  parentEntityId: number,
): Promise<Array<{ id: number; name: string; type: EntityTypeType }>> {
  return db.query.entities.findMany({
    where: and(eq(entities.parentGroupId, parentEntityId), isNull(entities.deletedAt)),
    columns: { id: true, name: true, type: true },
  })
}

/**
 * Compte les entités suiveuses (childEntities) liées à un parent.
 */
export async function countChildEntities(parentEntityId: number): Promise<number> {
  const rows = await listChildEntities(parentEntityId)
  return rows.length
}

/**
 * Une entité peut passer en FOLLOWER si :
 * - tous ses audits sont en statut COMPLETED (ou aucun audit)
 * - elle n'a aucune entité suiveuse rattachée
 */
export async function canConvertToFollower(entity: EntityForValidation): Promise<ValidationResult> {
  if (entity.mode === EntityMode.FOLLOWER) {
    return { ok: false, reason: 'L\'entité est déjà en mode Suiveuse.' }
  }

  const activeAudits = await countActiveAudits(entity.id)
  if (activeAudits > 0) {
    return {
      ok: false,
      reason: `Impossible de passer en Suiveuse : ${activeAudits} audit(s) non terminé(s). Tous les audits doivent être en statut Terminé.`,
    }
  }

  const children = await countChildEntities(entity.id)
  if (children > 0) {
    return {
      ok: false,
      reason: `Impossible de passer en Suiveuse : ${children} entité(s) suiveuse(s) rattachée(s). Délier ou transférer ces suiveuses d'abord.`,
    }
  }

  return { ok: true }
}

/**
 * Une entité FOLLOWER peut toujours passer en MASTER (les invariants FOLLOWER
 * garantissent qu'elle n'a ni audits ni enfants).
 */
export function canConvertToMaster(entity: EntityForValidation): ValidationResult {
  if (entity.mode === EntityMode.MASTER) {
    return { ok: false, reason: 'L\'entité est déjà en mode Maître.' }
  }
  return { ok: true }
}

/**
 * Le type d'une entité (COMPANY ↔ GROUP) peut changer uniquement si :
 * - les suiveuses rattachées restent compatibles avec le nouveau type
 * - le parent éventuel reste compatible avec le nouveau type
 *
 * Les audits ne bloquent pas : le type n'intervient que dans l'attestation générée
 * en fin de cycle, jamais dans le déroulé de l'audit lui-même. Corriger le type
 * pendant un audit en cours produit donc la bonne attestation à l'arrivée.
 *
 * Renvoie le nombre d'audits en cours et terminés rattachés, à utiliser comme warnings.
 */
export interface ChangeTypeResult extends ValidationResult {
  activeAudits: number
  completedAudits: number
}

export async function canChangeType(
  entity: EntityForValidation,
  newType: EntityTypeType,
): Promise<ChangeTypeResult> {
  const blocked = (reason: string): ChangeTypeResult => ({
    ok: false,
    reason,
    activeAudits: 0,
    completedAudits: 0,
  })

  if (newType === entity.type) {
    return blocked('L\'entité est déjà de ce type.')
  }

  const children = await listChildEntities(entity.id)
  if (children.length > 0) {
    if (newType === EntityType.GROUP) {
      const invalid = children.filter(child => child.type !== EntityType.COMPANY)
      if (invalid.length > 0) {
        return blocked(
          `Impossible de passer en Groupe : ${invalid.length} suiveuse(s) ne sont pas des entreprises (${invalid.map(c => c.name).join(', ')}). Délier d'abord.`,
        )
      }
      if (children.length > MAX_GROUP_CHILDREN) {
        return blocked(
          `Impossible de passer en Groupe : ${children.length} suiveuses rattachées, la limite est de ${MAX_GROUP_CHILDREN}.`,
        )
      }
    } else {
      // Une entreprise maître n'accueille qu'un unique groupe suiveur.
      if (children.length > 1) {
        return blocked(
          `Impossible de passer en Entreprise : ${children.length} suiveuses rattachées, une entreprise ne peut en accueillir qu'une seule. Délier d'abord.`,
        )
      }
      if (children[0]!.type !== EntityType.GROUP) {
        return blocked(
          `Impossible de passer en Entreprise : la suiveuse « ${children[0]!.name} » n'est pas un groupe. Délier d'abord.`,
        )
      }
    }
  }

  if (entity.parentGroupId) {
    const parent = await loadEntityForAdmin(entity.parentGroupId)
    if (!parent) {
      return blocked('Parent introuvable.')
    }
    if (parent.type === newType) {
      return blocked(
        `Impossible de changer le type : le parent « ${parent.name} » est du même type. Un groupe n'accueille que des entreprises suiveuses, et inversement. Délier d'abord.`,
      )
    }
  }

  const activeAudits = await countActiveAudits(entity.id)
  const allAudits = await countAllAudits(entity.id)
  return { ok: true, activeAudits, completedAudits: allAudits - activeAudits }
}

/**
 * Inversion des rôles avec le parent : l'entité (FOLLOWER) devient MASTER et son
 * parent (MASTER) devient FOLLOWER. Les contraintes de validation côté parent
 * doivent passer comme s'il devenait FOLLOWER.
 */
export async function canSwapWithParent(
  entity: EntityForValidation,
  parent: EntityForValidation,
): Promise<ValidationResult> {
  if (entity.mode !== EntityMode.FOLLOWER) {
    return { ok: false, reason: 'L\'entité doit être en mode Suiveuse pour une inversion.' }
  }
  if (parent.mode !== EntityMode.MASTER) {
    return { ok: false, reason: 'Le parent doit être en mode Maître pour une inversion.' }
  }
  if (entity.parentGroupId !== parent.id) {
    return { ok: false, reason: 'L\'entité n\'est pas liée à ce parent.' }
  }

  // Le parent doit pouvoir devenir FOLLOWER : ses autres enfants éventuels bloquent,
  // ainsi que ses audits non terminés.
  const parentActiveAudits = await countActiveAudits(parent.id)
  if (parentActiveAudits > 0) {
    return {
      ok: false,
      reason: `Impossible d'inverser : le parent a ${parentActiveAudits} audit(s) non terminé(s).`,
    }
  }

  // Compter les autres enfants du parent (en excluant l'entité elle-même).
  const otherChildren = await db.query.entities.findMany({
    where: and(
      eq(entities.parentGroupId, parent.id),
      ne(entities.id, entity.id),
      isNull(entities.deletedAt),
    ),
    columns: { id: true },
  })
  if (otherChildren.length > 0) {
    return {
      ok: false,
      reason: `Impossible d'inverser : le parent a ${otherChildren.length} autre(s) suiveuse(s) qui resteraient orphelines.`,
    }
  }

  return { ok: true }
}

/**
 * Valide la compatibilité GROUP ↔ COMPANY entre une suiveuse et son futur parent.
 * Règle : GROUP master accueille COMPANY follower, COMPANY master accueille GROUP follower.
 */
export function validateLinkCompatibility(
  follower: EntityForValidation,
  parent: EntityForValidation,
): ValidationResult {
  if (parent.mode !== EntityMode.MASTER) {
    return { ok: false, reason: 'Le parent doit être en mode Maître.' }
  }
  if (follower.mode !== EntityMode.FOLLOWER) {
    return { ok: false, reason: 'L\'entité à lier doit être en mode Suiveuse.' }
  }
  if (parent.type === EntityType.GROUP && follower.type !== EntityType.COMPANY) {
    return { ok: false, reason: 'Un groupe ne peut être lié qu\'à des entreprises suiveuses.' }
  }
  if (parent.type === EntityType.COMPANY && follower.type !== EntityType.GROUP) {
    return { ok: false, reason: 'Une entreprise ne peut être liée qu\'à un groupe suiveur.' }
  }
  return { ok: true }
}

/**
 * Le SIRET d'une entité ne peut être modifié que si aucun audit non terminé n'est en
 * cours. Une fois un audit clôturé (COMPLETED), la correction reste autorisée pour
 * permettre la rectification d'une erreur de saisie initiale, mais les audits déjà
 * passés conserveront le SIRET sur leurs pièces (attestations, rapports).
 *
 * Renvoie aussi le nombre d'audits terminés rattachés, à utiliser comme warning.
 */
export async function canChangeSiret(entityId: number): Promise<ValidationResult & { completedAudits: number }> {
  const activeAudits = await countActiveAudits(entityId)
  if (activeAudits > 0) {
    return {
      ok: false,
      reason: `Impossible de modifier le SIRET : ${activeAudits} audit(s) non terminé(s). Le SIRET ne peut être corrigé qu'entre deux cycles d'audit.`,
      completedAudits: 0,
    }
  }

  const allAudits = await countAllAudits(entityId)
  return { ok: true, completedAudits: allAudits }
}

/**
 * Format normalisé du SIRET : 14 chiffres exactement, sans espaces.
 */
export function normalizeSiret(siret: string): string {
  return siret.replace(/\s+/g, '')
}

export function isValidSiretFormat(siret: string): boolean {
  return /^\d{14}$/.test(siret)
}

/**
 * Vérifie qu'un SIRET n'est pas déjà utilisé par une autre entité non supprimée.
 */
export async function isSiretAvailable(siret: string, excludeEntityId: number): Promise<boolean> {
  const existing = await db.query.entities.findFirst({
    where: and(eq(entities.siret, siret), isNull(entities.deletedAt)),
    columns: { id: true },
  })
  if (!existing) return true
  return existing.id === excludeEntityId
}

/**
 * Information sur le dernier audit, utilisée pour décider si l'OE peut être changé.
 */
export interface LastAuditSnapshot {
  id: number
  status: AuditStatusType
  type: AuditTypeType
}

export async function loadLastAudit(entityId: number): Promise<LastAuditSnapshot | null> {
  const lastAudit = await db.query.audits.findFirst({
    where: and(eq(audits.entityId, entityId), isNull(audits.deletedAt)),
    orderBy: desc(audits.createdAt),
    columns: { id: true, status: true, type: true },
  })
  return lastAudit ?? null
}

/**
 * Charge l'audit en cours (non COMPLETED) le plus récent, pour mise à jour
 * simultanée lors d'un changement d'OE.
 */
export interface OngoingAuditSnapshot {
  id: number
  status: AuditStatusType
  type: AuditTypeType
  oeId: number | null
}

export async function loadOngoingAudit(entityId: number): Promise<OngoingAuditSnapshot | null> {
  const ongoing = await db.query.audits.findFirst({
    where: and(
      eq(audits.entityId, entityId),
      ne(audits.status, AuditStatus.COMPLETED),
      isNull(audits.deletedAt),
    ),
    orderBy: desc(audits.createdAt),
    columns: { id: true, status: true, type: true, oeId: true },
  })
  return ongoing ?? null
}

/**
 * L'OE rattaché à une entité peut être changé selon les mêmes règles que pour
 * l'auto-changement par l'entité elle-même :
 * - aucun OE encore assigné → libre
 * - aucun audit → libre
 * - dernier audit MONITORING : doit être COMPLETED
 * - dernier audit INITIAL/RENEWAL : statut doit être PENDING_OE_CHOICE ou
 *   PENDING_CASE_APPROVAL
 */
export async function canChangeOe(entity: EntityForValidation): Promise<ValidationResult> {
  if (!entity.oeId) {
    return { ok: true }
  }
  const lastAudit = await loadLastAudit(entity.id)
  if (!lastAudit) {
    return { ok: true }
  }
  const allowed = lastAudit.type === AuditType.MONITORING
    ? lastAudit.status === AuditStatus.COMPLETED
    : lastAudit.status === AuditStatus.PENDING_OE_CHOICE
      || lastAudit.status === AuditStatus.PENDING_CASE_APPROVAL
  if (!allowed) {
    return {
      ok: false,
      reason: 'Impossible de changer d\'OE : un audit est en cours ou le dernier audit n\'est pas un suivi terminé.',
    }
  }
  return { ok: true }
}

/**
 * Vérifie qu'un OE cible existe et n'est pas supprimé.
 */
export async function loadOeForAdmin(oeId: number): Promise<{ id: number; name: string } | null> {
  const oe = await db.query.oes.findFirst({
    where: and(eq(oes.id, oeId), isNull(oes.deletedAt)),
    columns: { id: true, name: true },
  })
  return oe ?? null
}

/**
 * Vérifie qu'un parent peut accepter un nouvel enfant : limite de 10 pour les GROUP.
 */
export async function canAcceptNewChild(parentEntityId: number, parentType: EntityTypeType): Promise<ValidationResult> {
  if (parentType !== EntityType.GROUP) {
    // Pour COMPANY master, un seul GROUP follower autorisé.
    const existing = await countChildEntities(parentEntityId)
    if (existing >= 1) {
      return { ok: false, reason: 'Cette entreprise est déjà liée à un groupe.' }
    }
    return { ok: true }
  }
  const existing = await countChildEntities(parentEntityId)
  if (existing >= MAX_GROUP_CHILDREN) {
    return { ok: false, reason: `Limite de ${MAX_GROUP_CHILDREN} entreprises suiveuses atteinte pour ce groupe.` }
  }
  return { ok: true }
}
