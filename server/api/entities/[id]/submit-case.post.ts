import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { entities, audits } from '~~/server/database/schema'
import { forUpdate } from '~~/server/utils/tracking'
import { createAuditForEntity } from '~~/server/utils/audit'

export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur est connecté
  const { user: currentUser } = await requireUserSession(event)

  // Vérifier que le rôle est ENTITY
  if (currentUser.role !== Role.ENTITY) {
    throw createError({
      statusCode: 403,
      message: 'Seul un compte ENTITY peut soumettre un dossier',
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

  // Vérifier que l'utilisateur a une entité sélectionnée
  if (!currentUser.currentEntityId) {
    throw createError({
      statusCode: 400,
      message: 'Aucune entité sélectionnée. Veuillez sélectionner une entité avant de soumettre un dossier.',
    })
  }

  // Vérifier que l'ID de la route correspond à l'entité actuellement sélectionnée
  if (entityIdInt !== currentUser.currentEntityId) {
    throw createError({
      statusCode: 403,
      message: 'Vous ne pouvez soumettre le dossier que de l\'entité actuellement sélectionnée',
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

  if(entity.mode === EntityMode.FOLLOWER){
    throw createError({
      statusCode: 403,
      message: 'Les entités en mode "Suiveur" ne peuvent pas soumettre de dossier',
    })
  }

  if (entity.deletedAt) {
    throw createError({
      statusCode: 400,
      message: 'Cette entité a été supprimée et ne peut plus soumettre de dossier',
    })
  }

  // Récupérer la date prévisionnelle depuis le body (optionnelle)
  const body = await readBody(event)
  const plannedDate = body?.plannedDate || null

  // Créer un nouvel audit pour l'entité
  const audit = await createAuditForEntity(entityIdInt, event, plannedDate)

  // Créer les actions pour le statut initial de l'audit
  const { createActionsForAuditStatus, checkAndCompleteAllPendingActions } = await import('~~/server/services/actions')
  await createActionsForAuditStatus(audit, audit.status, event)

  // Mettre à jour l'audit avec les informations de soumission
  await db
    .update(audits)
    .set(forUpdate(event, {
      caseSubmittedAt: new Date(),
      caseSubmittedBy: currentUser.id,
    }))
    .where(eq(audits.id, audit.id))

  // Récupérer l'audit mis à jour
  const updatedAudit = await db.query.audits.findFirst({
    where: eq(audits.id, audit.id),
  })

  if (!updatedAudit) {
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la récupération de l\'audit mis à jour',
    })
  }

  // Check and complete all pending actions based on audit state
  await checkAndCompleteAllPendingActions(updatedAudit, currentUser.id, event)

  // Retourner l'audit créé
  return {
    data: updatedAudit,
  }
})
