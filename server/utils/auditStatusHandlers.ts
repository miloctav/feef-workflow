import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { entities } from '~~/server/database/schema'
import { forUpdate } from '~~/server/utils/tracking'
import { AuditStatus } from '~~/shared/types/enums'
import type { H3Event } from 'h3'

/**
 * Type pour les handlers de statut d'audit
 *
 * Chaque handler reçoit l'audit et l'event H3, et retourne des mises à jour optionnelles.
 *
 * Les handlers doivent UNIQUEMENT retourner des mises à jour de données.
 * Les effets de bord complexes (génération de documents, etc.) doivent être gérés
 * dans l'endpoint API après la mise à jour de la base de données.
 */
type StatusHandler = (audit: any, event: H3Event) => Promise<Record<string, any> | null>

/**
 * Handler pour le statut COMPLETED
 *
 * Actions effectuées :
 * - Calcule automatiquement labelExpirationDate (date actuelle + 1 an)
 * - Réinitialise les champs de workflow de l'entité pour préparer le prochain cycle :
 *   - documentaryReviewReadyAt/By
 *
 * Note : L'attestation de labellisation est générée dans l'endpoint API
 * après que l'audit ait été mis à jour en base de données.
 */
const handleCompletedStatus: StatusHandler = async (audit, event) => {
  console.log(`[AuditStatusHandler] Exécution des actions pour le statut COMPLETED de l'audit ID ${audit.id}`)

  // 1. Calculer la date d'expiration du label (1 an après aujourd'hui)
  const expirationDate = new Date()
  expirationDate.setFullYear(expirationDate.getFullYear() + 1)
  const labelExpirationDate = expirationDate.toISOString().split('T')[0] // Format YYYY-MM-DD

  console.log(`[AuditStatusHandler] Date d'expiration calculée : ${labelExpirationDate}`)

  // 2. Réinitialiser les champs de workflow de l'entité pour le prochain cycle
  if (audit.entityId) {
    console.log(`[AuditStatusHandler] Réinitialisation des champs de workflow pour l'entité ID ${audit.entityId}`)

    await db
      .update(entities)
      .set(forUpdate(event, {
        documentaryReviewReadyAt: null,
        documentaryReviewReadyBy: null,
      }))
      .where(eq(entities.id, audit.entityId))

    console.log(`[AuditStatusHandler] Champs de workflow réinitialisés pour l'entité ID ${audit.entityId}`)
  }

  // Note: L'attestation de labellisation est générée dans l'endpoint API
  // après que l'audit ait été mis à jour en base de données avec labelExpirationDate

  // Retourner les mises à jour à appliquer à l'audit
  return {
    labelExpirationDate,
  }
}

/**
 * Mapping des statuts vers leurs handlers
 *
 * Pour ajouter un nouveau handler :
 * 1. Créer une fonction handleXxxStatus suivant le type StatusHandler
 * 2. Ajouter l'entrée dans ce mapping
 *
 * Exemple :
 * ```typescript
 * const handlePlanningStatus: StatusHandler = async (audit, event) => {
 *   // Actions spécifiques au statut PLANNING
 *   return { ... }
 * }
 *
 * const statusHandlers = {
 *   [AuditStatus.COMPLETED]: handleCompletedStatus,
 *   [AuditStatus.PLANNING]: handlePlanningStatus,
 * }
 * ```
 */
const statusHandlers: Partial<Record<string, StatusHandler>> = {
  [AuditStatus.COMPLETED]: handleCompletedStatus,
  // Ajouter d'autres handlers ici au fur et à mesure
}

/**
 * Exécute les actions automatiques associées à un changement de statut d'audit
 *
 * @param currentAudit - L'audit avant modification (pour comparer le statut)
 * @param newStatus - Le nouveau statut demandé
 * @param event - L'event H3 pour le tracking
 * @returns Les mises à jour additionnelles à appliquer à l'audit, ou null si aucune
 */
export async function executeStatusActions(
  currentAudit: any,
  newStatus: string,
  event: H3Event
): Promise<Record<string, any> | null> {
  // Vérifier si le statut a réellement changé
  if (currentAudit.status === newStatus) {
    console.log(`[AuditStatusHandler] Statut inchangé (${newStatus}), aucune action à exécuter`)
    return null
  }

  console.log(`[AuditStatusHandler] Changement de statut détecté : ${currentAudit.status} → ${newStatus}`)

  // Chercher le handler pour le nouveau statut
  const handler = statusHandlers[newStatus]

  if (!handler) {
    console.log(`[AuditStatusHandler] Aucun handler défini pour le statut ${newStatus}`)
    return null
  }

  // Exécuter le handler
  console.log(`[AuditStatusHandler] Exécution du handler pour le statut ${newStatus}`)
  const updates = await handler(currentAudit, event)

  if (updates) {
    console.log(`[AuditStatusHandler] Mises à jour générées par le handler :`, Object.keys(updates))
  } else {
    console.log(`[AuditStatusHandler] Aucune mise à jour générée par le handler`)
  }

  return updates
}
