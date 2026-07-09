import { EntityMode, EntityType, EntityModeLabels, EntityTypeLabels, AuditStatus, AuditType } from '~~/shared/types/enums'
import type { EntityTypeType, EntityModeType, AuditStatusType } from '~~/shared/types/enums'
import {
  loadEntityForAdmin,
  canChangeType,
  canConvertToFollower,
  canConvertToMaster,
  canSwapWithParent,
  validateLinkCompatibility,
  canAcceptNewChild,
  canChangeSiret,
  canChangeOe,
  isValidSiretFormat,
  isSiretAvailable,
  normalizeSiret,
  loadOeForAdmin,
  loadOngoingAudit,
  type EntityForValidation,
} from './entity-admin-validation'

export interface AdminChangeBody {
  mode?: EntityModeType
  type?: EntityTypeType
  // null = délier, number = lier/transférer, undefined = ne pas toucher
  parentGroupId?: number | null
  // si true, inverser les rôles avec le parent actuel (entity FOLLOWER → MASTER, parent MASTER → FOLLOWER)
  swapWithParent?: boolean
  // Nouveau SIRET (14 chiffres) ; undefined = ne pas toucher
  siret?: string
  // OE rattaché : number = nouvel OE, null = passage en appel d'offre, undefined = ne pas toucher
  oeId?: number | null
  // Lors d'un changement d'OE, autoriser ou non l'accès documentaire au nouvel OE
  allowOeDocumentsAccess?: boolean
}

export interface AdminChangeItem {
  field: 'mode' | 'type' | 'parentGroupId' | 'siret' | 'oeId'
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
  // Opérations sur les audits (changement d'OE en cours d'audit)
  auditOperations: AdminAuditOperation[]
  // Si true, déclencher la création/complétion d'actions après l'apply
  triggerActionsRefresh: boolean
}

export interface AdminOperation {
  entityId: number
  set: {
    mode?: EntityModeType
    type?: EntityTypeType
    parentGroupId?: number | null
    siret?: string
    oeId?: number | null
    allowOeDocumentsAccess?: boolean
  }
}

export interface AdminAuditOperation {
  auditId: number
  set: {
    oeId?: number | null
    status?: AuditStatusType
  }
  // Indique si le statut a changé : permet à l'apply de créer les actions correspondantes
  statusChanged: boolean
}

function entityLabel(value: number | string | null, kind: 'mode' | 'type' | 'parent' | 'siret' | 'oe', extraName?: string): string {
  if (value === null) return 'aucun'
  if (kind === 'mode') return EntityModeLabels[value as EntityModeType] ?? String(value)
  if (kind === 'type') return EntityTypeLabels[value as EntityTypeType] ?? String(value)
  if (kind === 'siret') {
    const s = String(value)
    if (s.length === 14) {
      return `${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6, 9)} ${s.slice(9)}`
    }
    return s
  }
  if (kind === 'oe') {
    return extraName ? `${extraName} (#${value})` : `OE #${value}`
  }
  // parent
  return extraName ? `${extraName} (#${value})` : `#${value}`
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
  const auditOperations: AdminAuditOperation[] = []
  let triggerActionsRefresh = false

  const blocked = (reason: string): AdminChangePlan => ({
    changes,
    warnings,
    blocked: { reason },
    operations: [],
    auditOperations: [],
    triggerActionsRefresh: false,
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

    return { changes, warnings, blocked: null, operations, auditOperations, triggerActionsRefresh }
  }

  // --- Cas 2 : changement de type ---
  if (body.type !== undefined && body.type !== entity.type) {
    const check = await canChangeType(entity, body.type)
    if (!check.ok) {
      return blocked(check.reason ?? 'Changement de type impossible.')
    }
    if (check.completedAudits > 0) {
      warnings.push(
        `${check.completedAudits} audit(s) terminé(s) existent déjà pour cette entité : leurs attestations et rapports conserveront l'ancien type. Le nouveau type ne s'appliquera qu'aux audits à venir.`,
      )
    }
    if (check.activeAudits > 0) {
      warnings.push(
        `${check.activeAudits} audit(s) en cours pour cette entité : leur attestation sera générée avec le nouveau type « ${entityLabel(body.type, 'type')} ».`,
      )
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

  // --- Cas 5 : changement de SIRET ---
  if (body.siret !== undefined) {
    const newSiret = normalizeSiret(body.siret)
    if (!isValidSiretFormat(newSiret)) {
      return blocked('SIRET invalide : 14 chiffres exactement, sans espaces.')
    }
    if (newSiret !== entity.siret) {
      const guard = await canChangeSiret(entity.id)
      if (!guard.ok) {
        return blocked(guard.reason ?? 'Modification du SIRET impossible.')
      }
      const available = await isSiretAvailable(newSiret, entity.id)
      if (!available) {
        return blocked('Une autre entité utilise déjà ce SIRET.')
      }
      if (guard.completedAudits > 0) {
        warnings.push(
          `${guard.completedAudits} audit(s) terminé(s) existent déjà pour cette entité : leurs attestations et rapports conserveront l'ancien SIRET. Le nouveau SIRET ne s'appliquera qu'aux audits à venir.`,
        )
      }
      changes.push({
        field: 'siret',
        entityId: entity.id,
        entityName: entity.name,
        from: entity.siret,
        to: newSiret,
        fromLabel: entityLabel(entity.siret, 'siret'),
        toLabel: entityLabel(newSiret, 'siret'),
      })
      operations.push({ entityId: entity.id, set: { siret: newSiret } })
    }
  }

  // --- Cas 6 : changement d'OE rattaché ---
  if (body.oeId !== undefined && body.oeId !== entity.oeId) {
    const guard = await canChangeOe(entity)
    if (!guard.ok) {
      return blocked(guard.reason ?? 'Changement d\'OE impossible.')
    }

    let toLabel: string
    let newOeName: string | undefined
    if (body.oeId === null) {
      toLabel = 'aucun (appel d\'offre)'
    } else {
      const newOe = await loadOeForAdmin(body.oeId)
      if (!newOe) {
        return blocked('Organisme évaluateur cible introuvable ou inactif.')
      }
      newOeName = newOe.name
      toLabel = entityLabel(body.oeId, 'oe', newOe.name)
    }

    // Libellé du précédent OE
    let oldOeName: string | undefined
    if (entity.oeId) {
      const oldOe = await loadOeForAdmin(entity.oeId)
      oldOeName = oldOe?.name
    }
    const fromLabel = entity.oeId
      ? entityLabel(entity.oeId, 'oe', oldOeName)
      : 'aucun'

    changes.push({
      field: 'oeId',
      entityId: entity.id,
      entityName: entity.name,
      from: entity.oeId,
      to: body.oeId,
      fromLabel,
      toLabel,
    })

    // Mise à jour entité : oeId + (si retour en appel d'offre) couper l'accès documentaire
    const entitySet: AdminOperation['set'] = { oeId: body.oeId }
    if (body.oeId === null) {
      entitySet.allowOeDocumentsAccess = false
    } else if (body.allowOeDocumentsAccess !== undefined) {
      entitySet.allowOeDocumentsAccess = body.allowOeDocumentsAccess
    }
    operations.push({ entityId: entity.id, set: entitySet })

    // Répercussion sur l'audit en cours (s'il existe)
    const ongoing = await loadOngoingAudit(entity.id)
    if (ongoing) {
      const auditSet: AdminAuditOperation['set'] = { oeId: body.oeId }
      let statusChanged = false
      if (body.oeId !== null && ongoing.status === AuditStatus.PENDING_OE_CHOICE) {
        auditSet.status = ongoing.type === AuditType.MONITORING
          ? AuditStatus.PLANNING
          : AuditStatus.PENDING_OE_ACCEPTANCE
        statusChanged = true
      }
      auditOperations.push({ auditId: ongoing.id, set: auditSet, statusChanged })
      triggerActionsRefresh = true

      if (body.oeId === null) {
        warnings.push('L\'audit en cours est également repassé en mode appel d\'offre (OE désassigné).')
      } else {
        warnings.push(
          `L'audit en cours sera mis à jour avec ${newOeName ?? 'le nouvel OE'}${statusChanged ? ` et son statut passera à ${auditSet.status}` : ''}.`,
        )
      }
    }
  }

  if (changes.length === 0) {
    return blocked('Aucun changement à appliquer.')
  }

  return { changes, warnings, blocked: null, operations, auditOperations, triggerActionsRefresh }
}
