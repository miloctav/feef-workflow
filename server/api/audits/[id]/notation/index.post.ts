import { eq, and } from 'drizzle-orm'
import { db } from '~~/server/database'
import { auditNotation, audits } from '~~/server/database/schema'
import { requireAuditAccess, AccessType } from '~~/server/utils/authorization'
import { Role } from '#shared/types/roles'
import { forInsert } from '~~/server/utils/tracking'
import { getAuditScoreDefinition } from '~~/server/config/auditNotation.config'
import type { AuditScoreKey } from '~~/server/config/auditNotation.config'
import { updateActionPlanType, updateActionPlanTypePhase2 } from '~~/server/utils/auditCorrectivePlan'
import { AuditPhase, type AuditPhaseType } from '#shared/types/enums'

interface ScoreInput {
  criterionKey: number
  score: number
}

interface CreateNotationBody {
  scores: ScoreInput[]
  phase?: AuditPhaseType // 'PHASE_1' (default) ou 'PHASE_2'
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
 *   }>,
 *   phase?: 'PHASE_1' | 'PHASE_2'  // Défaut: 'PHASE_1'
 * }
 *
 * Comportement :
 * - Supprime tous les scores existants pour cet audit ET cette phase
 * - Insère tous les nouveaux scores dans une transaction atomique
 * - Enrichit automatiquement avec la description depuis la configuration
 * - Les scores de l'autre phase sont conservés
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

  // Seuls FEEF, OE et AUDITEUR peuvent noter un audit. On rejette explicitement
  // ENTITY (deny-by-default) en plus du contrôle d'accès à l'audit.
  if (
    currentUser.role !== Role.FEEF &&
    currentUser.role !== Role.OE &&
    currentUser.role !== Role.AUDITOR
  ) {
    throw createError({
      statusCode: 403,
      message: 'Vous n\'êtes pas autorisé à noter un audit',
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

  // Valider et définir la phase (défaut: PHASE_1)
  const phase = body.phase || AuditPhase.PHASE_1

  if (phase !== AuditPhase.PHASE_1 && phase !== AuditPhase.PHASE_2) {
    throw createError({
      statusCode: 400,
      message: 'La phase doit être "PHASE_1" ou "PHASE_2"',
    })
  }

  console.log(`📝 Saving scores for audit ${auditId}, phase: ${phase}`)

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
      phase, // Ajouter la phase
    })
  })

  // Exécuter l'upsert complet dans une transaction atomique
  const insertedNotations = await db.transaction(async (tx) => {
    // 1. Supprimer tous les scores existants pour cet audit ET cette phase uniquement
    await tx.delete(auditNotation).where(
      and(
        eq(auditNotation.auditId, auditId),
        eq(auditNotation.phase, phase)
      )
    )

    // 2. Insérer tous les nouveaux scores
    const inserted = await tx.insert(auditNotation).values(notationsToInsert).returning()

    return inserted
  })

  console.log(`✅ ${insertedNotations.length} scores inserted for audit ${auditId}`)

  // Récupérer l'audit AVANT updateActionPlanType pour détecter le changement de statut
  const auditBefore = await db.query.audits.findFirst({
    where: eq(audits.id, auditId),
  })

  if (!auditBefore) {
    throw createError({
      statusCode: 404,
      message: 'Audit introuvable',
    })
  }

  const oldStatus = auditBefore.status

  // Recalculer actionPlanType après modification des notations
  // Utiliser la fonction appropriée selon la phase
  let actionPlanType: 'NONE' | 'SHORT' | 'LONG'
  if (phase === AuditPhase.PHASE_2) {
    actionPlanType = await updateActionPlanTypePhase2(auditId, currentUser.id)
  }
  else {
    actionPlanType = await updateActionPlanType(auditId, currentUser.id)
  }

  console.log(`📊 actionPlanType updated to ${actionPlanType} for audit ${auditId} (phase: ${phase})`)

  // Récupérer l'audit frais après updateActionPlanType
  const freshAudit = await db.query.audits.findFirst({
    where: eq(audits.id, auditId),
  })

  if (freshAudit && freshAudit.status !== oldStatus) {
    // Le statut a changé ! Il faut créer les actions pour le nouveau statut
    console.log(`📝 Status changed from ${oldStatus} to ${freshAudit.status}, creating actions...`)

    const { createActionsForAuditStatus } = await import('~~/server/services/actions')
    await createActionsForAuditStatus(freshAudit, freshAudit.status, event)
  }

  // NOUVEAU : Mettre à jour la deadline de l'action existante si elle existe
  if (freshAudit && freshAudit.actionPlanDeadline) {
    const { actions } = await import('~~/server/database/schema')
    const { isNull } = await import('drizzle-orm')

    // Chercher l'action existante
    const existingAction = await db.query.actions.findFirst({
      where: and(
        eq(actions.auditId, auditId),
        eq(actions.type, 'ENTITY_UPLOAD_CORRECTIVE_PLAN'),
        eq(actions.status, 'PENDING'),
        isNull(actions.deletedAt)
      )
    })

    if (existingAction) {
      // Recalculer la durée basée sur la nouvelle deadline
      const now = new Date()
      const deadline = new Date(freshAudit.actionPlanDeadline)
      const diffInDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      const newDuration = diffInDays > 0 ? diffInDays : 1
      const newDeadline = new Date()
      newDeadline.setDate(newDeadline.getDate() + newDuration)

      // Mettre à jour l'action
      await db.update(actions)
        .set({
          deadline: newDeadline,
          durationDays: newDuration,
          metadata: {
            actionPlanType: freshAudit.actionPlanType,
            originalDeadline: freshAudit.actionPlanDeadline.toISOString()
          },
          updatedBy: currentUser.id,
          updatedAt: new Date()
        })
        .where(eq(actions.id, existingAction.id))

      console.log(`✅ Action ${existingAction.id} deadline updated: ${newDuration} days (type: ${freshAudit.actionPlanType})`)
    }
  }

  return {
    data: insertedNotations,
  }
})