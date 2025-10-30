import { and, eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { accounts, audits, auditorsToOE } from '~~/server/database/schema'

/**
 * POST /api/audits/:id/assign-auditor
 *
 * Affecte un auditeur à un audit
 *
 * Restrictions:
 * - Seuls les utilisateurs avec le rôle OE peuvent affecter un auditeur
 * - L'OE de l'utilisateur doit correspondre à l'OE de l'audit
 * - L'auditeur doit être lié à l'OE via la table auditorsToOE
 *
 * Body:
 * - auditorId: ID de l'auditeur à affecter
 */
export default defineEventHandler(async (event) => {
  // Authentification requise
  const { user: currentUser } = await requireUserSession(event)

  // Vérifier que l'utilisateur a le rôle OE
  if (currentUser.role !== Role.OE) {
    throw createError({
      statusCode: 403,
      message: 'Accès refusé. Seuls les utilisateurs OE peuvent affecter un auditeur.',
    })
  }

  // Récupérer l'ID de l'audit depuis l'URL
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

  // Récupérer le body
  const body = await readBody(event)
  const { auditorId } = body

  // Validation du body
  if (!auditorId || typeof auditorId !== 'number') {
    throw createError({
      statusCode: 400,
      message: 'auditorId est requis et doit être un nombre',
    })
  }

  // Vérifier que l'audit existe
  const existingAudit = await db.query.audits.findFirst({
    where: eq(audits.id, auditId),
    columns: {
      id: true,
      oeId: true,
    },
  })

  if (!existingAudit) {
    throw createError({
      statusCode: 404,
      message: 'Audit non trouvé',
    })
  }

  // Vérifier que l'OE de l'utilisateur correspond à l'OE de l'audit
  if (existingAudit.oeId !== currentUser.oeId) {
    throw createError({
      statusCode: 403,
      message: 'Vous ne pouvez affecter un auditeur que pour les audits de votre organisation',
    })
  }

  // Vérifier que l'auditeur existe et a le rôle AUDITOR
  const auditor = await db.query.accounts.findFirst({
    where: eq(accounts.id, auditorId),
    columns: {
      id: true,
      role: true,
    },
  })

  if (!auditor) {
    throw createError({
      statusCode: 404,
      message: 'L\'auditeur spécifié n\'existe pas',
    })
  }

  if (auditor.role !== Role.AUDITOR) {
    throw createError({
      statusCode: 400,
      message: 'Le compte spécifié doit avoir le rôle AUDITOR',
    })
  }

  // Vérifier que l'auditeur est lié à l'OE de l'utilisateur
  const auditorOeLink = await db.query.auditorsToOE.findFirst({
    where: and(
      eq(auditorsToOE.auditorId, auditorId),
      eq(auditorsToOE.oeId, currentUser.oeId!)
    ),
  })

  if (!auditorOeLink) {
    throw createError({
      statusCode: 403,
      message: 'Cet auditeur n\'est pas lié à votre organisation',
    })
  }

  // Mettre à jour l'audit avec le nouvel auditeur
  const [updatedAudit] = await db
    .update(audits)
    .set(forUpdate(event, { auditorId }))
    .where(eq(audits.id, auditId))
    .returning()

  // Récupérer l'audit mis à jour avec toutes ses relations
  const auditWithRelations = await db.query.audits.findFirst({
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

  return {
    data: auditWithRelations,
  }
})
