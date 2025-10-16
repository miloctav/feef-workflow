import { and } from 'drizzle-orm'
import { db } from '~~/server/database'
import { accounts as accountsTable } from '~~/server/database/schema'
import {
  parsePaginationParams,
  buildWhereConditions,
  buildOrderBy,
  buildCountQuery,
  formatPaginatedResponse,
} from '~~/server/utils/pagination'

/**
 * GET /api/accounts
 *
 * Liste paginée des comptes utilisateurs (FEEF uniquement)
 *
 * Query params:
 * - page: numéro de page (défaut: 1)
 * - limit: items par page (défaut: 25, max: 100)
 * - search: recherche globale sur firstname, lastname, email
 * - sort: tri (ex: createdAt:desc, firstname:asc, oe.name:asc)
 * - role: filtre par rôle (ex: OE, AUDITOR, ENTITY) - support multiple: role=OE,AUDITOR
 * - oeId: filtre par OE (support multiple: oeId=1,2,3)
 * - isActive: filtre par statut actif (true/false)
 *
 * Exemples:
 * - GET /api/accounts?page=1&limit=50
 * - GET /api/accounts?search=john&role=OE
 * - GET /api/accounts?sort=firstname:asc&isActive=true
 * - GET /api/accounts?oeId=1,2&role=AUDITOR
 * - GET /api/accounts?sort=oe.name:asc
 */
export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur connecté est FEEF
  const { user } = await requireUserSession(event)

  if (user.role !== Role.FEEF) {
    throw createError({
      statusCode: 403,
      message: 'Seul un administrateur FEEF peut accéder à la liste des comptes',
    })
  }

  // Configuration de la pagination
  const config = {
    table: accountsTable,
    searchFields: ['firstname', 'lastname', 'email'],
    allowedFilters: {
      local: ['role', 'oeId', 'isActive'],
    },
    allowedSorts: {
      local: ['createdAt', 'firstname', 'lastname', 'email'],
      relations: ['oe.name'],
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
  const data = await db.query.accounts.findMany({
    where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
    columns: {
      password: false, // Toujours exclure le mot de passe
    },
    with: {
      oe: {
        columns: {
          id: true,
          name: true,
        },
      },
      accountsToEntities: {
        columns: {
          entityId: true,
          role: true,
        },
        with: {
          entity: {
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

  // 6. Retourner la réponse paginée
  return formatPaginatedResponse(data, params, total)
})
