import { eq, and, isNull } from 'drizzle-orm'
import { db } from '~~/server/database'
import { entities, accountsToEntities } from '~~/server/database/schema'
import { Role } from '#shared/types/roles'
import { recordEvent, getLatestEvent } from '~~/server/services/events'

export default defineEventHandler(async (event) => {
  // Authentification - l'utilisateur doit être connecté
  const { user: currentUser } = await requireUserSession(event)

  // Vérifier que l'utilisateur est bien un membre d'entity
  if (currentUser.role !== Role.ENTITY) {
    throw createError({
      statusCode: 403,
      message: 'Seuls les membres d\'une entité peuvent marquer la revue documentaire comme prête',
    })
  }

  // Récupérer l'ID de l'entité depuis les paramètres de route
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

  // Récupérer l'entité avec toutes les vérifications
  const entity = await db.query.entities.findFirst({
    where: and(
      eq(entities.id, entityIdInt),
      isNull(entities.deletedAt)
    ),
  })

  if (!entity) {
    throw createError({
      statusCode: 404,
      message: 'Entité non trouvée',
    })
  }

  // Vérifier que l'utilisateur est bien membre de cette entity
  const accountToEntity = await db.query.accountsToEntities.findFirst({
    where: and(
      eq(accountsToEntities.accountId, currentUser.id),
      eq(accountsToEntities.entityId, entityIdInt)
    ),
  })

  if (!accountToEntity) {
    throw createError({
      statusCode: 403,
      message: 'Vous n\'êtes pas membre de cette entité',
    })
  }

  // Vérifier que l'entity est en mode MASTER
  if (entity.mode !== EntityMode.MASTER) {
    throw createError({
      statusCode: 400,
      message: 'Seules les entités en mode MASTER peuvent marquer leur revue documentaire comme prête',
    })
  }


  // (Vérification retirée : caseSubmittedAt n'existe pas sur entity)

  // Vérifier que documentaryReviewReadyAt est null (pas déjà marqué)
  const readyEvent = await getLatestEvent('ENTITY_DOCUMENTARY_REVIEW_READY', { entityId: entity.id })
  if (readyEvent) {
    throw createError({
      statusCode: 400,
      message: 'La revue documentaire a déjà été marquée comme prête',
    })
  }


  // Mettre à jour l'entité
  await db
    .update(entities)
    .set({
      updatedBy: currentUser.id,
      updatedAt: new Date(),
    })
    .where(eq(entities.id, entityIdInt))

  // Enregistrer l'événement de revue documentaire prête
  await recordEvent(event, {
    type: 'ENTITY_DOCUMENTARY_REVIEW_READY',
    entityId: entityIdInt,
    metadata: {
      timestamp: new Date(),
    },
  })

  // Récupérer l'entité mise à jour
  const entityWithRelations = await db.query.entities.findFirst({
    where: eq(entities.id, entityIdInt),
  })

  if (!entityWithRelations) {
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la récupération de l\'entité mise à jour',
    })
  }

  // Check and complete all pending actions for this entity
  // This includes both entity-level actions AND audit-level actions
  // (e.g., ENTITY_MARK_DOCUMENTARY_REVIEW_READY which is linked to an audit)
  const { checkAndCompleteAllPendingActionsForEntity, checkAndCompleteAllPendingActions } = await import('~~/server/services/actions')

  // Check entity-level actions (without auditId)
  await checkAndCompleteAllPendingActionsForEntity(entityWithRelations, currentUser.id, event)

  // Also check the most recent audit for this entity
  // (important for ENTITY_MARK_DOCUMENTARY_REVIEW_READY which has an auditId)
  const { audits } = await import('~~/server/database/schema')
  const { desc } = await import('drizzle-orm')

  const latestAudit = await db.query.audits.findFirst({
    where: and(
      eq(audits.entityId, entityIdInt),
      isNull(audits.deletedAt)
    ),
    orderBy: [desc(audits.createdAt)]
  })

  if (latestAudit) {
    await checkAndCompleteAllPendingActions(latestAudit, currentUser.id, event)
  }

  // Retourner l'entité mise à jour
  return {
    data: entityWithRelations,
  }
})
