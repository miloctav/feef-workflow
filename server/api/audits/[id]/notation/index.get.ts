import { eq, asc } from 'drizzle-orm'
import { db } from '~~/server/database'
import { auditNotation } from '~~/server/database/schema'
import { requireAuditAccess, AccessType } from '~~/server/utils/authorization'
import { getAuditScoreDefinition, toScoreLetter } from '~~/server/config/auditNotation.config'
import type { AuditScoreValue } from '~~/server/config/auditNotation.config'

/**
 * GET /api/audits/:id/notation
 *
 * Récupère tous les scores de notation d'un audit
 *
 * Les scores sont enrichis avec :
 * - theme : le thème RSE depuis la configuration
 * - scoreLetter : la lettre (A, B, C, D) correspondant au score numérique
 *
 * Autorisations : FEEF, OE, AUDITOR (via requireAuditAccess)
 */
export default defineEventHandler(async (event) => {
  // Authentification requise
  const { user } = await requireUserSession(event)

  console.log(`📋 ${user.email} is fetching audit notation`)

  // Récupérer l'ID depuis l'URL
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'ID de l\'audit requis',
    })
  }

  const auditId = parseInt(id)

  if (isNaN(auditId)) {
    throw createError({
      statusCode: 400,
      message: 'ID de l\'audit invalide',
    })
  }

  // Vérifier l'accès en lecture à l'audit
  await requireAuditAccess({
    user,
    auditId,
    accessType: AccessType.READ,
  })

  // Récupérer tous les scores depuis la base de données, triés par criterionKey
  const notations = await db.query.auditNotation.findMany({
    where: eq(auditNotation.auditId, auditId),
    orderBy: [asc(auditNotation.criterionKey)],
  })

  // Enrichir chaque score avec les données du config
  const enrichedNotations = notations.map((notation) => {
    const definition = getAuditScoreDefinition(notation.criterionKey as any)

    return {
      ...notation,
      theme: definition?.theme ?? null,
      scoreLetter: toScoreLetter(notation.score as AuditScoreValue),
    }
  })

  return {
    data: enrichedNotations,
  }
})
