import { db } from "~~/server/database"
import { entities, EntityType } from "~~/server/database/schema"
import { eq } from "drizzle-orm"

export default defineEventHandler(async (event) => {

  await requireUserSession(event)

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'ID de l\'entité requis'
    })
  }

  // Récupérer l'entité par son ID avec toutes les relations
  const entity = await db.query.entities.findFirst({
    where: eq(entities.id, parseInt(id)),
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
      },
      caseSubmittedByAccount: {
        columns: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
        }
      },
      caseApprovedByAccount: {
        columns: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
        }
      },
      parentGroup: true, // Si c'est une COMPANY, récupérer tous les détails du groupe parent
      childEntities: {    // Si c'est un GROUP, récupérer toutes les entreprises enfants
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
      }
    }
  })

  if (!entity) {
    throw createError({
      statusCode: 404,
      message: 'Entité non trouvée'
    })
  }

  return {
    data: entity
  }
})
