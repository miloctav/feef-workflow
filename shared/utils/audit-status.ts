import { AuditStatus, type AuditStatusType, getAuditStatusLabel } from '#shared/types/enums'

/**
 * Vérifie si un statut d'audit est considéré "actif" (bloquant pour l'édition des champs versionnés)
 *
 * Un audit est actif tant qu'il n'est PAS dans l'un des états terminaux :
 * - COMPLETED : audit terminé avec succès
 * - REFUSED_BY_OE : audit refusé par l'OE
 *
 * @param status - Statut de l'audit à vérifier
 * @returns true si l'audit est actif (bloquant), false sinon
 */
export function isAuditStatusActive(status: AuditStatusType): boolean {
  return status !== AuditStatus.COMPLETED && status !== AuditStatus.REFUSED_BY_OE
}

/**
 * Retourne un message expliquant pourquoi les champs versionnés sont verrouillés
 *
 * @param status - Statut actuel de l'audit
 * @returns Message d'explication du verrouillage
 */
export function getAuditLockReason(status: AuditStatusType): string {
  const label = getAuditStatusLabel(status)
  return `Les champs versionnés sont verrouillés pendant l'audit (statut: ${label})`
}
