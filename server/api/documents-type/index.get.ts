import { and } from 'drizzle-orm'
import { db } from '~~/server/database'
import { documentsType } from '~~/server/database/schema'
import {
  parsePaginationParams,
  buildWhereConditions,
  buildOrderBy,
  buildCountQuery,
  formatResponse,
} from '~~/server/utils/pagination'

/**
 * GET /api/documents-type
 *
 * Liste paginée des documents types
 *
 * Query params:
 * - page: numéro de page (défaut: 1)
 * - limit: items par page (défaut: 25, max: 100, -1 = tous)
 * - search: recherche globale sur title et description
 * - sort: tri (ex: createdAt:desc, title:asc)
 *
 * Accessible par: FEEF, OE
 *
 * Exemples:
 * - GET /api/documents-type?page=1&limit=50
 * - GET /api/documents-type?search=attestation&sort=title:asc
 * - GET /api/documents-type?sort=createdAt:desc
 * - GET /api/documents-type?limit=-1 (tous les documents types, sans pagination)
 */
export default defineEventHandler(async (event) => {
  // Authentification requise
  const { user } = await requireUserSession(event)

  // Vérifier que l'utilisateur a le role FEEF ou OE
  if (user.role !== Role.FEEF && user.role !== Role.OE) {
    throw createError({
      statusCode: 403,
      message: 'Accès refusé. Seuls les roles FEEF et OE peuvent accéder aux documents types.'
    })
  }

  // Configuration de la pagination
  const config = {
    table: documentsType,
    searchFields: ['title', 'description'],
    allowedFilters: {
      local: ['category', 'autoAsk'],
    },
    allowedSorts: {
      local: ['createdAt', 'title', 'category', 'autoAsk'],
    },
    defaultSort: 'createdAt:desc',
  }

  // 1. Parser les paramètres de pagination
  const params = parsePaginationParams(getQuery(event), config)

  // 2. Construire les conditions WHERE
  const whereConditions = await buildWhereConditions(params, config)

  // 3. Construire la clause ORDER BY
  const orderByClause = buildOrderBy(params.sort, config)

  // 4. Mode unlimited: retourner toutes les données avec colonnes minimales
  if (params.isUnlimited) {
    const data = await db.query.documentsType.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      columns: {
        id: true,
        title: true,
        description: true,
        category: true,
      },
      ...(orderByClause && { orderBy: orderByClause }),
    })

    return formatResponse(params.isUnlimited, data)
  }

  // 5. Mode paginé: exécuter la requête avec toutes les colonnes
  const data = await db.query.documentsType.findMany({
    where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
    columns: {
      id: true,
      title: true,
      description: true,
      category: true,
      autoAsk: true,
      createdAt: true,
    },
    ...(orderByClause && { orderBy: orderByClause }),
    limit: params.limit,
    offset: params.offset,
  })

  // 6. Compter le total
  const total = await buildCountQuery(whereConditions, config)

  // 7. Retourner la réponse paginée
  return formatResponse(params.isUnlimited, data, params, total)
})
