import { and, or, eq, isNull, isNotNull } from 'drizzle-orm'
import { db } from '~~/server/database'
import { entities as entitiesTable, accountsToEntities } from '~~/server/database/schema'
import {
  parsePaginationParams,
  buildWhereConditions,
  buildOrderBy,
  buildCountQuery,
  formatResponse,
} from '~~/server/utils/pagination'
import { Role } from '#shared/types/roles'

/**
 * GET /api/entities
 *
 * Liste paginée des entités (entreprises et groupes)
 *
 * Query params:
 * - page: numéro de page (défaut: 1)
 * - limit: items par page (défaut: 25, max: 100, -1 = tous)
 * - search: recherche globale sur name, siren, siret
 * - sort: tri (ex: createdAt:desc, name:asc, oe.name:asc, accountManager.lastname:asc)
 * - type: filtre par type (COMPANY, GROUP) - support multiple: type=COMPANY,GROUP
 * - mode: filtre par mode (MASTER, FOLLOWER)
 * - oeId: filtre par OE (support multiple: oeId=1,2,3)
 * - accountManagerId: filtre par chargé de compte
 * - parentGroupId: filtre par groupe parent
 * - accountId: filtre par compte ayant accès (via accounts_to_entities) - auto-ajouté pour les comptes ENTITY
 * - accountIdRole: filtre par rôle du compte sur l'entité (SIGNATORY, PROCESS_MANAGER) - utilisé avec accountId
 *
 * Note: Pour les utilisateurs avec role=ENTITY, le filtre accountId est automatiquement appliqué
 * pour ne retourner que les entités auxquelles ils ont accès.
 *
 * Exemples:
 * - GET /api/entities?page=1&limit=50
 * - GET /api/entities?search=entreprise&type=COMPANY
 * - GET /api/entities?sort=name:asc&oeId=1
 * - GET /api/entities?type=COMPANY,GROUP&mode=MASTER
 * - GET /api/entities?sort=oe.name:asc&search=ABC
 * - GET /api/entities?sort=accountManager.lastname:asc
 * - GET /api/entities?accountId=5&accountIdRole=SIGNATORY (pour FEEF/OE)
 * - GET /api/entities?limit=-1 (tous les résultats, sans pagination)
 */
export default defineEventHandler(async (event) => {
  // Authentification requise
  const { user } = await requireUserSession(event)

  // Les auditeurs n'ont pas accès à la liste des entités
  if (user.role === Role.AUDITOR) {
    throw createError({
      statusCode: 403,
      message: 'Les auditeurs ne peuvent pas accéder à la liste des entités'
    })
  }

  const query = getQuery(event)

  // Si compte ENTITY, filtrer uniquement les entités auxquelles il a accès
  if (user.role === Role.ENTITY) {
    query.accountId = String(user.id)
  }

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
    // Filtre via table de jonction pour les comptes ENTITY
    junctionFilters: {
      accountId: {
        junctionTable: accountsToEntities,
        localIdColumn: accountsToEntities.entityId,    // On veut récupérer les entityId
        targetIdColumn: accountsToEntities.accountId,  // Filtrés par accountId
        roleColumn: accountsToEntities.role,           // Support du filtre par rôle (optionnel)
        roleParam: 'accountIdRole',                    // Nom du paramètre pour filtrer par rôle
      },
    },
    defaultSort: 'createdAt:desc',
  }

  // 1. Parser les paramètres de pagination
  const params = parsePaginationParams(query, config)

  // 2. Construire les conditions WHERE
  const whereConditions = await buildWhereConditions(params, config)

  // Ajouter les filtres spécifiques par rôle
  if (user.role === Role.OE) {
    const oeCondition = or(
      eq(entitiesTable.oeId, user.oeId),
      and(
        isNull(entitiesTable.oeId),
        isNotNull(entitiesTable.caseApprovedAt)
      )
    )
    if (oeCondition) {
      whereConditions.push(oeCondition)
    }
  }

  // 3. Construire la clause ORDER BY
  const orderByClause = buildOrderBy(params.sort, config)

  // 4. Mode unlimited: retourner toutes les données avec colonnes minimales
  if (params.isUnlimited) {
    const data = await db.query.entities.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      columns: {
        id: true,
        name: true,
      },
      ...(orderByClause && { orderBy: orderByClause }),
    })

    return formatResponse(params.isUnlimited, data)
  }

  // 5. Mode paginé: exécuter la requête avec tous les champs et relations
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

  // 6. Compter le total
  const total = await buildCountQuery(whereConditions, config)

  // 7. Retourner la réponse paginée
  return formatResponse(params.isUnlimited, data, params, total)
})
