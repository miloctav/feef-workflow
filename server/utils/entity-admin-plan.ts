import { EntityMode, EntityType, EntityModeLabels, EntityTypeLabels } from '~~/shared/types/enums'
import type { EntityTypeType, EntityModeType } from '~~/shared/types/enums'
import {
  loadEntityForAdmin,
  canChangeType,
  canConvertToFollower,
  canConvertToMaster,
  canSwapWithParent,
  validateLinkCompatibility,
  canAcceptNewChild,
  type EntityForValidation,
  type ValidationResult,
} from './entity-admin-validation'

export interface AdminChangeBody {
  mode?: EntityModeType
  type?: EntityTypeType
  // null = délier, number = lier/transférer, undefined = ne pas toucher
  parentGroupId?: number | null
  // si true, inverser les rôles avec le parent actuel (entity FOLLOWER → MASTER, parent MASTER → FOLLOWER)
  swapWithParent?: boolean
}

export interface AdminChangeItem {
  field: 'mode' | 'type' | 'parentGroupId'
  entityId: number
  entityName: string
  from: string | number | null
  to: string | number | null
  fromLabel: string
  toLabel: string
}

export interface AdminChangePlan {
  changes: AdminChangeItem[]
  warnings: string[]
  blocked: { reason: string } | null
  // Mutations à appliquer si non bloqué
  operations: AdminOperation[]
}

export interface AdminOperation {
  entityId: number
  set: {
    mode?: EntityModeType
    type?: EntityTypeType
    parentGroupId?: number | null
  }
}

function entityLabel(value: number | string | null, kind: 'mode' | 'type' | 'parent', parentName?: string): string {
  if (value === null) return 'aucun'
  if (kind === 'mode') return EntityModeLabels[value as EntityModeType] ?? String(value)
  if (kind === 'type') return EntityTypeLabels[value as EntityTypeType] ?? String(value)
  // parent
  return parentName ? `${parentName} (#${value})` : `#${value}`
}

/**
 * Calcule le plan de changement à appliquer à une entité.
 * Utilisé en commun par l'endpoint admin (apply) et l'endpoint preview (dry-run).
 *
 * Règle métier centrale : dans une relation parent/enfant, soit la mère est
 * MASTER, soit la fille est MASTER, jamais les deux en même temps.
 */
export async function planAdminChange(
  entity: EntityForValidation,
  body: AdminChangeBody,
): Promise<AdminChangePlan> {
  const changes: AdminChangeItem[] = []
  const warnings: string[] = []
  const operations: AdminOperation[] = []

  const blocked = (reason: string): AdminChangePlan => ({
    changes,
    warnings,
    blocked: { reason },
    operations: [],
  })

  // --- Cas 1 : swap avec parent ---
  if (body.swapWithParent) {
    if (!entity.parentGroupId) {
      return blocked('L\'entité n\'est rattachée à aucun parent : inversion impossible.')
    }
    const parent = await loadEntityForAdmin(entity.parentGroupId)
    if (!parent) {
      return blocked('Parent introuvable.')
    }
    const swapCheck = await canSwapWithParent(entity, parent)
    if (!swapCheck.ok) {
      return blocked(swapCheck.reason ?? 'Inversion impossible.')
    }

    // L'entité passe en MASTER, le parent en FOLLOWER, le lien reste (parent référence enfant).
    changes.push({
      field: 'mode',
      entityId: entity.id,
      entityName: entity.name,
      from: entity.mode,
      to: EntityMode.MASTER,
      fromLabel: entityLabel(entity.mode, 'mode'),
      toLabel: entityLabel(EntityMode.MASTER, 'mode'),
    })
    changes.push({
      field: 'mode',
      entityId: parent.id,
      entityName: parent.name,
      from: parent.mode,
      to: EntityMode.FOLLOWER,
      fromLabel: entityLabel(parent.mode, 'mode'),
      toLabel: entityLabel(EntityMode.FOLLOWER, 'mode'),
    })
    changes.push({
      field: 'parentGroupId',
      entityId: entity.id,
      entityName: entity.name,
      from: entity.parentGroupId,
      to: null,
      fromLabel: entityLabel(entity.parentGroupId, 'parent', parent.name),
      toLabel: 'aucun',
    })
    changes.push({
      field: 'parentGroupId',
      entityId: parent.id,
      entityName: parent.name,
      from: null,
      to: entity.id,
      fromLabel: 'aucun',
      toLabel: entityLabel(entity.id, 'parent', entity.name),
    })

    operations.push({
      entityId: entity.id,
      set: { mode: EntityMode.MASTER, parentGroupId: null },
    })
    operations.push({
      entityId: parent.id,
      set: { mode: EntityMode.FOLLOWER, parentGroupId: entity.id },
    })

    warnings.push(
      `L'inversion va déplacer le rôle Maître de "${parent.name}" vers "${entity.name}". L'ancien parent devient Suiveuse.`,
    )

    return { changes, warnings, blocked: null, operations }
  }

  // --- Cas 2 : changement de type ---
  if (body.type !== undefined && body.type !== entity.type) {
    const check = await canChangeType(entity)
    if (!check.ok) {
      return blocked(check.reason ?? 'Changement de type impossible.')
    }
    changes.push({
      field: 'type',
      entityId: entity.id,
      entityName: entity.name,
      from: entity.type,
      to: body.type,
      fromLabel: entityLabel(entity.type, 'type'),
      toLabel: entityLabel(body.type, 'type'),
    })
    operations.push({ entityId: entity.id, set: { type: body.type } })
  }

  // --- Cas 3 : changement de mode ---
  // L'état "futur" tient compte de l'éventuel changement de type ci-dessus.
  const futureType = body.type ?? entity.type
  const futureEntity: EntityForValidation = { ...entity, type: futureType }

  if (body.mode !== undefined && body.mode !== entity.mode) {
    if (body.mode === EntityMode.FOLLOWER) {
      const check = await canConvertToFollower(futureEntity)
      if (!check.ok) {
        return blocked(check.reason ?? 'Conversion en Suiveuse impossible.')
      }
      // FOLLOWER nécessite un parentGroupId. Soit fourni dans le body, soit déjà présent.
      const futureParentId =
        body.parentGroupId !== undefined ? body.parentGroupId : entity.parentGroupId
      if (futureType === EntityType.COMPANY && !futureParentId) {
        return blocked('Une entreprise en mode Suiveuse doit être rattachée à un groupe parent.')
      }
    } else {
      const check = canConvertToMaster(futureEntity)
      if (!check.ok) {
        return blocked(check.reason ?? 'Conversion en Maître impossible.')
      }
    }

    changes.push({
      field: 'mode',
      entityId: entity.id,
      entityName: entity.name,
      from: entity.mode,
      to: body.mode,
      fromLabel: entityLabel(entity.mode, 'mode'),
      toLabel: entityLabel(body.mode, 'mode'),
    })
    operations.push({ entityId: entity.id, set: { mode: body.mode } })
  }

  // --- Cas 4 : changement de parentGroupId (lier / délier / transférer) ---
  if (body.parentGroupId !== undefined && body.parentGroupId !== entity.parentGroupId) {
    const futureMode = body.mode ?? entity.mode

    if (body.parentGroupId === null) {
      // Déliaison. L'entité doit être FOLLOWER pour avoir un parent à délier (sinon no-op).
      // Cas particulier : si elle reste FOLLOWER de type COMPANY, le délier la laisse orpheline → autorisé
      // mais signalé par un warning.
      if (futureMode === EntityMode.FOLLOWER && futureType === EntityType.COMPANY) {
        warnings.push(
          'L\'entité reste en mode Suiveuse mais sans parent. Elle devra être rattachée à un Maître pour fonctionner.',
        )
      }
      // Récupérer le nom de l'ancien parent pour l'affichage.
      let oldParentName: string | undefined
      if (entity.parentGroupId) {
        const oldParent = await loadEntityForAdmin(entity.parentGroupId)
        oldParentName = oldParent?.name
      }
      changes.push({
        field: 'parentGroupId',
        entityId: entity.id,
        entityName: entity.name,
        from: entity.parentGroupId,
        to: null,
        fromLabel: entityLabel(entity.parentGroupId, 'parent', oldParentName),
        toLabel: 'aucun',
      })
      operations.push({ entityId: entity.id, set: { parentGroupId: null } })
    } else {
      // Liaison ou transfert vers un nouveau parent.
      const newParent = await loadEntityForAdmin(body.parentGroupId)
      if (!newParent) {
        return blocked('Le parent cible est introuvable.')
      }
      // Pour la validation de compatibilité, on simule l'entité dans son état futur (mode/type).
      const futureForValidation: EntityForValidation = {
        ...entity,
        mode: futureMode,
        type: futureType,
      }
      const compat = validateLinkCompatibility(futureForValidation, newParent)
      if (!compat.ok) {
        return blocked(compat.reason ?? 'Liaison impossible.')
      }
      const capacity = await canAcceptNewChild(newParent.id, newParent.type)
      if (!capacity.ok) {
        return blocked(capacity.reason ?? 'Le parent cible ne peut plus accepter de suiveuse.')
      }

      let oldParentName: string | undefined
      if (entity.parentGroupId) {
        const oldParent = await loadEntityForAdmin(entity.parentGroupId)
        oldParentName = oldParent?.name
      }
      changes.push({
        field: 'parentGroupId',
        entityId: entity.id,
        entityName: entity.name,
        from: entity.parentGroupId,
        to: body.parentGroupId,
        fromLabel: entityLabel(entity.parentGroupId, 'parent', oldParentName),
        toLabel: entityLabel(body.parentGroupId, 'parent', newParent.name),
      })
      operations.push({ entityId: entity.id, set: { parentGroupId: body.parentGroupId } })
    }
  }

  if (changes.length === 0) {
    return blocked('Aucun changement à appliquer.')
  }

  return { changes, warnings, blocked: null, operations }
}
