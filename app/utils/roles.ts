import { Role, OERole, EntityRole } from '#shared/types/roles'
import type { RoleType, OERoleType, EntityRoleType } from '#shared/types/roles'

/**
 * Traduction des rôles principaux
 */
export const roleLabels: Record<RoleType, string> = {
  [Role.FEEF]: 'Administrateur FEEF',
  [Role.OE]: 'Organisme Évaluateur',
  [Role.AUDITOR]: 'Auditeur',
  [Role.ENTITY]: 'Entité',
}

/**
 * Traduction des rôles OE
 */
export const oeRoleLabels: Record<OERoleType, string> = {
  [OERole.ADMIN]: 'Administrateur',
  [OERole.ACCOUNT_MANAGER]: 'Gestionnaire de compte',
}

/**
 * Traduction des rôles Entity
 */
export const entityRoleLabels: Record<EntityRoleType, string> = {
  [EntityRole.SIGNATORY]: 'Signataire',
  [EntityRole.PROCESS_MANAGER]: 'Gestionnaire de processus',
}

/**
 * Obtenir le label d'un rôle principal
 */
export function getRoleLabel(role: RoleType): string {
  return roleLabels[role] || role
}

/**
 * Obtenir le label d'un rôle OE
 */
export function getOERoleLabel(role: OERoleType): string {
  return oeRoleLabels[role] || role
}

/**
 * Obtenir le label d'un rôle Entity
 */
export function getEntityRoleLabel(role: EntityRoleType): string {
  return entityRoleLabels[role] || role
}

/**
 * Obtenir tous les rôles disponibles pour un select
 */
export function getRoleOptions() {
  return Object.entries(roleLabels).map(([value, label]) => ({
    value,
    label,
  }))
}

/**
 * Obtenir tous les rôles OE pour un select
 */
export function getOERoleOptions() {
  return Object.entries(oeRoleLabels).map(([value, label]) => ({
    value,
    label,
  }))
}

/**
 * Obtenir tous les rôles Entity pour un select
 */
export function getEntityRoleOptions() {
  return Object.entries(entityRoleLabels).map(([value, label]) => ({
    value,
    label,
  }))
}
