import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { auditNotation } from '~~/server/database/schema'
import { requireAuditAccess, AccessType } from '~~/server/utils/authorization'
import { forInsert } from '~~/server/utils/tracking'
import { getAuditScoreDefinition } from '~~/server/config/auditNotation.config'
import type { AuditScoreKey } from '~~/server/config/auditNotation.config'
import { updateNeedsCorrectivePlan } from '~~/server/utils/auditCorrectivePlan'

interface ScoreInput {
  criterionKey: number
  score: number
}

interface CreateNotationBody {
  scores: ScoreInput[]
}

/**
 * POST /api/audits/:id/notation
 *
 * Crée ou remplace tous les scores de notation d'un audit (upsert complet)
 *
 * Body: {
 *   scores: Array<{
 *     criterionKey: number  // 0-20
 *     score: number         // 1-4 (A=1, B=2, C=3, D=4)
 *   }>
 * }
 *
 * Comportement :
 * - Supprime tous les scores existants pour cet audit
 * - Insère tous les nouveaux scores dans une transaction atomique
 * - Enrichit automatiquement avec la description depuis la configuration
 *
 * Autorisations : OE, AUDITOR (via requireAuditAccess)
 */
export default defineEventHandler(async (event) => {
  // Authentification requise
  const { user: currentUser } = await requireUserSession(event)

  console.log(`📝 ${currentUser.email} is updating audit notation`)

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

  // Vérifier l'accès en écriture à l'audit
  await requireAuditAccess({
    user: currentUser,
    auditId,
    accessType: AccessType.WRITE,
  })

  // Récupérer et valider le corps de la requête
  const body = await readBody<CreateNotationBody>(event)

  if (!body.scores || !Array.isArray(body.scores)) {
    throw createError({
      statusCode: 400,
      message: 'Le champ "scores" doit être un tableau',
    })
  }

  if (body.scores.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Le tableau "scores" ne peut pas être vide',
    })
  }

  // Valider chaque score
  const seenCriterionKeys = new Set<number>()

  for (const scoreInput of body.scores) {
    // Vérifier que criterionKey est un nombre entre 0 et 20
    if (
      typeof scoreInput.criterionKey !== 'number' ||
      scoreInput.criterionKey < 0 ||
      scoreInput.criterionKey > 20
    ) {
      throw createError({
        statusCode: 400,
        message: `Le criterionKey doit être un nombre entre 0 et 20 (reçu: ${scoreInput.criterionKey})`,
      })
    }

    // Vérifier que score est un nombre entre 1 et 4
    if (
      typeof scoreInput.score !== 'number' ||
      scoreInput.score < 1 ||
      scoreInput.score > 4
    ) {
      throw createError({
        statusCode: 400,
        message: `Le score doit être un nombre entre 1 et 4 (reçu: ${scoreInput.score})`,
      })
    }

    // Vérifier qu'il n'y a pas de doublons
    if (seenCriterionKeys.has(scoreInput.criterionKey)) {
      throw createError({
        statusCode: 400,
        message: `Le criterionKey ${scoreInput.criterionKey} est en double`,
      })
    }

    seenCriterionKeys.add(scoreInput.criterionKey)

    // Vérifier que la définition existe dans le config
    const definition = getAuditScoreDefinition(scoreInput.criterionKey as AuditScoreKey)
    if (!definition) {
      throw createError({
        statusCode: 400,
        message: `Aucune définition trouvée pour le criterionKey ${scoreInput.criterionKey}`,
      })
    }
  }

  // Préparer les données à insérer avec enrichissement
  const notationsToInsert = body.scores.map((scoreInput) => {
    const definition = getAuditScoreDefinition(scoreInput.criterionKey as AuditScoreKey)!

    return forInsert(event, {
      auditId,
      criterionKey: scoreInput.criterionKey,
      description: definition.description,
      score: scoreInput.score,
    })
  })

  // Exécuter l'upsert complet dans une transaction atomique
  const insertedNotations = await db.transaction(async (tx) => {
    // 1. Supprimer tous les scores existants pour cet audit
    await tx.delete(auditNotation).where(eq(auditNotation.auditId, auditId))

    // 2. Insérer tous les nouveaux scores
    const inserted = await tx.insert(auditNotation).values(notationsToInsert).returning()

    return inserted
  })

  console.log(`✅ ${insertedNotations.length} scores inserted for audit ${auditId}`)

  // Recalculer needsCorrectivePlan après modification des notations
  const needsCorrectivePlan = await updateNeedsCorrectivePlan(auditId, currentUser.id)

  console.log(`📊 needsCorrectivePlan updated to ${needsCorrectivePlan} for audit ${auditId}`)

  return {
    data: insertedNotations,
  }
})