import { and, eq, isNull, ne } from 'drizzle-orm'
import { db } from '~~/server/database'
import { entities, audits } from '~~/server/database/schema'
import { EntityType, EntityMode, AuditStatus } from '~~/shared/types/enums'
import type { EntityTypeType, EntityModeType } from '~~/shared/types/enums'

export interface ValidationResult {
  ok: boolean
  reason?: string
}

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
 * Compte les entités suiveuses (childEntities) liées à un parent.
 */
export async function countChildEntities(parentEntityId: number): Promise<number> {
  const rows = await db.query.entities.findMany({
    where: and(eq(entities.parentGroupId, parentEntityId), isNull(entities.deletedAt)),
    columns: { id: true },
  })
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
 * - aucun audit
 * - aucune entité suiveuse rattachée
 * - pas de parentGroupId (sinon la cohérence GROUP↔COMPANY peut être rompue)
 */
export async function canChangeType(entity: EntityForValidation): Promise<ValidationResult> {
  const allAudits = await countAllAudits(entity.id)
  if (allAudits > 0) {
    return {
      ok: false,
      reason: `Impossible de changer le type : ${allAudits} audit(s) rattaché(s). Le type doit être figé dès qu'un audit existe.`,
    }
  }

  const children = await countChildEntities(entity.id)
  if (children > 0) {
    return {
      ok: false,
      reason: `Impossible de changer le type : ${children} entité(s) suiveuse(s) rattachée(s). Délier d'abord.`,
    }
  }

  if (entity.parentGroupId) {
    return {
      ok: false,
      reason: 'Impossible de changer le type : l\'entité est liée à un parent. Délier d\'abord.',
    }
  }

  return { ok: true }
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
  if (existing >= 10) {
    return { ok: false, reason: 'Limite de 10 entreprises suiveuses atteinte pour ce groupe.' }
  }
  return { ok: true }
}
