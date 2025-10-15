/**
 * Constantes de rôles partagées entre le front et le back
 */

/**
 * Rôles principaux des comptes
 */
export const Role = {
  FEEF: 'FEEF',
  OE: 'OE',
  AUDITOR: 'AUDITOR',
  ENTITY: 'ENTITY',
} as const

export type RoleType = typeof Role[keyof typeof Role]

/**
 * Rôles pour les membres d'un OE
 */
export const OERole = {
  ADMIN: 'ADMIN',
  ACCOUNT_MANAGER: 'ACCOUNT_MANAGER',
} as const

export type OERoleType = typeof OERole[keyof typeof OERole]

/**
 * Rôles pour les membres d'une entité
 */
export const EntityRole = {
  SIGNATORY: 'SIGNATORY',
  PROCESS_MANAGER: 'PROCESS_MANAGER',
} as const

export type EntityRoleType = typeof EntityRole[keyof typeof EntityRole]
