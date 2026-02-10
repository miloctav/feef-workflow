import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '~~/server/database'
import { audits as auditsTable, entities } from '~~/server/database/schema'
import {
  parsePaginationParams,
  buildWhereConditions,
  buildOrderBy,
  buildCountQuery,
  formatPaginatedResponse,
} from '~~/server/utils/pagination'
import { Role, OERole } from '#shared/types/roles'
import { getActionCountsForUser } from '~~/server/utils/getActionCountsForUser'

/**
 * GET /api/audits
 *
 * Liste paginée des audits
 *
 * Query params:
 * - page: numéro de page (défaut: 1)
 * - limit: items par page (défaut: 25, max: 100)
 * - sort: tri (ex: createdAt:desc, plannedDate:asc, actualDate:desc)
 *
 * Filtres:
 * - type: filtre par type d'audit (INITIAL, RENEWAL, MONITORING) - support multiple
 * - entityId: filtre par entité
 * - oeId: filtre par OE
 * - auditorId: filtre par auditeur
 *
 * Note: La recherche globale n'est pas supportée car Drizzle ne permet pas de rechercher
 * sur les champs relationnels avec db.query.*. Utilisez les filtres à la place.
 *
 * Exemples:
 * - GET /api/audits?page=1&limit=50
 * - GET /api/audits?type=INITIAL&oeId=1
 * - GET /api/audits?sort=plannedDate:asc&type=INITIAL
 * - GET /api/audits?type=INITIAL,RENEWAL&auditorId=5
 */
export default defineEventHandler(async (event) => {
  // Authentification requise
  const { user } = await requireUserSession(event)


  const query = getQuery(event)


  // Configuration de la pagination
  // Note: searchFields n'est pas défini car Drizzle ne supporte pas la recherche sur les champs relationnels
  const config = {
    table: auditsTable,
    allowedFilters: {
      local: ['type', 'entityId', 'oeId', 'auditorId', 'status'],
    },
    allowedSorts: {
      local: ['createdAt', 'updatedAt','plannedDate', 'actualStartDate', 'actualEndDate', 'globalScore', 'type'],
    },
    defaultSort: 'updatedAt:desc',
  }

  if (user.role === Role.AUDITOR) {
      query.auditorId = String(user.id)
  }

  // 1. Parser les paramètres de pagination
  const params = parsePaginationParams(query, config)


  // 2. Construire les conditions WHERE
  const whereConditions = await buildWhereConditions(params, config)

  // Ajouter les filtres spécifiques par rôle
  if (user.role === Role.OE) {
    // Si un entityId est fourni dans la requête, ne pas filtrer par oeId
    // Cela permet de voir tous les audits de cette entité, même ceux d'autres OE
    if (!query.entityId && user.oeId !== null) {
      whereConditions.push(eq(auditsTable.oeId, user.oeId))
    }

    // Si ACCOUNT_MANAGER, filtrer par accountManagerId via les entités
    if (user.oeRole === OERole.ACCOUNT_MANAGER) {
      const myEntities = await db.query.entities.findMany({
        where: eq(entities.accountManagerId, user.id),
        columns: { id: true }
      })
      const entityIds = myEntities.map(e => e.id)

      if (entityIds.length > 0) {
        whereConditions.push(inArray(auditsTable.entityId, entityIds))
      } else {
        whereConditions.push(sql`false`)  // Aucune entité, aucun audit
      }
    }
  }

  if (user.role === Role.ENTITY) {
    if (user.currentEntityId) {
      whereConditions.push(eq(auditsTable.entityId, user.currentEntityId))
    } else {
      whereConditions.push(sql`false`)  // Pas d'entité courante, aucun audit
    }
  }

  // 3. Construire la clause ORDER BY
  const orderByClause = buildOrderBy(params.sort, config)


  // 4. Exécuter la requête avec les relations imbriquées
  const data = await db.query.audits.findMany({
    where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
    with: {
      entity: {
        columns: {
          id: true,
          name: true,
          type: true,
          mode: true,
          siret: true,
        },
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
    ...(orderByClause && { orderBy: orderByClause }),
    limit: params.limit,
    offset: params.offset,
  })


  // 5. Compter le total
  const total = await buildCountQuery(whereConditions, config)

  // 6. Enrichir les données avec le nombre d'actions en attente pour l'utilisateur
  const auditIds = data.map(audit => audit.id)
  const actionCounts = await getActionCountsForUser(user, { auditIds })

  const enrichedData = data.map(audit => ({
    ...audit,
    pendingActionsCount: actionCounts[audit.id] || 0,
  }))

  // 7. Retourner la réponse paginée
  return formatPaginatedResponse(enrichedData, params, total)
})
