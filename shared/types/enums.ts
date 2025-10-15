/**
 * Constantes d'enums partagées entre le front et le back
 */

/**
 * Types d'entités
 */
export const EntityType = {
  COMPANY: 'COMPANY',
  GROUP: 'GROUP',
} as const

export type EntityTypeType = typeof EntityType[keyof typeof EntityType]

/**
 * Labels français pour les types d'entités
 */
export const EntityTypeLabels: Record<EntityTypeType, string> = {
  [EntityType.COMPANY]: 'Entreprise',
  [EntityType.GROUP]: 'Groupe',
}

/**
 * Obtenir la liste des types d'entités avec labels
 */
export function getEntityTypeItems(includeAll: true): Array<{ label: string; value: EntityTypeType | null }>
export function getEntityTypeItems(includeAll: false): Array<{ label: string; value: EntityTypeType }>
export function getEntityTypeItems(includeAll = false): Array<{ label: string; value: EntityTypeType | null }> {
  const items = Object.entries(EntityType).map(([_, value]) => ({
    label: EntityTypeLabels[value as EntityTypeType],
    value: value as EntityTypeType,
  }))

  if (includeAll) {
    return [{ label: 'Tous les types', value: null }, ...items]
  }

  return items
}

/**
 * Modes d'entités
 */
export const EntityMode = {
  MASTER: 'MASTER',
  FOLLOWER: 'FOLLOWER',
} as const

export type EntityModeType = typeof EntityMode[keyof typeof EntityMode]

/**
 * Labels français pour les modes d'entités
 */
export const EntityModeLabels: Record<EntityModeType, string> = {
  [EntityMode.MASTER]: 'Maître',
  [EntityMode.FOLLOWER]: 'Suiveur',
}

/**
 * Obtenir la liste des modes d'entités avec labels
 */
export function getEntityModeItems(includeAll: true): Array<{ label: string; value: EntityModeType | null }>
export function getEntityModeItems(includeAll: false): Array<{ label: string; value: EntityModeType }>
export function getEntityModeItems(includeAll = false): Array<{ label: string; value: EntityModeType | null }> {
  const items = Object.entries(EntityMode).map(([_, value]) => ({
    label: EntityModeLabels[value as EntityModeType],
    value: value as EntityModeType,
  }))

  if (includeAll) {
    return [{ label: 'Tous les modes', value: null }, ...items]
  }

  return items
}

/**
 * Types d'audit
 */
export const AuditType = {
  INITIAL: 'INITIAL',
  RENEWAL: 'RENEWAL',
  MONITORING: 'MONITORING',
} as const

export type AuditTypeType = typeof AuditType[keyof typeof AuditType]

/**
 * Labels français pour les types d'audit
 */
export const AuditTypeLabels: Record<AuditTypeType, string> = {
  [AuditType.INITIAL]: 'Initial',
  [AuditType.RENEWAL]: 'Renouvellement',
  [AuditType.MONITORING]: 'Suivi',
}

/**
 * Obtenir la liste des types d'audit avec labels
 */
export function getAuditTypeItems(includeAll: true): Array<{ label: string; value: AuditTypeType | null }>
export function getAuditTypeItems(includeAll: false): Array<{ label: string; value: AuditTypeType }>
export function getAuditTypeItems(includeAll = false): Array<{ label: string; value: AuditTypeType | null }> {
  const items = Object.entries(AuditType).map(([_, value]) => ({
    label: AuditTypeLabels[value as AuditTypeType],
    value: value as AuditTypeType,
  }))

  if (includeAll) {
    return [{ label: 'Tous les types', value: null }, ...items]
  }

  return items
}

/**
 * Obtenir le label d'un type d'entité
 */
export function getEntityTypeLabel(type: EntityTypeType): string {
  return EntityTypeLabels[type] || type
}

/**
 * Obtenir le label d'un mode d'entité
 */
export function getEntityModeLabel(mode: EntityModeType): string {
  return EntityModeLabels[mode] || mode
}

/**
 * Obtenir le label d'un type d'audit
 */
export function getAuditTypeLabel(type: AuditTypeType): string {
  return AuditTypeLabels[type] || type
}
