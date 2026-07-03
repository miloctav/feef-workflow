import { and, eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { audits, oes, accounts } from '~~/server/database/schema'
import { forUpdate } from '~~/server/utils/tracking'
import { requireAuditAccess, AccessType } from '~~/server/utils/authorization'
import { auditStateMachine } from '~~/server/state-machine'
import { recordEvent } from '~~/server/services/events'

interface UpdateAuditBody {
  oeId?: number
  auditorId?: number
  actualStartDate?: string | null
  actualEndDate?: string | null
  globalScore?: number | null
  labelingOpinion?: any | null
  status?: string
  oeOpinion?: string
  oeOpinionArgumentaire?: string
  oeOpinionConditions?: string | null
  feefDecision?: string
  // Données personnalisées pour l'attestation
  attestationCustomData?: {
    customScope?: string
    customExclusions?: string
    customCompanies?: string
  }
  // Champs pour l'audit complémentaire (phase 2)
  complementaryStartDate?: string | null
  complementaryEndDate?: string | null
  complementaryGlobalScore?: number | null
}

/**
 * PUT /api/audits/:id
 *
 * Met à jour un audit existant
 *
 * IMPORTANT: entityId, type, plannedStartDate et plannedEndDate NE PEUVENT PAS être modifiés
 * Les dates prévisionnelles sont calculées automatiquement lors de la création de l'audit
 *
 * Champs modifiables:
 * - oeId: ID de l'OE
 * - auditorId: ID de l'auditeur (doit avoir le rôle AUDITOR)
 * - actualStartDate: date de début réelle (format: YYYY-MM-DD)
 * - actualEndDate: date de fin réelle (format: YYYY-MM-DD)
 * - score: score de l'audit (OE uniquement)
 * - labelingOpinion: avis de labellisation (JSON)
 * - status: statut du workflow de l'audit
 * - oeOpinion: avis de l'OE (FAVORABLE, UNFAVORABLE, RESERVED) - OE uniquement
 * - oeOpinionArgumentaire: argumentaire de l'avis OE - OE uniquement
 * - feefDecision: décision FEEF (PENDING, ACCEPTED, REJECTED) - FEEF uniquement
 *
 * Autorisations: FEEF et OE
 */
export default defineEventHandler(async (event) => {
  // Authentification requise
  const { user: currentUser } = await requireUserSession(event)

  // Récupérer l'ID de l'audit à modifier
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

  // Vérifier l'accès en écriture à l'audit
  await requireAuditAccess({
    user: currentUser,
    auditId: auditIdInt,
    accessType: AccessType.WRITE
  })

  // V�rifier que l'audit existe
  const existingAudit = await db.query.audits.findFirst({
    where: eq(audits.id, auditIdInt),
  })

  if (!existingAudit) {
    throw createError({
      statusCode: 404,
      message: 'Audit non trouvé',
    })
  }

  // Vérifier que l'audit n'est pas terminé
  if (existingAudit.status === 'COMPLETED') {
    throw createError({
      statusCode: 403,
      message: 'Impossible de modifier un audit terminé',
    })
  }

  // Récupérer les données du corps de la requête
  const body = await readBody<UpdateAuditBody>(event)

  const {
    oeId,
    auditorId,
    actualStartDate,
    actualEndDate,
    globalScore,
    labelingOpinion,
    status,
    oeOpinion,
    oeOpinionArgumentaire,
    oeOpinionConditions,
    feefDecision,
    attestationCustomData,
    // Champs pour l'audit complémentaire (phase 2)
    complementaryStartDate,
    complementaryEndDate,
    complementaryGlobalScore,
    // labelExpirationDate n'est plus accepté du frontend - sera calculé automatiquement par le backend si nécessaire
  } = body

  // Vérifier qu'au moins un champ est fourni
  if (
    oeId === undefined &&
    auditorId === undefined &&
    actualStartDate === undefined &&
    actualEndDate === undefined &&
    globalScore === undefined &&
    labelingOpinion === undefined &&
    status === undefined &&
    oeOpinion === undefined &&
    oeOpinionArgumentaire === undefined &&
    oeOpinionConditions === undefined &&
    feefDecision === undefined &&
    complementaryStartDate === undefined &&
    complementaryEndDate === undefined &&
    complementaryGlobalScore === undefined
  ) {
    throw createError({
      statusCode: 400,
      message: 'Au moins un champ doit être fourni pour la modification',
    })
  }

  // Vérifications de permissions selon le rôle
  // Seuls FEEF et OE peuvent modifier un audit. On rejette explicitement tout
  // autre rôle (ENTITY, AUDITOR) en deny-by-default, sans dépendre uniquement de
  // requireAuditAccess (qui autorise l'AUDITEUR en écriture pour la notation).
  if (currentUser.role === Role.OE) {
    // OE ne peut modifier que certains champs
    if (feefDecision !== undefined) {
      throw createError({
        statusCode: 403,
        message: 'Seul FEEF peut modifier la décision FEEF',
      })
    }
    // OE ne peut pas réassigner l'audit à un autre OE (mass assignment)
    if (oeId !== undefined && oeId !== currentUser.oeId) {
      throw createError({
        statusCode: 403,
        message: 'Un OE ne peut pas réassigner un audit à une autre organisation',
      })
    }
    // OE peut modifier: score, oeOpinion, oeOpinionArgumentaire, status
  } else if (currentUser.role === Role.FEEF) {
    // FEEF peut tout modifier
  } else {
    // ENTITY, AUDITOR et tout autre rôle : interdits en écriture sur un audit
    throw createError({
      statusCode: 403,
      message: 'Vous n\'êtes pas autorisé à modifier un audit',
    })
  }

  // Si oeId est fourni, v�rifier que l'OE existe
  if (oeId !== undefined) {
    const oe = await db.query.oes.findFirst({
      where: eq(oes.id, oeId),
      columns: {
        id: true,
        name: true,
      },
    })

    if (!oe) {
      throw createError({
        statusCode: 404,
        message: 'L\'OE sp�cifi� n\'existe pas.',
      })
    }
  }

  // Si auditorId est fourni, v�rifier que l'auditeur existe et a le r�le AUDITOR
  if (auditorId !== undefined) {
    const auditor = await db.query.accounts.findFirst({
      where: eq(accounts.id, auditorId),
      columns: {
        id: true,
        role: true,
      },
    })

    if (!auditor) {
      throw createError({
        statusCode: 404,
        message: 'L\'auditeur sp�cifi� n\'existe pas.',
      })
    }

    if (auditor.role !== Role.AUDITOR) {
      throw createError({
        statusCode: 400,
        message: 'L\'account sp�cifi� doit avoir le r�le AUDITOR.',
      })
    }
  }

  // Préparer les données à mettre à jour
  const updateData: any = {}

  if (oeId !== undefined) updateData.oeId = oeId
  if (auditorId !== undefined) updateData.auditorId = auditorId
  if (actualStartDate !== undefined) updateData.actualStartDate = actualStartDate
  if (actualEndDate !== undefined) updateData.actualEndDate = actualEndDate
  if (labelingOpinion !== undefined) updateData.labelingOpinion = labelingOpinion
  if (globalScore !== undefined) updateData.globalScore = globalScore
  // Champs pour l'audit complémentaire (phase 2)
  if (complementaryStartDate !== undefined) updateData.complementaryStartDate = complementaryStartDate
  if (complementaryEndDate !== undefined) updateData.complementaryEndDate = complementaryEndDate
  if (complementaryGlobalScore !== undefined) updateData.complementaryGlobalScore = complementaryGlobalScore

  // Gestion de l'avis OE
  if (oeOpinion !== undefined) {
    updateData.oeOpinion = oeOpinion
  }
  if (oeOpinionArgumentaire !== undefined) {
    updateData.oeOpinionArgumentaire = oeOpinionArgumentaire
  }
  if (oeOpinionConditions !== undefined) {
    updateData.oeOpinionConditions = oeOpinionConditions
  }

  // Gestion de la décision FEEF
  if (feefDecision !== undefined) {
    updateData.feefDecision = feefDecision
  }

  // Sauvegarder les données personnalisées pour l'attestation
  if (attestationCustomData !== undefined) {
    updateData.attestationMetadata = attestationCustomData
  }

  // Régénération d'attestation si l'audit est déjà COMPLETED et est mis à jour
  if (existingAudit.status === AuditStatus.COMPLETED && !status) {
    console.log('[PUT /api/audits/:id] Audit déjà COMPLETED, régénération de l\'attestation')

    try {
      const { AttestationGenerator } = await import('~~/server/services/documentGeneration/AttestationGenerator')
      const generator = new AttestationGenerator()

      await generator.generateWithCustomData(
        { event, data: { auditId: existingAudit.id } },
        {
          auditId: existingAudit.id,
          auditDocumentType: 'ATTESTATION',
          entityId: existingAudit.entityId,
        },
        attestationCustomData
      )

      console.log('[PUT /api/audits/:id] Attestation régénérée avec succès')
    } catch (error) {
      console.error('[PUT /api/audits/:id] Erreur lors de la régénération de l\'attestation:', error)
      // Ne pas bloquer la mise à jour de l'audit
    }
  }


  // Mettre à jour les champs AVANT la transition de statut
  // (important pour que les guards aient accès aux nouvelles valeurs)
  if (Object.keys(updateData).length > 0) {
    await db
      .update(audits)
      .set(forUpdate(event, updateData))
      .where(eq(audits.id, auditIdInt))
  }

  // Enregistrer les événements correspondants
  if (oeOpinion !== undefined) {
    await recordEvent(event, {
      type: 'AUDIT_OE_OPINION_TRANSMITTED',
      auditId: auditIdInt,
      entityId: existingAudit.entityId,
      metadata: {
        opinion: oeOpinion,
        argumentaire: oeOpinionArgumentaire,
        conditions: oeOpinionConditions,
        timestamp: new Date(),
      },
    })
  }

  if (feefDecision !== undefined) {
    await recordEvent(event, {
      type: feefDecision === 'ACCEPTED' ? 'AUDIT_FEEF_DECISION_ACCEPTED' : 'AUDIT_FEEF_DECISION_REJECTED',
      auditId: auditIdInt,
      entityId: existingAudit.entityId,
      metadata: {
        decision: feefDecision,
        timestamp: new Date(),
      },
    })
  }

  // Enregistrer l'événement de définition des dates de l'audit complémentaire
  if (complementaryStartDate !== undefined || complementaryEndDate !== undefined) {
    await recordEvent(event, {
      type: 'AUDIT_COMPLEMENTARY_DATES_SET',
      auditId: auditIdInt,
      entityId: existingAudit.entityId,
      metadata: {
        complementaryStartDate,
        complementaryEndDate,
        timestamp: new Date(),
      },
    })
  }

  // Enregistrer l'événement d'upload du rapport complémentaire (si score défini)
  if (complementaryGlobalScore !== undefined) {
    await recordEvent(event, {
      type: 'AUDIT_COMPLEMENTARY_REPORT_UPLOADED',
      auditId: auditIdInt,
      entityId: existingAudit.entityId,
      metadata: {
        complementaryGlobalScore,
        timestamp: new Date(),
      },
    })
  }

  // Récupérer l'audit mis à jour pour la transition
  const auditBeforeTransition = await db.query.audits.findFirst({
    where: eq(audits.id, auditIdInt),
  })

  if (!auditBeforeTransition) {
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la récupération de l\'audit mis à jour',
    })
  }

  // Gestion du changement de statut via la state machine
  if (status !== undefined) {
    // Transition manuelle explicite via state machine
    await auditStateMachine.transition(auditBeforeTransition, status as any, event)
  }

  // Récupérer l'audit mis à jour
  const updatedAudit = await db.query.audits.findFirst({
    where: eq(audits.id, auditIdInt),
  })

  if (!updatedAudit) {
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la récupération de l\'audit mis à jour',
    })
  }

  // Si globalScore a été modifié, recalculer actionPlanType
  if (globalScore !== undefined) {
    const oldStatus = updatedAudit.status

    const { updateActionPlanType } = await import('~~/server/utils/auditCorrectivePlan')
    await updateActionPlanType(auditIdInt, currentUser.id)

    // Récupérer l'audit après updateActionPlanType
    const auditAfterActionPlan = await db.query.audits.findFirst({
      where: eq(audits.id, auditIdInt),
    })

    if (auditAfterActionPlan && auditAfterActionPlan.status !== oldStatus) {
      // Le statut a changé ! Il faut créer les actions pour le nouveau statut
      console.log(`📝 Status changed from ${oldStatus} to ${auditAfterActionPlan.status}, creating actions...`)

      const { createActionsForAuditStatus } = await import('~~/server/services/actions')
      await createActionsForAuditStatus(auditAfterActionPlan, auditAfterActionPlan.status, event)
    }

    // NOUVEAU : Mettre à jour la deadline de l'action existante si elle existe
    if (auditAfterActionPlan && auditAfterActionPlan.actionPlanDeadline) {
      const { actions } = await import('~~/server/database/schema')
      const { isNull } = await import('drizzle-orm')

      // Chercher l'action existante
      const existingAction = await db.query.actions.findFirst({
        where: and(
          eq(actions.auditId, auditIdInt),
          eq(actions.type, 'ENTITY_UPLOAD_CORRECTIVE_PLAN'),
          eq(actions.status, 'PENDING'),
          isNull(actions.deletedAt)
        )
      })

      if (existingAction) {
        // Recalculer la durée basée sur la nouvelle deadline
        const now = new Date()
        const deadline = new Date(auditAfterActionPlan.actionPlanDeadline)
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
              actionPlanType: auditAfterActionPlan.actionPlanType,
              originalDeadline: auditAfterActionPlan.actionPlanDeadline.toISOString()
            },
            updatedBy: currentUser.id,
            updatedAt: new Date()
          })
          .where(eq(actions.id, existingAction.id))

        console.log(`✅ Action ${existingAction.id} deadline updated: ${newDuration} days (type: ${auditAfterActionPlan.actionPlanType})`)
      }
    }

    if (auditAfterActionPlan) {
      // Vérifier les auto-transitions après le calcul du actionPlanType
      await auditStateMachine.checkAutoTransition(auditAfterActionPlan, event)
    }
  }

  // Si complementaryGlobalScore a été modifié, recalculer actionPlanType pour la phase 2
  if (complementaryGlobalScore !== undefined) {
    const oldStatus = updatedAudit.status

    const { updateActionPlanTypePhase2 } = await import('~~/server/utils/auditCorrectivePlan')
    await updateActionPlanTypePhase2(auditIdInt, currentUser.id)

    // Récupérer l'audit après updateActionPlanTypePhase2
    const auditAfterActionPlan = await db.query.audits.findFirst({
      where: eq(audits.id, auditIdInt),
    })

    if (auditAfterActionPlan && auditAfterActionPlan.status !== oldStatus) {
      // Le statut a changé ! Il faut créer les actions pour le nouveau statut
      console.log(`📝 [Phase 2] Status changed from ${oldStatus} to ${auditAfterActionPlan.status}, creating actions...`)

      const { createActionsForAuditStatus } = await import('~~/server/services/actions')
      await createActionsForAuditStatus(auditAfterActionPlan, auditAfterActionPlan.status, event)
    }

    if (auditAfterActionPlan) {
      // Vérifier les auto-transitions après le calcul du actionPlanType phase 2
      await auditStateMachine.checkAutoTransition(auditAfterActionPlan, event)
    }
  }

  // Vérifier les auto-transitions après toute mise à jour de champ
  // (ex: dates changées, score mis à jour, etc.)
  await auditStateMachine.checkAutoTransition(updatedAudit, event)

  // Recharger l'audit après toutes les transitions pour avoir le statut le plus récent
  const auditAfterAllTransitions = await db.query.audits.findFirst({
    where: eq(audits.id, auditIdInt),
  })

  if (!auditAfterAllTransitions) {
    throw createError({
      statusCode: 404,
      message: 'Audit introuvable après transitions',
    })
  }

  // Compléter les actions en attente basées sur le nouvel état de l'audit
  const { checkAndCompleteAllPendingActions } = await import('~~/server/services/actions')
  await checkAndCompleteAllPendingActions(auditAfterAllTransitions, currentUser.id, event)

  // Récupérer l'audit final après toutes les transitions
  const finalAudit = await db.query.audits.findFirst({
    where: eq(audits.id, auditIdInt),
  })

  // Retourner l'audit mis à jour
  return {
    data: finalAudit,
  }
})
