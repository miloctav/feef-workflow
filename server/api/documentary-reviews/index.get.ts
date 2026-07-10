import { db } from '~~/server/database'
import { documentaryReviews, documentVersions } from '~~/server/database/schema'
import { eq, and, isNull, inArray, desc } from 'drizzle-orm'
import { requireEntityAccess, AccessType } from '~~/server/utils/authorization'
import { getAccessibleDocumentaryReviewCategories } from '#shared/types/enums'

export default defineEventHandler(async (event) => {
  // Authentification
  const { user } = await requireUserSession(event)

  // Récupérer entityId depuis query params
  const query = getQuery(event)
  const entityId = query.entityId ? Number(query.entityId) : null

  if (!entityId) {
    throw createError({
      statusCode: 400,
      message: 'entityId est obligatoire',
    })
  }

  // Vérifier l'accès à l'entité
  await requireEntityAccess({
    user,
    entityId,
    accessType: AccessType.READ,
    errorMessage: 'Vous n\'avez pas accès aux documents de cette entité'
  })

  // Déterminer les catégories accessibles selon le rôle de l'utilisateur
  const accessibleCategories = getAccessibleDocumentaryReviewCategories(user.role)

  // Récupérer les documentary reviews de l'entité (excluant les soft-deleted, filtrés par catégories accessibles)
  // Les versions sont incluses pour permettre au front d'afficher le statut de chaque document
  // (déposé, demande en attente, manquant) sans requête supplémentaire par document
  const reviews = await db.query.documentaryReviews.findMany({
    where: and(
      eq(documentaryReviews.entityId, entityId),
      isNull(documentaryReviews.deletedAt),
      inArray(documentaryReviews.category, accessibleCategories)
    ),
    with: {
      documentVersions: {
        orderBy: [desc(documentVersions.uploadAt)],
        with: {
          uploadByAccount: {
            columns: { id: true, firstname: true, lastname: true },
          },
          askedByAccount: {
            columns: { id: true, firstname: true, lastname: true },
          },
        },
      },
    },
  })

  return {
    data: reviews,
  }
})
