import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { audits, oes, accounts } from '~~/server/database/schema'
import { forUpdate } from '~~/server/utils/tracking'
import { requireAuditAccess, AccessType } from '~~/server/utils/authorization'

interface UpdateAuditBody {
  oeId?: number
  auditorId?: number
  plannedStartDate?: string | null
  plannedEndDate?: string | null
  actualStartDate?: string | null
  actualEndDate?: string | null
  score?: number | null
  labelingOpinion?: any | null
  status?: string
  oeOpinion?: string
  oeOpinionArgumentaire?: string
  oeOpinionConditions?: string | null
  feefDecision?: string
  labelExpirationDate?: string | null
}

/**
 * PUT /api/audits/:id
 *
 * Met à jour un audit existant
 *
 * IMPORTANT: entityId et type NE PEUVENT PAS être modifiés
 *
 * Champs modifiables:
 * - oeId: ID de l'OE
 * - auditorId: ID de l'auditeur (doit avoir le rôle AUDITOR)
 * - plannedStartDate: date de début prévisionnelle (format: YYYY-MM-DD)
 * - plannedEndDate: date de fin prévisionnelle (format: YYYY-MM-DD)
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
    plannedStartDate,
    plannedEndDate,
    actualStartDate,
    actualEndDate,
    score,
    labelingOpinion,
    status,
    oeOpinion,
    oeOpinionArgumentaire,
    oeOpinionConditions,
    feefDecision,
    labelExpirationDate,
  } = body

  // Vérifier qu'au moins un champ est fourni
  if (
    oeId === undefined &&
    auditorId === undefined &&
    plannedStartDate === undefined &&
    plannedEndDate === undefined &&
    actualStartDate === undefined &&
    actualEndDate === undefined &&
    score === undefined &&
    labelingOpinion === undefined &&
    status === undefined &&
    oeOpinion === undefined &&
    oeOpinionArgumentaire === undefined &&
    oeOpinionConditions === undefined &&
    feefDecision === undefined &&
    labelExpirationDate === undefined
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
  if (plannedStartDate !== undefined) updateData.plannedStartDate = plannedStartDate
  if (plannedEndDate !== undefined) updateData.plannedEndDate = plannedEndDate
  if (actualStartDate !== undefined) updateData.actualStartDate = actualStartDate
  if (actualEndDate !== undefined) updateData.actualEndDate = actualEndDate
  if (score !== undefined) updateData.score = score
  if (labelingOpinion !== undefined) updateData.labelingOpinion = labelingOpinion
  if (status !== undefined) updateData.status = status

  // Gestion de l'avis OE avec timestamps automatiques
  if (oeOpinion !== undefined) {
    updateData.oeOpinion = oeOpinion
    updateData.oeOpinionTransmittedAt = new Date()
    updateData.oeOpinionTransmittedBy = currentUser.id
    // Transition automatique vers PENDING_FEEF_DECISION si pas déjà fait
    if (!status && existingAudit.status === 'PENDING_OE_OPINION') {
      updateData.status = 'PENDING_FEEF_DECISION'
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
  if (labelExpirationDate !== undefined) updateData.labelExpirationDate = labelExpirationDate

  // Mettre � jour l'audit
  const [updatedAudit] = await db
    .update(audits)
    .set(forUpdate(event, updateData))
    .where(eq(audits.id, auditIdInt))
    .returning()

  // Retourner l'audit mis � jour
  return {
    data: updatedAudit,
  }
})
