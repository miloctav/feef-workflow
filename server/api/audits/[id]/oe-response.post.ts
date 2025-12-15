import { z } from 'zod'
import { eq, and, isNull } from 'drizzle-orm'
import { audits } from '~~/server/database/schema'
import { db } from '~~/server/database'
import { AuditStatus } from '~~/shared/types/enums'
import { Role } from '~~/shared/types/roles'
import { auditStateMachine } from '~~/server/state-machine'
import { forUpdate } from '~~/server/utils/tracking'
import { detectAndCompleteActionsForAuditField } from '~~/server/services/actions'

const oeResponseSchema = z.object({
  accepted: z.boolean(),
  refusalReason: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const auditId = getRouterParam(event, 'id')

  // Validation du payload
  const body = await readBody(event)
  const validation = oeResponseSchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Données invalides',
      data: validation.error.issues,
    })
  }

  const { accepted, refusalReason } = validation.data

  // Vérifier que l'utilisateur est bien un OE
  if (user.role !== Role.OE) {
    throw createError({
      statusCode: 403,
      message: 'Seuls les OE peuvent accepter ou refuser un audit',
    })
  }

  if (!auditId) {
    throw createError({
      statusCode: 400,
      message: 'ID d\'audit manquant',
    })
  }

  const auditIdInt = parseInt(auditId)
  if (isNaN(auditIdInt)) {
    throw createError({
      statusCode: 400,
      message: 'ID d\'audit invalide',
    })
  }

  // Récupérer l'audit avec ses relations
  const audit = await db.query.audits.findFirst({
    where: and(
      eq(audits.id, auditIdInt),
      isNull(audits.deletedAt)
    ),
    with: {
      entity: true,
      oe: true,
    },
  })

  if (!audit) {
    throw createError({
      statusCode: 404,
      message: 'Audit non trouvé',
    })
  }

  // Vérifier que l'audit est bien au statut PENDING_OE_ACCEPTANCE
  if (audit.status !== AuditStatus.PENDING_OE_ACCEPTANCE) {
    throw createError({
      statusCode: 400,
      message: `Cet audit ne peut pas être accepté/refusé (statut actuel: ${audit.status})`,
    })
  }

  // Vérifier que l'OE connecté est bien celui assigné à cet audit
  if (audit.oeId !== user.oeId) {
    throw createError({
      statusCode: 403,
      message: 'Vous n\'êtes pas l\'OE assigné à cet audit',
    })
  }

  // Validation métier : si refus, le commentaire est obligatoire
  if (!accepted && (!refusalReason || refusalReason.trim().length === 0)) {
    throw createError({
      statusCode: 400,
      message: 'Un commentaire est obligatoire en cas de refus',
    })
  }

  // Mise à jour de l'audit avec la réponse de l'OE
  await db.update(audits)
    .set(forUpdate(event, {
      oeAccepted: accepted,
      oeResponseAt: new Date(),
      oeResponseBy: user.id,
      oeRefusalReason: accepted ? null : refusalReason,
    }))
    .where(eq(audits.id, auditIdInt))

  // Récupérer l'audit mis à jour
  const updatedAudit = await db.query.audits.findFirst({
    where: eq(audits.id, auditIdInt),
  })

  if (!updatedAudit) {
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la récupération de l\'audit',
    })
  }

  // Détecter et compléter les actions liées au champ oeResponseAt
  await detectAndCompleteActionsForAuditField(
    updatedAudit,
    'oeResponseAt',
    user.id,
    event
  )

  // Déclencher l'auto-transition via la state machine
  await auditStateMachine.checkAutoTransition(updatedAudit, event)

  // Récupérer l'audit après transition pour retourner le nouveau statut
  const finalAudit = await db.query.audits.findFirst({
    where: eq(audits.id, auditIdInt),
    with: {
      entity: true,
      oe: true,
    },
  })

  return {
    data: finalAudit,
    message: accepted
      ? 'Audit accepté avec succès'
      : 'Audit refusé. Un nouvel audit a été créé pour l\'entité.',
  }
})
