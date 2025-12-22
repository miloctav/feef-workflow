import { eq } from 'drizzle-orm'
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
    feefDecision === undefined
  ) {
    throw createError({
      statusCode: 400,
      message: 'Au moins un champ doit être fourni pour la modification',
    })
  }

  // Vérifications de permissions selon le rôle
  if (currentUser.role === Role.OE) {
    // OE ne peut modifier que certains champs
    if (feefDecision !== undefined) {
      throw createError({
        statusCode: 403,
        message: 'Seul FEEF peut modifier la décision FEEF',
      })
    }
    // OE peut modifier: score, oeOpinion, oeOpinionArgumentaire, status
  } else if (currentUser.role === Role.FEEF) {
    // FEEF peut tout modifier
  } else {
    // Autres rôles: pas d'accès (déjà géré par requireAuditAccess)
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

  // Régénération d'attestation si l'audit est déjà COMPLETED et est mis à jour
  if (existingAudit.status === AuditStatus.COMPLETED && !status) {
    console.log('[PUT /api/audits/:id] Audit déjà COMPLETED, régénération de l\'attestation')

    try {
      const { AttestationGenerator } = await import('~~/server/services/documentGeneration/AttestationGenerator')
      const generator = new AttestationGenerator()

      await generator.generate(
        { event, data: { auditId: existingAudit.id } },
        {
          auditId: existingAudit.id,
          auditDocumentType: 'ATTESTATION',
          entityId: existingAudit.entityId,
        }
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

  // Si globalScore a été modifié, recalculer needsCorrectivePlan
  if (globalScore !== undefined) {
    const { updateNeedsCorrectivePlan } = await import('~~/server/utils/auditCorrectivePlan')
    await updateNeedsCorrectivePlan(auditIdInt, currentUser.id)

    // Récupérer l'audit après updateNeedsCorrectivePlan
    const auditAfterCorrectivePlan = await db.query.audits.findFirst({
      where: eq(audits.id, auditIdInt),
    })

    if (auditAfterCorrectivePlan) {
      // Vérifier les auto-transitions après le calcul du needsCorrectivePlan
      await auditStateMachine.checkAutoTransition(auditAfterCorrectivePlan, event)
    }
  }

  // Vérifier les auto-transitions après toute mise à jour de champ
  // (ex: dates changées, score mis à jour, etc.)
  await auditStateMachine.checkAutoTransition(updatedAudit, event)

  // Compléter les actions en attente basées sur le nouvel état de l'audit
  const { checkAndCompleteAllPendingActions } = await import('~~/server/services/actions')
  await checkAndCompleteAllPendingActions(updatedAudit, currentUser.id, event)

  // Récupérer l'audit final après toutes les transitions
  const finalAudit = await db.query.audits.findFirst({
    where: eq(audits.id, auditIdInt),
  })

  // Retourner l'audit mis à jour
  return {
    data: finalAudit,
  }
})
