import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { audits, oes, accounts, auditNotation } from '~~/server/database/schema'
import { forUpdate } from '~~/server/utils/tracking'
import { requireAuditAccess, AccessType } from '~~/server/utils/authorization'
import { executeStatusActions } from '~~/server/utils/auditStatusHandlers'
import { detectAndCompleteActionsForAuditField, detectAndCompleteActionsForAuditStatus } from '~~/server/services/actions'

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
  if (status !== undefined) updateData.status = status

  // Si globalScore est modifié, mettre à jour et recalculer needsCorrectivePlan via fonction dédiée
  if (globalScore !== undefined) {
    updateData.globalScore = globalScore

    // Vérifier si la transition PENDING_REPORT → PENDING_OE_OPINION est possible
    // Cela se produit quand le score vient d'être défini et qu'un rapport existe déjà
    if (existingAudit.status === AuditStatus.PENDING_REPORT && !status) {
      const { checkAndTransitionToPendingOEOpinion } = await import('~~/server/utils/auditReportTransition')
      const transitionedStatus = await checkAndTransitionToPendingOEOpinion(
        auditIdInt,
        existingAudit.status,
        currentUser.id
      )

      if (transitionedStatus) {
        updateData.status = transitionedStatus
        console.log(`✅ [PUT /api/audits/:id] Transition automatique vers ${transitionedStatus} après mise à jour du score`)
      }
    }
  }

  // Gestion de l'avis OE avec timestamps automatiques
  if (oeOpinion !== undefined) {
    updateData.oeOpinion = oeOpinion
    updateData.oeOpinionTransmittedAt = new Date()
    updateData.oeOpinionTransmittedBy = currentUser.id
    // Transition automatique vers PENDING_FEEF_DECISION si pas déjà fait
    if (!status && existingAudit.status === AuditStatus.PENDING_OE_OPINION) {
      updateData.status = AuditStatus.PENDING_FEEF_DECISION
    }
  }
  if (oeOpinionArgumentaire !== undefined) {
    updateData.oeOpinionArgumentaire = oeOpinionArgumentaire
  }
  if (oeOpinionConditions !== undefined) {
    updateData.oeOpinionConditions = oeOpinionConditions
  }

  // Gestion de la décision FEEF avec timestamps automatiques
  if (feefDecision !== undefined) {
    updateData.feefDecision = feefDecision
    updateData.feefDecisionAt = new Date()
    updateData.feefDecisionBy = currentUser.id
  }

  // Exécuter les actions automatiques associées au changement de statut
  let statusChanged = false
  if (status !== undefined) {
    const statusUpdates = await executeStatusActions(existingAudit, status, event)

    if (statusUpdates) {
      // Fusionner les mises à jour générées par le handler avec updateData
      Object.assign(updateData, statusUpdates)
      console.log('[PUT /api/audits/:id] Mises à jour automatiques appliquées suite au changement de statut')
    }
    statusChanged = true
  }

  // Si le statut a changé automatiquement via oeOpinion, exécuter aussi les actions
  if (!statusChanged && oeOpinion !== undefined && existingAudit.status === AuditStatus.PENDING_OE_OPINION && updateData.status === AuditStatus.PENDING_FEEF_DECISION) {
    const statusUpdates = await executeStatusActions(existingAudit, AuditStatus.PENDING_FEEF_DECISION, event)
    if (statusUpdates) {
      Object.assign(updateData, statusUpdates)
      console.log('[PUT /api/audits/:id] Mises à jour automatiques appliquées suite au changement de statut automatique (oeOpinion)')
    }
  }

  // Régénération d'attestation si l'audit est déjà COMPLETED et est mis à jour
  if (existingAudit.status === AuditStatus.COMPLETED && !status) {
    console.log('[PUT /api/audits/:id] Audit déjà COMPLETED, régénération de l\'attestation')

    try {
      const { AttestationGenerator } = await import('~~/server/services/documentGeneration/AttestationGenerator')

      const generator = new AttestationGenerator()

      await generator.generate(
        {
          event,
          data: { auditId: existingAudit.id },
        },
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

  console.log('Données de mise à jour avant vérifications finales:', updateData)
  if (actualEndDate && !status) {
    console.log('Vérification de la transition automatique basée sur actualEndDate')
    const today = new Date()
    const endDate = new Date(actualEndDate)
    // Ignore time part for comparison
    today.setHours(0, 0, 0, 0)
    endDate.setHours(0, 0, 0, 0)
    console.log(`actualEndDate: ${endDate.toISOString().split('T')[0]}, today: ${today.toISOString().split('T')[0]}`)
    console.log(`Statut actuel de l'audit: ${existingAudit.status}`)
    if (endDate <= today && existingAudit.status === AuditStatus.PLANNING) {
      updateData.status = AuditStatus.PENDING_REPORT
      statusChanged = true
    }
  }

  // Mettre à jour l'audit
  await db
    .update(audits)
    .set(forUpdate(event, updateData))
    .where(eq(audits.id, auditIdInt))

  // Récupérer l'audit mis à jour
  let updatedAudit = await db.query.audits.findFirst({
    where: eq(audits.id, auditIdInt),
  })

  if (!updatedAudit) {
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la récupération de l\'audit mis à jour',
    })
  }

  // Si globalScore a été modifié, recalculer needsCorrectivePlan et gérer transitions intelligentes
  if (globalScore !== undefined) {
    const previousStatus = updatedAudit.status
    const { updateNeedsCorrectivePlan } = await import('~~/server/utils/auditCorrectivePlan')
    await updateNeedsCorrectivePlan(auditIdInt, currentUser.id)

    // Récupérer l'audit après updateNeedsCorrectivePlan pour voir si le statut a changé
    const auditAfterCorrectivePlan = await db.query.audits.findFirst({
      where: eq(audits.id, auditIdInt),
    })

    // Si le statut a changé suite à updateNeedsCorrectivePlan, créer les actions
    if (auditAfterCorrectivePlan && auditAfterCorrectivePlan.status !== previousStatus) {
      const { createActionsForAuditStatus, checkAndCompleteAllPendingActions } = await import('~~/server/services/actions')
      await createActionsForAuditStatus(auditAfterCorrectivePlan, auditAfterCorrectivePlan.status, event)
      await checkAndCompleteAllPendingActions(auditAfterCorrectivePlan, currentUser.id, event)

      // Mettre à jour updatedAudit pour la suite
      updatedAudit = auditAfterCorrectivePlan
    }
  }

  // If status changed, create actions for the new status
  if (updatedAudit.status !== existingAudit.status) {
    const { createActionsForAuditStatus } = await import('~~/server/services/actions')
    await createActionsForAuditStatus(updatedAudit, updatedAudit.status, event)
  }

  // Check and complete all pending actions based on audit state
  const { checkAndCompleteAllPendingActions } = await import('~~/server/services/actions')
  await checkAndCompleteAllPendingActions(updatedAudit, currentUser.id, event)

  // Générer l'attestation si le statut vient de passer à COMPLETED
  if (status === AuditStatus.COMPLETED && existingAudit.status !== AuditStatus.COMPLETED) {
    console.log(`[PUT /api/audits/:id] Génération de l'attestation pour l'audit ID ${auditIdInt}`)

    try {
      const { AttestationGenerator } = await import('~~/server/services/documentGeneration/AttestationGenerator')

      const generator = new AttestationGenerator()

      await generator.generate(
        {
          event,
          data: { auditId: auditIdInt },
        },
        {
          auditId: auditIdInt,
          auditDocumentType: 'ATTESTATION',
          entityId: updatedAudit.entityId,
        }
      )

      console.log(`[PUT /api/audits/:id] Attestation générée avec succès pour l'audit ID ${auditIdInt}`)
    } catch (error) {
      console.error('[PUT /api/audits/:id] Erreur lors de la génération de l\'attestation:', error)
      // Non-blocking: ne pas empêcher le changement de statut de réussir
    }
  }

  // Retourner l'audit mis � jour
  return {
    data: updatedAudit,
  }
})
