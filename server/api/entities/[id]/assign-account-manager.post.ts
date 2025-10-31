import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~~/server/database'
import { entities, accounts } from '~~/server/database/schema'
import { forUpdate } from '~~/server/utils/tracking'
import { requireEntityAccess, AccessType } from '~~/server/utils/authorization'

// Schema de validation pour le body
const assignAccountManagerSchema = z.object({
  accountManagerId: z.number().int().positive(),
})

export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur est connecté
  const { user: currentUser } = await requireUserSession(event)

  // Vérifier que le rôle est OE ADMIN
  if (currentUser.role !== Role.OE || currentUser.oeRole !== OERole.ADMIN) {
    throw createError({
      statusCode: 403,
      message: 'Seul un administrateur OE peut affecter un chargé d\'affaire',
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

  // Parser et valider le body
  const body = await readBody(event)
  const parseResult = assignAccountManagerSchema.safeParse(body)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      message: 'Données invalides: accountManagerId requis',
    })
  }

  const { accountManagerId } = parseResult.data

  // Vérifier l'accès à l'entité avec requireEntityAccess
  await requireEntityAccess({
    user: currentUser,
    entityId: entityIdInt,
    accessType: AccessType.WRITE,
    errorMessage: 'Vous n\'avez pas les droits pour affecter un chargé d\'affaire à cette entité',
  })

  // Récupérer l'entité
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

  // Récupérer le compte du chargé d'affaire
  const accountManager = await db.query.accounts.findFirst({
    where: and(
      eq(accounts.id, accountManagerId),
      isNull(accounts.deletedAt)
    ),
  })

  if (!accountManager) {
    throw createError({
      statusCode: 404,
      message: 'Chargé d\'affaire non trouvé',
    })
  }

  // Vérifier que le compte a le bon rôle
  if (accountManager.role !== Role.OE || accountManager.oeRole !== OERole.ACCOUNT_MANAGER) {
    throw createError({
      statusCode: 400,
      message: 'Le compte sélectionné n\'est pas un chargé d\'affaire',
    })
  }

  // Vérifier que le chargé d'affaire appartient au même OE que l'entité
  if (accountManager.oeId !== entity.oeId) {
    throw createError({
      statusCode: 400,
      message: 'Le chargé d\'affaire doit appartenir au même organisme évaluateur que l\'entité',
    })
  }

  // Mettre à jour l'entité avec le nouveau chargé d'affaire
  await db
    .update(entities)
    .set(forUpdate(event, {
      accountManagerId,
    }))
    .where(eq(entities.id, entityIdInt))

  // Récupérer l'entité mise à jour avec la relation accountManager
  const updatedEntity = await db.query.entities.findFirst({
    where: eq(entities.id, entityIdInt),
    with: {
      accountManager: {
        columns: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
        },
      },
    },
  })

  // Retourner l'entité mise à jour
  return {
    data: updatedEntity,
  }
})
