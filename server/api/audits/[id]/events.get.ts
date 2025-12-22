import { db } from '~~/server/database'
import { audits } from '~~/server/database/schema'
import { eq, isNull } from 'drizzle-orm'
import { requireAuditAccess, AccessType } from '~~/server/utils/authorization'
import { getAuditEvents } from '~~/server/services/events'

/**
 * GET /api/audits/:id/events
 *
 * Récupère tous les événements d'un audit avec filtrage optionnel.
 *
 * Query params:
 * - types: string[] - Filtrer par types d'événements (ex: AUDIT_CASE_SUBMITTED,AUDIT_CASE_APPROVED)
 * - limit: number - Limiter le nombre de résultats (défaut: illimité)
 *
 * Autorisations: FEEF, OE (celui assigné à l'audit)
 */
export default defineEventHandler(async (event) => {
  // Authentification requise
  const { user: currentUser } = await requireUserSession(event)

  // Récupérer l'ID de l'audit
  const auditId = getRouterParam(event, 'id')

  if (!auditId) {
    throw createError({
      statusCode: 400,
      message: 'ID de l\'audit manquant',
    })
  }

  const auditIdInt = parseInt(auditId)

  if (isNaN(auditIdInt)) {
    throw createError({
      statusCode: 400,
      message: 'ID de l\'audit invalide',
    })
  }

  // Vérifier l'accès en lecture à l'audit
  await requireAuditAccess({
    user: currentUser,
    auditId: auditIdInt,
    accessType: AccessType.READ,
  })

  // Vérifier que l'audit existe
  const audit = await db.query.audits.findFirst({
    where: (audits, { eq, isNull, and }) => and(
      eq(audits.id, auditIdInt),
      isNull(audits.deletedAt)
    ),
  })

  if (!audit) {
    throw createError({
      statusCode: 404,
      message: 'Audit non trouvé',
    })
  }

  // Récupérer les paramètres de query
  const query = getQuery(event)
  const types = query.types ? String(query.types).split(',') : undefined
  const limit = query.limit ? parseInt(String(query.limit)) : undefined

  // Récupérer les événements
  const events = await getAuditEvents(auditIdInt, { types, limit })

  return {
    data: events,
  }
})
