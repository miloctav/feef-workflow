import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { db } from '../database'
import { audits, entities } from '../database/schema'
import { forInsert } from './tracking'

/**
 * Crée automatiquement un audit pour une entité
 * Le type d'audit est déterminé par l'historique des audits de l'entité :
 * - INITIAL : si aucun audit existant
 * - RENEWAL : si des audits existent déjà
 *
 * @param entityId - L'ID de l'entité
 * @param event - L'événement H3 pour le contexte utilisateur
 * @returns L'audit créé
 * @throws {Error} Si l'entité n'existe pas ou est supprimée
 */
export async function createAuditForEntity(entityId: number, event: H3Event) {
  // Récupérer l'entité avec ses audits existants
  const entity = await db.query.entities.findFirst({
    where: eq(entities.id, entityId),
    with: {
      audits: {
        orderBy: (audits, { desc }) => [desc(audits.createdAt)],
        limit: 1,
      },
    },
  })

  if (!entity) {
    throw new Error(`Entity with ID ${entityId} not found`)
  }

  // Déterminer le type d'audit
  const auditType = entity.audits.length === 0
    ? AuditType.INITIAL
    : AuditType.RENEWAL

  // Construire les données de l'audit
  const auditData = {
    entityId,
    type: auditType,
    oeId: entity.oeId, // Peut être null
  }

  // Ajouter les métadonnées de tracking et créer l'audit
  const [newAudit] = await db
    .insert(audits)
    .values(forInsert(event, auditData))
    .returning()

  return newAudit
}
