import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { entities } from '~~/server/database/schema'
import { forUpdate } from '~~/server/utils/tracking'
import { createAuditForEntity } from '~~/server/utils/audit'

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

  // Vérifier que le dossier a bien été soumis
  if (!entity.caseSubmittedAt) {
    throw createError({
      statusCode: 400,
      message: 'Le dossier doit être soumis avant de pouvoir être approuvé',
    })
  }

  // Vérifier que le dossier n'a pas déjà été approuvé
  if (entity.caseApprovedAt) {
    throw createError({
      statusCode: 400,
      message: 'Le dossier a déjà été approuvé le ' + new Date(entity.caseApprovedAt).toLocaleDateString('fr-FR'),
    })
  }

  // Créer automatiquement un audit pour l'entité
  await createAuditForEntity(entityIdInt, event)

  // Mettre à jour l'entité avec les informations d'approbation
  const [updatedEntity] = await db
    .update(entities)
    .set(forUpdate(event, {
      caseApprovedAt: new Date(),
      caseApprovedBy: currentUser.id,
    }))
    .where(eq(entities.id, entityIdInt))
    .returning()

  // Retourner l'entité mise à jour
  return {
    data: updatedEntity,
  }
})
