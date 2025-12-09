import { db } from '~~/server/database'
import { audits } from '~~/server/database/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { Role } from '#shared/types/roles'

export default defineEventHandler(async (event) => {
  // Authentification
  const { user } = await requireUserSession(event)

  // Récupérer l'ID de l'audit depuis l'URL
  const auditId = Number(event.context.params?.id)

  if (isNaN(auditId)) {
    throw createError({
      statusCode: 400,
      message: 'ID d\'audit invalide',
    })
  }

  // Récupérer l'audit avec ses relations
  const audit = await db.query.audits.findFirst({
    where: and(
      eq(audits.id, auditId),
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

  if (audit.entity.deletedAt) {
    throw createError({
      statusCode: 404,
      message: 'Entité non trouvée',
    })
  }

  // Autorisation: Seuls FEEF et OE (celui assigné à l'audit) peuvent valider
  if (user.role === Role.FEEF) {
    // FEEF a accès à tout
  } else if (user.role === Role.OE) {
    // Vérifier que c'est l'OE assigné à l'audit
    if (!audit.oeId || audit.oeId !== user.oeId) {
      throw createError({
        statusCode: 403,
        message: 'Seul l\'OE assigné à cet audit peut valider le plan correctif',
      })
    }
  } else {
    throw createError({
      statusCode: 403,
      message: 'Vous n\'avez pas la permission de valider le plan correctif',
    })
  }

  // Vérifier que le plan n'est pas déjà validé
  if (audit.correctivePlanValidatedAt) {
    throw createError({
      statusCode: 400,
      message: 'Le plan d\'action correctif a déjà été validé',
    })
  }

  // Mettre à jour l'audit avec la validation
  await db
    .update(audits)
    .set({
      correctivePlanValidatedAt: new Date(),
      correctivePlanValidatedBy: user.id,
      status: 'PENDING_OE_OPINION', // Transition vers la prochaine étape
      updatedBy: user.id,
      updatedAt: new Date(),
    })
    .where(eq(audits.id, auditId))

  // Récupérer l'audit mis à jour avec toutes ses relations
  const auditWithRelations = await db.query.audits.findFirst({
    where: eq(audits.id, auditId),
    with: {
      entity: true,
      oe: true,
      auditor: {
        columns: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
        },
      },
      correctivePlanValidatedByAccount: {
        columns: {
          id: true,
          firstname: true,
          lastname: true,
        },
      },
    },
  })

  if (!auditWithRelations) {
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la récupération de l\'audit mis à jour',
    })
  }

  // Create actions for the new status
  const { createActionsForAuditStatus, checkAndCompleteAllPendingActions } = await import('~~/server/services/actions')
  await createActionsForAuditStatus(auditWithRelations, 'PENDING_OE_OPINION', event)

  // Check and complete all pending actions based on audit state
  await checkAndCompleteAllPendingActions(auditWithRelations, user.id, event)

  return {
    data: auditWithRelations,
  }
})
