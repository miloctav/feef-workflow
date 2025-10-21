import { and, eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { accounts as accountsTable, accountsToEntities } from '~~/server/database/schema'
import {
  parsePaginationParams,
  buildWhereConditions,
  buildOrderBy,
  buildCountQuery,
  formatResponse,
} from '~~/server/utils/pagination'

/**
 * GET /api/accounts
 *
 * Liste paginée des comptes utilisateurs (FEEF uniquement)
 *
 * Query params:
 * - page: numéro de page (défaut: 1)
 * - limit: items par page (défaut: 25, max: 100, -1 = tous)
 * - search: recherche globale sur firstname, lastname, email
 * - sort: tri (ex: createdAt:desc, firstname:asc, oe.name:asc)
 * - role: filtre par rôle (ex: OE, AUDITOR, ENTITY) - support multiple: role=OE,AUDITOR
 * - oeId: filtre par OE (support multiple: oeId=1,2,3)
 * - oeRole: filtre par rôle dans l'OE (ADMIN, ACCOUNT_MANAGER) - nécessite oeId
 * - isActive: filtre par statut actif (true/false)
 * - entityId: filtre par entité (retourne uniquement les comptes liés à cette entité)
 * - entityRole: filtre par rôle dans l'entité (SIGNATORY, PROCESS_MANAGER) - nécessite entityId
 *
 * Exemples:
 * - GET /api/accounts?page=1&limit=50
 * - GET /api/accounts?search=john&role=OE
 * - GET /api/accounts?sort=firstname:asc&isActive=true
 * - GET /api/accounts?oeId=1,2&role=AUDITOR
 * - GET /api/accounts?oeId=3&oeRole=ADMIN (administrateurs de l'OE 3)
 * - GET /api/accounts?sort=oe.name:asc
 * - GET /api/accounts?role=AUDITOR&limit=-1 (tous les auditeurs, sans pagination)
 * - GET /api/accounts?entityId=5 (tous les comptes liés à l'entité 5)
 * - GET /api/accounts?entityId=5&entityRole=SIGNATORY (signataires de l'entité 5)
 */
export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur connecté est FEEF
  const { user } = await requireUserSession(event)

  const query = getQuery(event)

  if (user.role === Role.FEEF) {

  } else if (user.role === Role.OE && user.oeRole === OERole.ADMIN) {
    query.oeId = String(user.oeId)
  } else {
    throw createError({
      statusCode: 403,
      message: 'Vous n\'êtes pas autorisé à accéder à cette ressource',
    })
  }

  // Configuration de la pagination
  const config = {
    table: accountsTable,
    searchFields: ['firstname', 'lastname', 'email'],
    allowedFilters: {
      local: ['role', 'oeId', 'oeRole', 'isActive'],
    },
    allowedSorts: {
      local: ['createdAt', 'firstname', 'lastname', 'email'],
      relations: ['oe.name'],
    },
    junctionFilters: {
      entityId: {
        junctionTable: accountsToEntities,
        localIdColumn: accountsToEntities.accountId,
        targetIdColumn: accountsToEntities.entityId,
        roleColumn: accountsToEntities.role,
        roleParam: 'entityRole',
      },
    },
    defaultSort: 'createdAt:desc',
  }

  // 1. Parser les paramètres de pagination
  const params = parsePaginationParams(query, config)

  // 2. Construire les conditions WHERE (gère automatiquement les junction filters)
  const whereConditions = await buildWhereConditions(params, config)

  // 3. Extraire entityId pour le filtrage des relations retournées
  const entityIdParam = params.filters.entityId ? Number(params.filters.entityId) : undefined

  // 4. Construire la clause ORDER BY
  const orderByClause = buildOrderBy(params.sort, config)

  // 5. Mode unlimited: retourner toutes les données avec colonnes minimales
  if (params.isUnlimited) {
    const data = await db.query.accounts.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      columns: {
        id: true,
        firstname: true,
        lastname: true,
        password: false,
      },
      ...(orderByClause && { orderBy: orderByClause }),
    })

    return formatResponse(params.isUnlimited, data)
  }

  // 6. Mode paginé: exécuter la requête avec les relations
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
        // Si entityId est fourni, filtrer les relations pour ne garder que celle-ci
        ...(entityIdParam && {
          where: eq(accountsToEntities.entityId, entityIdParam),
        }),
      },
    },
    ...(orderByClause && { orderBy: orderByClause }),
    limit: params.limit,
    offset: params.offset,
  })

  // 7. Compter le total
  const total = await buildCountQuery(whereConditions, config)

  // 8. Retourner la réponse paginée
  return formatResponse(params.isUnlimited, data, params, total)
})
