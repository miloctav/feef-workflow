import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { accounts } from '~~/server/database/schema'
import { verifyEntityAccess, getEntityContext } from '~~/server/utils/entity-context'
import { Role } from '#shared/types/roles'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)

  const { entityId } = body

  // Validation
  if (!entityId || typeof entityId !== 'number') {
    throw createError({
      statusCode: 400,
      message: 'entityId requis',
    })
  }

  // Vérifier que l'utilisateur est de type ENTITY
  if (session.user.role !== Role.ENTITY) {
    throw createError({
      statusCode: 403,
      message: 'Cette action est réservée aux comptes de type ENTITY',
    })
  }

  // Vérifier que l'utilisateur a accès à cette entité
  const hasAccess = await verifyEntityAccess(session.user.id, entityId)
  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      message: 'Vous n\'avez pas accès à cette entité',
    })
  }

  // Récupérer le contexte de la nouvelle entité
  const entityContext = await getEntityContext(session.user.id, entityId)
  if (!entityContext) {
    throw createError({
      statusCode: 404,
      message: 'Entité introuvable',
    })
  }

  // Mettre à jour currentEntityId en DB
  await db.update(accounts)
    .set({ currentEntityId: entityId })
    .where(eq(accounts.id, session.user.id))

  // Mettre à jour la session avec le nouveau contexte
  await replaceUserSession(event, {
    user: {
      ...session.user,
      currentEntityId: entityId,
      currentEntityRole: entityContext.role,
    },
  })

  return {
    data: {
      entityId,
      entityRole: entityContext.role,
      entity: entityContext.entity,
    },
  }
})
