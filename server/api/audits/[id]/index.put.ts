import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { audits, oes, accounts } from '~~/server/database/schema'
import { forUpdate } from '~~/server/utils/tracking'
import { requireAuditAccess, AccessType } from '~~/server/utils/authorization'

interface UpdateAuditBody {
  oeId?: number
  auditorId?: number
  plannedDate?: string | null
  actualDate?: string | null
  score?: number | null
  labelingOpinion?: any | null
}

/**
 * PUT /api/audits/:id
 *
 * Met � jour un audit existant
 *
 * IMPORTANT: entityId et type NE PEUVENT PAS �tre modifi�s
 *
 * Champs modifiables:
 * - oeId: ID de l'OE
 * - auditorId: ID de l'auditeur (doit avoir le r�le AUDITOR)
 * - plannedDate: date planifi�e de l'audit (format: YYYY-MM-DD)
 * - actualDate: date r�elle de l'audit (format: YYYY-MM-DD)
 * - score: score de l'audit
 * - labelingOpinion: avis de labellisation (JSON)
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
    userId: currentUser.id,
    userRole: currentUser.role,
    auditId: auditIdInt,
    userOeId: currentUser.oeId,
    userOeRole: currentUser.oeRole,
    currentEntityId: currentUser.currentEntityId,
    accessType: AccessType.WRITE
  })

  // V�rifier que l'audit existe
  const existingAudit = await db.query.audits.findFirst({
    where: eq(audits.id, auditIdInt),
  })

  if (!existingAudit) {
    throw createError({
      statusCode: 404,
      message: 'Audit non trouv�',
    })
  }

  // R�cup�rer les donn�es du corps de la requ�te
  const body = await readBody<UpdateAuditBody>(event)

  const { oeId, auditorId, plannedDate, actualDate, score, labelingOpinion } = body

  // V�rifier qu'au moins un champ est fourni
  if (
    oeId === undefined &&
    auditorId === undefined &&
    plannedDate === undefined &&
    actualDate === undefined &&
    score === undefined &&
    labelingOpinion === undefined
  ) {
    throw createError({
      statusCode: 400,
      message: 'Au moins un champ doit �tre fourni pour la modification',
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

  // Pr�parer les donn�es � mettre � jour
  const updateData: Partial<UpdateAuditBody> = {}

  if (oeId !== undefined) updateData.oeId = oeId
  if (auditorId !== undefined) updateData.auditorId = auditorId
  if (plannedDate !== undefined) updateData.plannedDate = plannedDate
  if (actualDate !== undefined) updateData.actualDate = actualDate
  if (score !== undefined) updateData.score = score
  if (labelingOpinion !== undefined) updateData.labelingOpinion = labelingOpinion

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
