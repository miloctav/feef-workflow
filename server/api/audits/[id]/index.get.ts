import { and, eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { audits } from '~~/server/database/schema'

/**
 * GET /api/audits/:id
 *
 * R�cup�re un audit par son ID avec toutes ses relations
 *
 * Relations incluses:
 * - entity: l'entit� audit�e (avec oe, accountManager, parentGroup)
 * - oe: l'organisme �valuateur
 * - auditor: l'auditeur (avec son oe)
 */
export default defineEventHandler(async (event) => {
  // Authentification requise
  const {user} = await requireUserSession(event)

  console.log(`📋 ${user.email} is fetching audit by ID`)

  // R�cup�rer l'ID depuis l'URL
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
  const whereClause = (fields: any) => {
    if (user.role === Role.AUDITOR) {
      return and(eq(fields.id, auditId), eq(fields.auditorId, Number(user.id)))
    } else if(user.role === Role.OE) {
      console.log(`OE user ${user.email} accessing audit ${auditId} oeId ${user.oeId}`)
      return and(eq(fields.id, auditId), eq(fields.oeId, Number(user.oeId)))     
    } else {
      return eq(fields.id, auditId)
    }
  }

  const audit = await db.query.audits.findFirst({
    where: whereClause,
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
      message: 'Audit non trouv�',
    })
  }

  // Normalize entity to handle possible array returned by the ORM
  const entity = Array.isArray(audit.entity) ? audit.entity[0] : audit.entity

  if (user.role === Role.OE && user.oeRole === OERole.ACCOUNT_MANAGER && entity?.accountManagerId !== user.id) {
    throw createError({
      statusCode: 403,
      message: 'Accés refusé à cet audit',
    })
  }

  return {
    data: audit,
  }
})
