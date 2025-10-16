import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { entities } from '~~/server/database/schema'

interface UpdateEntityBody {
  name?: string
  siren?: string
  siret?: string
  type?: typeof EntityType[keyof typeof EntityType]
  mode?: typeof EntityMode[keyof typeof EntityMode]
  parentGroupId?: number | null
  oeId?: number | null
  accountManagerId?: number | null
}

export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur connecté est FEEF
  const { user: currentUser } = await requireUserSession(event)

  if (currentUser.role !== Role.FEEF) {
    throw createError({
      statusCode: 403,
      message: 'Seul un administrateur FEEF peut modifier des entités',
    })
  }

  // Récupérer l'ID de l'entité à modifier
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

  // Vérifier que l'entité existe
  const existingEntity = await db.query.entities.findFirst({
    where: eq(entities.id, entityIdInt),
  })

  if (!existingEntity) {
    throw createError({
      statusCode: 404,
      message: 'Entité non trouvée',
    })
  }

  // Récupérer les données du corps de la requête
  const body = await readBody<UpdateEntityBody>(event)

  const { name, siren, siret, type, mode, parentGroupId, oeId, accountManagerId } = body

  // Vérifier qu'au moins un champ est fourni
  if (
    name === undefined &&
    siren === undefined &&
    siret === undefined &&
    type === undefined &&
    mode === undefined &&
    parentGroupId === undefined &&
    oeId === undefined &&
    accountManagerId === undefined
  ) {
    throw createError({
      statusCode: 400,
      message: 'Au moins un champ doit être fourni pour la modification',
    })
  }

  // Validation des valeurs d'enum si elles sont fournies
  if (type !== undefined && !Object.values(EntityType).includes(type)) {
    throw createError({
      statusCode: 400,
      message: 'Type invalide. Les valeurs autorisées sont: COMPANY, GROUP.',
    })
  }

  if (mode !== undefined && !Object.values(EntityMode).includes(mode)) {
    throw createError({
      statusCode: 400,
      message: 'Mode invalide. Les valeurs autorisées sont: MASTER, FOLLOWER.',
    })
  }

  // Si le SIREN est modifié, vérifier qu'il n'est pas déjà utilisé par une autre entité
  if (siren && siren !== existingEntity.siren) {
    const [sirenExists] = await db
      .select()
      .from(entities)
      .where(eq(entities.siren, siren))
      .limit(1)

    if (sirenExists) {
      throw createError({
        statusCode: 409,
        message: 'Une entité avec ce SIREN existe déjà',
      })
    }
  }

  // Si le SIRET est modifié, vérifier qu'il n'est pas déjà utilisé par une autre entité
  if (siret && siret !== existingEntity.siret) {
    const [siretExists] = await db
      .select()
      .from(entities)
      .where(eq(entities.siret, siret))
      .limit(1)

    if (siretExists) {
      throw createError({
        statusCode: 409,
        message: 'Une entité avec ce SIRET existe déjà',
      })
    }
  }

  // Déterminer le type et mode finaux (après modification)
  const finalType = type !== undefined ? type : existingEntity.type
  const finalMode = mode !== undefined ? mode : existingEntity.mode
  const finalParentGroupId = parentGroupId !== undefined ? parentGroupId : existingEntity.parentGroupId

  // Validation : si type=COMPANY et mode=FOLLOWER, parentGroupId est obligatoire
  if (finalType === EntityType.COMPANY && finalMode === EntityMode.FOLLOWER && !finalParentGroupId) {
    throw createError({
      statusCode: 400,
      message: 'Le parentGroupId est requis pour une entreprise en mode FOLLOWER.'
    })
  }

  // Si parentGroupId est fourni (et non null), vérifier que le groupe parent existe et est bien un GROUP
  if (parentGroupId !== undefined && parentGroupId !== null) {
    const parentGroup = await db.query.entities.findFirst({
      where: eq(entities.id, parentGroupId),
      columns: {
        id: true,
        type: true,
      }
    })

    if (!parentGroup) {
      throw createError({
        statusCode: 404,
        message: 'Le groupe parent spécifié n\'existe pas.'
      })
    }

    if (parentGroup.type !== EntityType.GROUP) {
      throw createError({
        statusCode: 400,
        message: 'Le parentGroupId doit correspondre à une entité de type GROUP.'
      })
    }
  }

  // Préparer les données à mettre à jour
  const updateData: Partial<UpdateEntityBody> = {}

  if (name !== undefined) updateData.name = name
  if (siren !== undefined) updateData.siren = siren
  if (siret !== undefined) updateData.siret = siret
  if (type !== undefined) updateData.type = type
  if (mode !== undefined) updateData.mode = mode
  if (parentGroupId !== undefined) updateData.parentGroupId = parentGroupId
  if (oeId !== undefined) updateData.oeId = oeId
  if (accountManagerId !== undefined) updateData.accountManagerId = accountManagerId

  // Mettre à jour l'entité
  const [updatedEntity] = await db
    .update(entities)
    .set(updateData)
    .where(eq(entities.id, entityIdInt))
    .returning()

  // Retourner l'entité mise à jour
  return {
    data: updatedEntity,
  }
})
