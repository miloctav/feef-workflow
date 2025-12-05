import { eq, and, isNull } from 'drizzle-orm'
import { db } from '~~/server/database'
import { entities, accountsToEntities } from '~~/server/database/schema'
import { Role } from '#shared/types/roles'

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
  if (entity.documentaryReviewReadyAt) {
    throw createError({
      statusCode: 400,
      message: 'La revue documentaire a déjà été marquée comme prête',
    })
  }


  // Mettre à jour l'entité
  const [updatedEntity] = await db
    .update(entities)
    .set({
      documentaryReviewReadyAt: new Date(),
      documentaryReviewReadyBy: currentUser.id,
      updatedBy: currentUser.id,
      updatedAt: new Date(),
    })
    .where(eq(entities.id, entityIdInt))
    .returning()

  // Déclencher la complétion des actions liées à la revue documentaire prête
  const { detectAndCompleteActionsForEntityField } = await import('~~/server/services/actions')
  await detectAndCompleteActionsForEntityField(
    { ...entity, ...updatedEntity },
    'documentaryReviewReadyAt',
    currentUser.id,
    event
  )

  // Récupérer l'entité mise à jour avec les relations pour l'account
  const entityWithRelations = await db.query.entities.findFirst({
    where: eq(entities.id, entityIdInt),
    with: {
      documentaryReviewReadyByAccount: {
        columns: {
          id: true,
          firstname: true,
          lastname: true,
        },
      },
    },
  })

  // Retourner l'entité mise à jour
  return {
    data: entityWithRelations,
  }
})
