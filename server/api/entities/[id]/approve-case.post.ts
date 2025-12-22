import { eq, desc, isNull } from 'drizzle-orm'
import { db } from '~~/server/database'
import { entities, audits } from '~~/server/database/schema'
import { forUpdate } from '~~/server/utils/tracking'
import { recordEvent, getLatestEvent } from '~~/server/services/events'
import { auditStateMachine } from '~~/server/state-machine'
import { AuditType } from '#shared/types/enums'

export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur est connecté
  const { user: currentUser } = await requireUserSession(event)

  // Vérifier que le rôle est FEEF
  if (currentUser.role !== Role.FEEF) {
    throw createError({
      statusCode: 403,
      message: 'Seul un administrateur FEEF peut approuver un dossier',
    })
  }

  // Récupérer l'ID de l'entité depuis l'URL
  const entityId = getRouterParam(event, 'id')

  if (!entityId) {
    throw createError({
      statusCode: 400,
      message: 'ID de l\'entité manquant',
    })
  }

  const entityIdInt = parseInt(entityId)

  if (isNaN(entityIdInt)) {
    throw createError({
      statusCode: 400,
      message: 'ID de l\'entité invalide',
    })
  }

  // Vérifier que l'entité existe et n'est pas supprimée
  const entity = await db.query.entities.findFirst({
    where: eq(entities.id, entityIdInt),
  })

  if (!entity) {
    throw createError({
      statusCode: 404,
      message: 'Entité non trouvée',
    })
  }

  if (entity.deletedAt) {
    throw createError({
      statusCode: 400,
      message: 'Cette entité a été supprimée et ne peut plus être approuvée',
    })
  }

  // Récupérer le dernier audit de l'entité
  const latestAudit = await db.query.audits.findFirst({
    where: (audits, { eq, isNull, and }) => and(
      eq(audits.entityId, entityIdInt),
      isNull(audits.deletedAt)
    ),
    orderBy: (audits, { desc }) => [desc(audits.createdAt)],
  })

  if (!latestAudit) {
    throw createError({
      statusCode: 400,
      message: 'Aucun audit trouvé pour cette entité',
    })
  }

  // Vérifier que le dossier a bien été soumis
  const submittedEvent = await getLatestEvent('AUDIT_CASE_SUBMITTED', { auditId: latestAudit.id })
  if (!submittedEvent) {
    throw createError({
      statusCode: 400,
      message: 'Le dossier doit être soumis avant de pouvoir être approuvé',
    })
  }

  // Vérifier que l'audit est bien au statut PENDING_CASE_APPROVAL
  if (latestAudit.status !== AuditStatus.PENDING_CASE_APPROVAL) {
    throw createError({
      statusCode: 400,
      message: `Le dossier ne peut pas être approuvé depuis le statut actuel (${latestAudit.status}). Statut attendu: PENDING_CASE_APPROVAL`,
    })
  }

  // Vérifier que le dossier n'a pas déjà été approuvé (double check avec les événements)
  const approvedEvent = await getLatestEvent('AUDIT_CASE_APPROVED', { auditId: latestAudit.id })
  if (approvedEvent) {
    throw createError({
      statusCode: 400,
      message: 'Le dossier a déjà été approuvé le ' + new Date(approvedEvent.performedAt).toLocaleDateString('fr-FR'),
    })
  }

  // Enregistrer l'événement d'approbation AVANT la transition
  await recordEvent(event, {
    type: 'AUDIT_CASE_APPROVED',
    auditId: latestAudit.id,
    entityId: latestAudit.entityId,
    metadata: {
      previousStatus: latestAudit.status,
      timestamp: new Date(),
    },
  })

  // Déterminer quelle transition utiliser selon les guards de la state machine
  let transitionName: string

  if (!entity.oeId) {
    // Pas d'OE assigné → choisir un OE
    transitionName = 'approve_without_oe'
  } else if (latestAudit.type === AuditType.MONITORING) {
    // Audit de SUIVI avec OE → planification directe
    transitionName = 'approve_with_oe_monitoring'
  } else {
    // Audit INITIAL ou RENEWAL avec OE → l'OE doit accepter
    transitionName = 'approve_with_oe_needs_acceptance'
  }

  console.log(`[approve-case] Audit type: ${latestAudit.type}, OE: ${entity.oeId ? 'assigned' : 'none'}, Transition: ${transitionName}`)

  // Déclencher la transition via la state machine
  await auditStateMachine.transition(latestAudit, transitionName, event)

  // Récupérer l'audit mis à jour après la transition
  const updatedAudit = await db.query.audits.findFirst({
    where: eq(audits.id, latestAudit.id),
  })

  if (!updatedAudit) {
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la récupération de l\'audit mis à jour',
    })
  }

  // Compléter les actions en attente
  const { checkAndCompleteAllPendingActions } = await import('~~/server/services/actions')
  await checkAndCompleteAllPendingActions(updatedAudit, currentUser.id, event)

  // Retourner l'audit mis à jour
  return {
    data: updatedAudit,
    message: 'Dossier approuvé avec succès',
  }
})
