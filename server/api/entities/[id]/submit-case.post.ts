import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { entities } from '~~/server/database/schema'
import { forUpdate } from '~~/server/utils/tracking'

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

  // Vérifier que le dossier n'a pas déjà été soumis
  if (entity.caseSubmittedAt) {
    throw createError({
      statusCode: 400,
      message: 'Le dossier a déjà été soumis le ' + new Date(entity.caseSubmittedAt).toLocaleDateString('fr-FR'),
    })
  }

  // Mettre à jour l'entité avec les informations de soumission
  const [updatedEntity] = await db
    .update(entities)
    .set(forUpdate(event, {
      caseSubmittedAt: new Date(),
      caseSubmittedBy: currentUser.id,
    }))
    .where(eq(entities.id, entityIdInt))
    .returning()

  // Retourner l'entité mise à jour
  return {
    data: updatedEntity,
  }
})
