import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { audits, entities, oes, accounts } from '~~/server/database/schema'
import { forInsert } from '~~/server/utils/tracking'

interface CreateAuditBody {
  entityId: number
  type: typeof AuditType[keyof typeof AuditType]
  oeId?: number
  auditorId?: number
  plannedDate?: string
  actualDate?: string
  score?: number
  labelingOpinion?: any
}

/**
 * POST /api/audits
 *
 * Cr�e un nouvel audit
 *
 * Champs obligatoires:
 * - entityId: ID de l'entit� audit�e
 * - type: type d'audit (INITIAL, RENEWAL, MONITORING)
 *
 * Champs optionnels:
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
  // V�rifier que l'utilisateur est authentifi� et a le r�le FEEF ou OE
  const { user: currentUser } = await requireUserSession(event)

  if (currentUser.role !== Role.FEEF && currentUser.role !== Role.OE) {
    throw createError({
      statusCode: 403,
      message: 'Acc�s refus�. Seuls les r�les FEEF et OE peuvent cr�er des audits.',
    })
  }

  const body = await readBody<CreateAuditBody>(event)

  const { entityId, type, oeId, auditorId, plannedDate, actualDate, score, labelingOpinion } = body

  // Validation des champs obligatoires
  if (!entityId) {
    throw createError({
      statusCode: 400,
      message: 'entityId est requis.',
    })
  }

  if (!type) {
    throw createError({
      statusCode: 400,
      message: 'type est requis.',
    })
  }

  // Validation de la valeur d'enum pour type
  if (!Object.values(AuditType).includes(type)) {
    throw createError({
      statusCode: 400,
      message: 'Type invalide. Les valeurs autoris�es sont: INITIAL, RENEWAL, MONITORING.',
    })
  }

  // V�rifier que l'entit� existe
  const entity = await db.query.entities.findFirst({
    where: eq(entities.id, entityId),
    columns: {
      id: true,
      name: true,
      mode: true,
    },
  })

  if (!entity) {
    throw createError({
      statusCode: 404,
      message: 'L\'entité spécifiée n\'existe pas.',
    })
  }

  if(entity.mode === EntityMode.FOLLOWER) {
    throw createError({
      statusCode: 400,
      message: 'Impossible de créer un audit pour une entité en mode FOLLOWER.',
    })
  }

  // Si oeId est fourni, v�rifier que l'OE existe
  if (oeId) {
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
  if (auditorId) {
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

  // Construire l'objet de cr�ation en n'incluant que les champs fournis
  const insertData: any = {
    entityId,
    type,
  }

  insertData.oeId = oeId
  insertData.auditorId = auditorId

  if (plannedDate !== undefined) insertData.plannedDate = plannedDate
  if (actualDate !== undefined) insertData.actualDate = actualDate
  if (score !== undefined) insertData.score = score
  if (labelingOpinion !== undefined) insertData.labelingOpinion = labelingOpinion

  const [newAudit] = await db.insert(audits).values(forInsert(event, insertData)).returning()

  // Créer les actions pour le statut initial de l'audit (par défaut: PLANNING)
  const { createActionsForAuditStatus } = await import('~~/server/services/actions')
  await createActionsForAuditStatus(newAudit, newAudit.status, event)

  return {
    data: newAudit,
  }
})
