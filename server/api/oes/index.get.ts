import { and } from 'drizzle-orm'
import { db } from '~~/server/database'
import { oes as oesTable } from '~~/server/database/schema'
import {
  parsePaginationParams,
  buildWhereConditions,
  buildOrderBy,
  buildCountQuery,
  formatPaginatedResponse,
} from '~~/server/utils/pagination'

/**
 * GET /api/oes
 *
 * Liste paginée des organismes évaluateurs (OE)
 *
 * Query params:
 * - page: numéro de page (défaut: 1)
 * - limit: items par page (défaut: 25, max: 100)
 * - search: recherche globale sur name
 * - sort: tri (ex: createdAt:desc, name:asc)
 *
 * Exemples:
 * - GET /api/oes?page=1&limit=50
 * - GET /api/oes?search=bureau&sort=name:asc
 * - GET /api/oes?sort=createdAt:desc
 */
export default defineEventHandler(async (event) => {
  // Authentification requise
  const { user } = await requireUserSession(event)

  // Configuration de la pagination
  const config = {
    table: oesTable,
    searchFields: ['name'],
    allowedSorts: {
      local: ['createdAt', 'name'],
    },
    defaultSort: 'createdAt:desc',
  }

  // 1. Parser les paramètres de pagination
  const params = parsePaginationParams(event, config)

  // 2. Construire les conditions WHERE
  const whereConditions = buildWhereConditions(params, config)

  // 3. Construire la clause ORDER BY
  const orderByClause = buildOrderBy(params.sort, config)

  // 4. Exécuter la requête avec les colonnes sélectionnées
  const data = await db.query.oes.findMany({
    where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
    columns: {
      id: true,
      name: true,
      createdAt: true,
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