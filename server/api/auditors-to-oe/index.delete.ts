import { eq, and } from 'drizzle-orm'
import { db } from '~~/server/database'
import { auditorsToOE } from '~~/server/database/schema'

/**
 * DELETE /api/auditors-to-oe
 *
 * Supprime l'association entre un auditeur et un organisme évaluateur
 *
 * Query params:
 * - auditorId: ID du compte auditeur (requis)
 * - oeId: ID de l'organisme évaluateur (requis)
 */
export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur connecté est FEEF
  const { user } = await requireUserSession(event)

  if (user.role !== Role.FEEF) {
    throw createError({
      statusCode: 403,
      message: 'Seul un administrateur FEEF peut supprimer des associations auditeur-OE',
    })
  }

  // Récupérer les paramètres de la requête
  const query = getQuery(event)
  const auditorId = query.auditorId ? Number(query.auditorId) : undefined
  const oeId = query.oeId ? Number(query.oeId) : undefined

  // Validation
  if (!auditorId || !oeId) {
    throw createError({
      statusCode: 400,
      message: 'auditorId et oeId sont requis',
    })
  }

  // Vérifier que l'association existe
  const existingAssociation = await db
    .select()
    .from(auditorsToOE)
    .where(
      and(
        eq(auditorsToOE.auditorId, auditorId),
        eq(auditorsToOE.oeId, oeId)
      )
    )
    .limit(1)

  if (existingAssociation.length === 0) {
    throw createError({
      statusCode: 404,
      message: 'Association auditeur-OE introuvable',
    })
  }

  // Supprimer l'association
  await db
    .delete(auditorsToOE)
    .where(
      and(
        eq(auditorsToOE.auditorId, auditorId),
        eq(auditorsToOE.oeId, oeId)
      )
    )

  console.log('[Auditors-to-OE API] Association supprimée: auditorId', auditorId, 'oeId', oeId)

  return {
    data: {
      success: true,
      message: 'Association supprimée avec succès',
    },
  }
})
