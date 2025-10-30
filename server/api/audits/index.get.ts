import { and } from 'drizzle-orm'
import { db } from '~~/server/database'
import { audits as auditsTable } from '~~/server/database/schema'
import {
  parsePaginationParams,
  buildWhereConditions,
  buildOrderBy,
  buildCountQuery,
  formatPaginatedResponse,
} from '~~/server/utils/pagination'

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

  console.log(`📋 ${user.email} is fetching audits list with pagination`)

  const query = getQuery(event)

  console.log('Query params:', query)

  // Configuration de la pagination
  // Note: searchFields n'est pas défini car Drizzle ne supporte pas la recherche sur les champs relationnels
  const config = {
    table: auditsTable,
    allowedFilters: {
      local: ['type', 'entityId', 'oeId', 'auditorId'],
    },
    allowedSorts: {
      local: ['createdAt', 'plannedDate', 'actualDate', 'score', 'type'],
    },
    defaultSort: 'createdAt:desc',
  }

  if(user.role === Role.AUDITOR) {
    query.auditorId = String(user.id)
  }

  // 1. Parser les paramètres de pagination
  const params = parsePaginationParams(query, config)

  console.log('Parsed pagination params:', params)

  // 2. Construire les conditions WHERE
  const whereConditions = await buildWhereConditions(params, config)

  // 3. Construire la clause ORDER BY
  const orderByClause = buildOrderBy(params.sort, config)

  console.log('Where conditions:', whereConditions)

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
          siren: true,
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

  console.log(`Fetched ${data.length} audits from database`)

  // 5. Compter le total
  const total = await buildCountQuery(whereConditions, config)

  console.log(`Total audits matching criteria: ${total}`)

  // 6. Retourner la réponse paginée
  return formatPaginatedResponse(data, params, total)
})
