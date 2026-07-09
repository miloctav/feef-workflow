import { eq, and, desc, isNotNull, isNull } from 'drizzle-orm'
import { db } from '~~/server/database'
import { audits, documentVersions, entities } from '~~/server/database/schema'
import { requireAuditAccess, AccessType } from '~~/server/utils/authorization'
import { getFormattedEntityFields } from '~~/server/utils/entity-fields-formatter'

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
    user,
    auditId,
    accessType: AccessType.READ
  })

  // Récupérer l'audit par son ID avec toutes les relations
  const audit = await db.query.audits.findFirst({
    where: and(eq(audits.id, auditId), isNull(audits.deletedAt)),
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
          fieldVersions: true,
          childEntities: {
            where: isNull(entities.deletedAt),
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

  // Récupérer les dernières versions de chaque type de document d'audit
  const documentTypes = ['PLAN', 'REPORT', 'SHORT_ACTION_PLAN', 'LONG_ACTION_PLAN', 'OE_OPINION', 'ATTESTATION'] as const

  const lastVersionsPromises = documentTypes.map(async (docType) => {
    const lastVersion = await db.query.documentVersions.findFirst({
      where: and(
        eq(documentVersions.auditId, auditId),
        eq(documentVersions.auditDocumentType, docType),
        isNotNull(documentVersions.s3Key) // Exclure les demandes de MAJ en attente
      ),
      orderBy: [desc(documentVersions.uploadAt)],
      with: {
        uploadByAccount: {
          columns: {
            id: true,
            firstname: true,
            lastname: true,
          },
        },
      },
    })
    return { type: docType, version: lastVersion }
  })

  const lastVersionsResults = await Promise.all(lastVersionsPromises)

  // Construire un objet avec les dernières versions par type
  const lastDocumentVersions: Record<string, any> = {}
  for (const result of lastVersionsResults) {
    if (result.version) {
      lastDocumentVersions[result.type] = result.version
    }
  }

  // Formater les champs de l'entité
  const formattedFields = await getFormattedEntityFields(audit.entity.id)

  return {
    data: {
      ...audit,
      entity: {
        ...audit.entity,
        fields: formattedFields,
      },
      lastDocumentVersions,
    },
  }
})
