import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { audits } from '~~/server/database/schema'
import { requireAuditAccess, AccessType } from '~~/server/utils/authorization'

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

  // Vérifier l'accès à l'audit
  await requireAuditAccess({
    userId: user.id,
    userRole: user.role,
    auditId: auditId,
    userOeId: user.oeId,
    userOeRole: user.oeRole,
    currentEntityId: user.currentEntityId,
    accessType: AccessType.READ
  })

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
