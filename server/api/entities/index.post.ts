import { eq, isNull, and } from "drizzle-orm"
import { db } from "~~/server/database"
import { entities, documentsType, documentaryReviews } from "~~/server/database/schema"
import { forInsert } from "~~/server/utils/tracking"
import { EntityType, EntityMode } from "~~/shared/types/enums"

interface CreateEntityBody {
  name: string
  type: typeof EntityType[keyof typeof EntityType]
  mode: typeof EntityMode[keyof typeof EntityMode]
  siren?: string
  siret?: string
  parentGroupId?: number
  oeId?: number
  accountManagerId?: number
}

export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur est authentifié et a le role FEEF
  const { user: currentUser } = await requireUserSession(event)

  if (currentUser.role !== 'FEEF') {
    throw createError({
      statusCode: 403,
      message: 'Accès refusé. Seul le role FEEF peut créer des entités.'
    })
  }

  const body = await readBody<CreateEntityBody>(event)

  const { name, type, mode, siren, siret, parentGroupId, oeId, accountManagerId } = body

  // Validation des champs requis
  if (!name) {
    throw createError({
      statusCode: 400,
      message: 'Le nom est requis.'
    })
  }

  if (!type) {
    throw createError({
      statusCode: 400,
      message: 'Le type est requis.'
    })
  }

  if (!mode) {
    throw createError({
      statusCode: 400,
      message: 'Le mode est requis.'
    })
  }

  // Validation des valeurs d'enum
  if (!Object.values(EntityType).includes(type)) {
    throw createError({
      statusCode: 400,
      message: 'Type invalide. Les valeurs autorisées sont: COMPANY, GROUP.'
    })
  }

  if (!Object.values(EntityMode).includes(mode)) {
    throw createError({
      statusCode: 400,
      message: 'Mode invalide. Les valeurs autorisées sont: MASTER, FOLLOWER.'
    })
  }

  // Validation : si type=COMPANY et mode=FOLLOWER, parentGroupId est obligatoire
  if (type === EntityType.COMPANY && mode === EntityMode.FOLLOWER && !parentGroupId) {
    throw createError({
      statusCode: 400,
      message: 'Le parentGroupId est requis pour une entreprise en mode FOLLOWER.'
    })
  }

  // Si parentGroupId est fourni, vérifier que le groupe parent existe et est bien un GROUP
  if (parentGroupId) {
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

  // Construire l'objet de création en n'incluant que les champs fournis
  const insertData: any = {
    name,
    type,
    mode,
  }

  if (siren !== undefined) insertData.siren = siren
  if (siret !== undefined) insertData.siret = siret
  if (parentGroupId !== undefined) insertData.parentGroupId = parentGroupId
  if (oeId !== undefined) insertData.oeId = oeId
  if (accountManagerId !== undefined) insertData.accountManagerId = accountManagerId

  const [newEntity] = await db.insert(entities).values(forInsert(event, insertData)).returning()

  // Récupérer tous les documents types avec autoAsk = true
  const autoAskDocuments = await db.query.documentsType.findMany({
    where: and(
      eq(documentsType.autoAsk, true),
      isNull(documentsType.deletedAt)
    ),
  })

  // Créer automatiquement les revues documentaires pour les documents avec autoAsk = true
  if (autoAskDocuments.length > 0) {
    const documentaryReviewsToInsert = autoAskDocuments.map(docType => 
      forInsert(event, {
        entityId: newEntity.id,
        documentTypeId: docType.id,
        title: docType.title,
        description: docType.description,
        category: docType.category,
      })
    )

    await db.insert(documentaryReviews).values(documentaryReviewsToInsert)
  }

  return {
    data: newEntity
  }
})
