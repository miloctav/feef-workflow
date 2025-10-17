import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { audits } from '~~/server/database/schema'

/**
 * GET /api/audits/:id
 *
 * Récupère un audit par son ID avec toutes ses relations
 *
 * Relations incluses:
 * - entity: l'entité auditée (avec oe, accountManager, parentGroup)
 * - oe: l'organisme évaluateur
 * - auditor: l'auditeur (avec son oe)
 */
export default defineEventHandler(async (event) => {
  // Authentification requise
  await requireUserSession(event)

  // Récupérer l'ID depuis l'URL
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'ID de l\'audit requis',
    })
  }

  const auditId = parseInt(id)

  if (isNaN(auditId)) {
    throw createError({
      statusCode: 400,
      message: 'ID de l\'audit invalide',
    })
  }

  // Récupérer l'audit par son ID avec toutes les relations
  const audit = await db.query.audits.findFirst({
    where: eq(audits.id, auditId),
    with: {
      entity: {
        with: {
          oe: {
            columns: {
              id: true,
              name: true,
            },
          },
          accountManager: {
            columns: {
              id: true,
              firstname: true,
              lastname: true,
              email: true,
            },
          },
          parentGroup: {
            columns: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      },
      oe: {
        columns: {
          id: true,
          name: true,
        },
      },
      auditor: {
        columns: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          role: true,
        },
        with: {
          oe: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  })

  if (!audit) {
    throw createError({
      statusCode: 404,
      message: 'Audit non trouvé',
    })
  }

  return {
    data: audit,
  }
})
