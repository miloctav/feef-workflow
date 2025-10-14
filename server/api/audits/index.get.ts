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
 * - search: recherche globale sur entity.name, oe.name, auditor.firstname, auditor.lastname
 * - sort: tri (ex: createdAt:desc, plannedDate:asc, entity.name:asc, oe.name:asc, auditor.lastname:asc)
 *
 * Filtres locaux:
 * - type: filtre par type d'audit (INITIAL, RENEWAL, MONITORING) - support multiple
 * - entityId: filtre par entité
 * - oeId: filtre par OE
 * - auditorId: filtre par auditeur
 *
 * Filtres relationnels (avec alias courts):
 * - entityType: filtre par type d'entité (COMPANY, GROUP)
 * - entity.type: filtre par type d'entité (syntaxe dot notation)
 * - entityName: recherche dans le nom de l'entité
 * - entity.name: recherche dans le nom de l'entité (syntaxe dot notation)
 * - oeName: recherche dans le nom de l'OE
 * - oe.name: recherche dans le nom de l'OE (syntaxe dot notation)
 *
 * Exemples:
 * - GET /api/audits?page=1&limit=50
 * - GET /api/audits?search=entreprise&type=INITIAL
 * - GET /api/audits?sort=plannedDate:asc&entityType=COMPANY
 * - GET /api/audits?type=INITIAL,RENEWAL&oeId=1
 * - GET /api/audits?sort=entity.name:asc&entityType=COMPANY
 * - GET /api/audits?oeName=Bureau&sort=auditor.lastname:asc
 * - GET /api/audits?entityName=ABC&type=INITIAL
 */
export default defineEventHandler(async (event) => {
  // Authentification requise
  const { user } = await requireUserSession(event)

  // Configuration de la pagination
  const config = {
    table: auditsTable,
    searchFields: [
      'entity.name',
      'oe.name',
      'auditor.firstname',
      'auditor.lastname',
    ],
    allowedFilters: {
      local: ['type', 'entityId', 'oeId', 'auditorId'],
      relations: {
        // Alias courts (plus lisibles dans l'URL)
        'entityType': 'entity.type',
        'entityName': 'entity.name',
        'oeName': 'oe.name',
        // Dot notation directe (syntaxe alternative)
        'entity.type': 'entity.type',
        'entity.name': 'entity.name',
        'oe.name': 'oe.name',
      },
    },
    allowedSorts: {
      local: ['createdAt', 'plannedDate', 'actualDate', 'score', 'type'],
      relations: [
        'entity.name',
        'entity.type',
        'oe.name',
        'auditor.lastname',
        'auditor.firstname',
      ],
    },
    defaultSort: 'createdAt:desc',
  }

  // 1. Parser les paramètres de pagination
  const params = parsePaginationParams(event, config)

  // 2. Construire les conditions WHERE
  const whereConditions = buildWhereConditions(params, config)

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

  // 5. Compter le total
  const total = await buildCountQuery(whereConditions, config)

  // 6. Retourner la réponse paginée
  return formatPaginatedResponse(data, params, total)
})
