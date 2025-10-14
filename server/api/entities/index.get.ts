import { and } from 'drizzle-orm'
import { db } from '~~/server/database'
import { entities as entitiesTable } from '~~/server/database/schema'
import {
  parsePaginationParams,
  buildWhereConditions,
  buildOrderBy,
  buildCountQuery,
  formatPaginatedResponse,
} from '~~/server/utils/pagination'

/**
 * GET /api/entities
 *
 * Liste paginée des entités (entreprises et groupes)
 *
 * Query params:
 * - page: numéro de page (défaut: 1)
 * - limit: items par page (défaut: 25, max: 100)
 * - search: recherche globale sur name, siren, siret
 * - sort: tri (ex: createdAt:desc, name:asc, oe.name:asc, accountManager.lastname:asc)
 * - type: filtre par type (COMPANY, GROUP) - support multiple: type=COMPANY,GROUP
 * - mode: filtre par mode (MASTER, FOLLOWER)
 * - oeId: filtre par OE (support multiple: oeId=1,2,3)
 * - accountManagerId: filtre par chargé de compte
 * - parentGroupId: filtre par groupe parent
 *
 * Exemples:
 * - GET /api/entities?page=1&limit=50
 * - GET /api/entities?search=entreprise&type=COMPANY
 * - GET /api/entities?sort=name:asc&oeId=1
 * - GET /api/entities?type=COMPANY,GROUP&mode=MASTER
 * - GET /api/entities?sort=oe.name:asc&search=ABC
 * - GET /api/entities?sort=accountManager.lastname:asc
 */
export default defineEventHandler(async (event) => {
  // Authentification requise
  const { user } = await requireUserSession(event)

  // Configuration de la pagination
  const config = {
    table: entitiesTable,
    searchFields: ['name', 'siren', 'siret'],
    allowedFilters: {
      local: ['type', 'mode', 'oeId', 'accountManagerId', 'parentGroupId'],
    },
    allowedSorts: {
      local: ['createdAt', 'name', 'type', 'mode'],
      relations: ['oe.name', 'accountManager.lastname', 'accountManager.firstname'],
    },
    defaultSort: 'createdAt:desc',
  }

  // 1. Parser les paramètres de pagination
  const params = parsePaginationParams(event, config)

  // 2. Construire les conditions WHERE
  const whereConditions = buildWhereConditions(params, config)

  // 3. Construire la clause ORDER BY
  const orderByClause = buildOrderBy(params.sort, config)

  // 4. Exécuter la requête avec les relations
  const data = await db.query.entities.findMany({
    where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
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
        },
      },
    },
    ...(orderByClause && { orderBy: orderByClause }),
    limit: params.limit,
    offset: params.offset,
  })

  // 5. Compter le total
  const total = await buildCountQuery(whereConditions, config)

  // 6. Retourner la réponse paginée
  return formatPaginatedResponse(data, params, total)
})
