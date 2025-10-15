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
 * Modes d'entités
 */
export const EntityMode = {
  MASTER: 'MASTER',
  FOLLOWER: 'FOLLOWER',
} as const

export type EntityModeType = typeof EntityMode[keyof typeof EntityMode]

/**
 * Types d'audit
 */
export const AuditType = {
  INITIAL: 'INITIAL',
  RENEWAL: 'RENEWAL',
  MONITORING: 'MONITORING',
} as const

export type AuditTypeType = typeof AuditType[keyof typeof AuditType]
