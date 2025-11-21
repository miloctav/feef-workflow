import { eq, and, isNull } from "drizzle-orm"
import { db } from "~~/server/database"
import { entities } from "~~/server/database/schema"
import { EntityType, EntityMode } from "~~/shared/types/enums"
import { forUpdate } from "~~/server/utils/tracking"

interface LinkEntityBody {
  parentEntityId: number
}

export default defineEventHandler(async (event) => {
  const { user: currentUser } = await requireUserSession(event)

  // Seul FEEF peut lier des entités existantes
  if (currentUser.role !== 'FEEF') {
    throw createError({
      statusCode: 403,
      message: 'Accès refusé. Seul le rôle FEEF peut lier des entités.'
    })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'ID de l\'entité requis'
    })
  }

  const entityId = parseInt(id)
  const body = await readBody<LinkEntityBody>(event)
  const { parentEntityId } = body

  if (!parentEntityId) {
    throw createError({
      statusCode: 400,
      message: 'parentEntityId requis'
    })
  }

  // Récupérer l'entité à lier (doit être FOLLOWER)
  const entityToLink = await db.query.entities.findFirst({
    where: and(
      eq(entities.id, entityId),
      isNull(entities.deletedAt)
    ),
    columns: {
      id: true,
      type: true,
      mode: true,
      parentGroupId: true
    }
  })

  if (!entityToLink) {
    throw createError({
      statusCode: 404,
      message: 'Entité non trouvée'
    })
  }

  if (entityToLink.mode !== EntityMode.FOLLOWER) {
    throw createError({
      statusCode: 400,
      message: 'Seules les entités suiveuses peuvent être liées'
    })
  }

  // Récupérer l'entité parente (master)
  const parentEntity = await db.query.entities.findFirst({
    where: and(
      eq(entities.id, parentEntityId),
      isNull(entities.deletedAt)
    ),
    columns: {
      id: true,
      type: true,
      mode: true,
      parentGroupId: true
    }
  })

  if (!parentEntity) {
    throw createError({
      statusCode: 404,
      message: 'Entité parente non trouvée'
    })
  }

  if (parentEntity.mode !== EntityMode.MASTER) {
    throw createError({
      statusCode: 400,
      message: 'L\'entité parente doit être en mode MASTER'
    })
  }

  // Vérifier la compatibilité des types
  // GROUP master → COMPANY follower
  // COMPANY master → GROUP follower
  if (parentEntity.type === EntityType.GROUP) {
    if (entityToLink.type !== EntityType.COMPANY) {
      throw createError({
        statusCode: 400,
        message: 'Un groupe ne peut être lié qu\'à des entreprises suiveuses'
      })
    }
    // Vérifier que l'entité n'est pas déjà liée
    if (entityToLink.parentGroupId) {
      throw createError({
        statusCode: 400,
        message: 'Cette entreprise est déjà liée à un groupe'
      })
    }
    // Lier : COMPANY.parentGroupId = GROUP.id
    await db.update(entities)
      .set(forUpdate(event, { parentGroupId: parentEntity.id }))
      .where(eq(entities.id, entityToLink.id))
  } else {
    // COMPANY master → GROUP follower
    if (entityToLink.type !== EntityType.GROUP) {
      throw createError({
        statusCode: 400,
        message: 'Une entreprise ne peut être liée qu\'à un groupe suiveur'
      })
    }
    // Vérifier que la COMPANY master n'est pas déjà liée à un groupe
    if (parentEntity.parentGroupId) {
      throw createError({
        statusCode: 400,
        message: 'Cette entreprise est déjà liée à un groupe'
      })
    }
    // Lier : COMPANY.parentGroupId = GROUP.id (le master pointe vers le follower)
    await db.update(entities)
      .set(forUpdate(event, { parentGroupId: entityToLink.id }))
      .where(eq(entities.id, parentEntity.id))
  }

  return {
    data: { success: true }
  }
})
