import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { entities } from '~~/server/database/schema'
import { forUpdate } from '~~/server/utils/tracking'

export default defineEventHandler(async (event) => {
  // Récupérer l'utilisateur connecté
  const { user: currentUser } = await requireUserSession(event)

  // Récupérer l'ID de l'entité
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

  // Vérifications d'autorisation
  if (currentUser.role === Role.ENTITY) {
    // Une entité ne peut modifier que son propre partage documentaire
    if (currentUser.currentEntityId !== entityIdInt) {
      throw createError({
        statusCode: 403,
        message: 'Vous ne pouvez modifier que le partage documentaire de votre propre entité',
      })
    }
  } else if (currentUser.role === Role.FEEF) {
    // FEEF peut modifier n'importe quelle entité
    // Pas de restriction supplémentaire
  } else {
    // Autres rôles (OE, AUDITOR) ne peuvent pas modifier le partage documentaire
    throw createError({
      statusCode: 403,
      message: 'Vous n\'avez pas l\'autorisation de modifier le partage documentaire',
    })
  }

  // Vérifier que l'entité existe
  const existingEntity = await db.query.entities.findFirst({
    where: eq(entities.id, entityIdInt),
    columns: {
      id: true,
      name: true,
      oeId: true,
      allowOeDocumentsAccess: true,
    }
  })

  if (!existingEntity) {
    throw createError({
      statusCode: 404,
      message: 'Entité non trouvée',
    })
  }

  // Vérifier qu'un OE est assigné
  if (!existingEntity.oeId) {
    throw createError({
      statusCode: 400,
      message: 'Aucun OE n\'est assigné à cette entité. Veuillez d\'abord assigner un OE.',
    })
  }

  // Toggle la valeur
  const newValue = !existingEntity.allowOeDocumentsAccess

  console.log(`Toggle du partage documentaire pour l'entité ID ${entityIdInt}: ${existingEntity.allowOeDocumentsAccess} → ${newValue}`)

  // Mettre à jour l'entité
  await db
    .update(entities)
    .set(forUpdate(event, {
      allowOeDocumentsAccess: newValue
    }))
    .where(eq(entities.id, entityIdInt))

  // Retourner l'entité mise à jour avec les relations
  const entityWithRelations = await db.query.entities.findFirst({
    where: eq(entities.id, entityIdInt),
    with: {
      oe: {
        columns: {
          id: true,
          name: true,
        }
      },
      accountManager: {
        columns: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
        }
      }
    }
  })

  return {
    data: entityWithRelations,
    message: newValue
      ? `L'OE ${entityWithRelations?.oe?.name} peut désormais consulter vos documents`
      : `L'accès aux documents a été retiré pour l'OE ${entityWithRelations?.oe?.name}`,
  }
})
