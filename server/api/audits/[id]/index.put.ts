import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { audits, oes, accounts } from '~~/server/database/schema'
import { forUpdate } from '~~/server/utils/tracking'

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
 * Met à jour un audit existant
 *
 * IMPORTANT: entityId et type NE PEUVENT PAS être modifiés
 *
 * Champs modifiables:
 * - oeId: ID de l'OE
 * - auditorId: ID de l'auditeur (doit avoir le rôle AUDITOR)
 * - plannedDate: date planifiée de l'audit (format: YYYY-MM-DD)
 * - actualDate: date réelle de l'audit (format: YYYY-MM-DD)
 * - score: score de l'audit
 * - labelingOpinion: avis de labellisation (JSON)
 *
 * Autorisations: FEEF et OE
 */
export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur est authentifié et a le rôle FEEF ou OE
  const { user: currentUser } = await requireUserSession(event)

  if (currentUser.role !== Role.FEEF && currentUser.role !== Role.OE) {
    throw createError({
      statusCode: 403,
      message: 'Accès refusé. Seuls les rôles FEEF et OE peuvent modifier des audits.',
    })
  }

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

  // Vérifier que l'audit existe
  const existingAudit = await db.query.audits.findFirst({
    where: eq(audits.id, auditIdInt),
  })

  if (!existingAudit) {
    throw createError({
      statusCode: 404,
      message: 'Audit non trouvé',
    })
  }

  // Récupérer les données du corps de la requête
  const body = await readBody<UpdateAuditBody>(event)

  const { oeId, auditorId, plannedDate, actualDate, score, labelingOpinion } = body

  // Vérifier qu'au moins un champ est fourni
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
      message: 'Au moins un champ doit être fourni pour la modification',
    })
  }

  // Si oeId est fourni, vérifier que l'OE existe
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
        message: 'L\'OE spécifié n\'existe pas.',
      })
    }
  }

  // Si auditorId est fourni, vérifier que l'auditeur existe et a le rôle AUDITOR
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
        message: 'L\'auditeur spécifié n\'existe pas.',
      })
    }

    if (auditor.role !== Role.AUDITOR) {
      throw createError({
        statusCode: 400,
        message: 'L\'account spécifié doit avoir le rôle AUDITOR.',
      })
    }
  }

  // Préparer les données à mettre à jour
  const updateData: Partial<UpdateAuditBody> = {}

  if (oeId !== undefined) updateData.oeId = oeId
  if (auditorId !== undefined) updateData.auditorId = auditorId
  if (plannedDate !== undefined) updateData.plannedDate = plannedDate
  if (actualDate !== undefined) updateData.actualDate = actualDate
  if (score !== undefined) updateData.score = score
  if (labelingOpinion !== undefined) updateData.labelingOpinion = labelingOpinion

  // Mettre à jour l'audit
  const [updatedAudit] = await db
    .update(audits)
    .set(forUpdate(event, updateData))
    .where(eq(audits.id, auditIdInt))
    .returning()

  // Retourner l'audit mis à jour
  return {
    data: updatedAudit,
  }
})
