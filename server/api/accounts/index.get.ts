import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '~~/server/database'
import { accounts as accountsTable, accountsToEntities, auditorsToOE } from '~~/server/database/schema'
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
 * - auditorOeId: filtre par OE pour les auditeurs (retourne uniquement les auditeurs liés à cet OE)
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
 * - GET /api/accounts?auditorOeId=2 (tous les auditeurs liés à l'OE 2)
 */
export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur connecté est FEEF
  const { user } = await requireUserSession(event)

  const query = getQuery(event)
  const roleFilter = query.role as string | undefined

  // Détection du cas spécial : OE sans filtre role (nécessite fusion de deux requêtes)
  const isOeWithoutRoleFilter = user.role === Role.OE && (user.oeRole === OERole.ADMIN || user.oeRole === OERole.ACCOUNT_MANAGER) && !roleFilter

  if (user.role === Role.FEEF) {
    // FEEF : aucun filtre automatique

  } else if (user.role === Role.OE && (user.oeRole === OERole.ADMIN || user.oeRole === OERole.ACCOUNT_MANAGER)) {
    // Pour les OE, filtrer selon le type de comptes recherchés

    // Vérifier si on cherche spécifiquement des AUDITOR
    const isFilteringAuditors = roleFilter && (
      roleFilter === 'AUDITOR' ||
      (roleFilter.includes(',') && roleFilter.split(',').includes('AUDITOR'))
    )

    if (isFilteringAuditors && roleFilter === 'AUDITOR') {
      // Recherche exclusive d'auditeurs : utiliser uniquement la jonction
      query.auditorOeId = String(user.oeId)
    } else if (!isOeWithoutRoleFilter) {
      // Recherche avec filtre role spécifique (OE, etc.)
      query.oeId = String(user.oeId)
    }
    // Si isOeWithoutRoleFilter === true, ne pas appliquer de filtres automatiques
    // (géré plus bas avec une logique spéciale)

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
      local: ['createdAt', 'firstname', 'lastname', 'email', 'lastLoginAt'],
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
      auditorOeId: {
        junctionTable: auditorsToOE,
        localIdColumn: auditorsToOE.auditorId,
        targetIdColumn: auditorsToOE.oeId,
      },
    },
    defaultSort: 'createdAt:desc',
  }

  // 1. Parser les paramètres de pagination
  const params = parsePaginationParams(query, config)

  // CAS SPÉCIAL : OE sans filtre role → Fusionner comptes OE + Auditeurs
  if (isOeWithoutRoleFilter && user.oeId) {
    // Requête 1 : Comptes OE de l'organisation (oe_id = user.oeId)
    const oeAccounts = await db.query.accounts.findMany({
      where: and(
        eq(accountsTable.oeId, user.oeId),
        isNull(accountsTable.deletedAt)
      ),
      columns: { password: false },
      with: {
        oe: { columns: { id: true, name: true } },
        accountsToEntities: {
          columns: { entityId: true, role: true },
          with: { entity: { columns: { id: true, name: true } } },
        },
        auditorsToOE: {
          columns: { oeId: true },
          with: { oe: { columns: { id: true, name: true } } },
        },
      },
    })

    // Requête 2 : Auditeurs liés via auditors_to_oe
    const auditorIds = await db
      .select({ auditorId: auditorsToOE.auditorId })
      .from(auditorsToOE)
      .where(eq(auditorsToOE.oeId, user.oeId))

    const auditorAccounts = auditorIds.length > 0
      ? await db.query.accounts.findMany({
          where: and(
            inArray(accountsTable.id, auditorIds.map(a => a.auditorId)),
            isNull(accountsTable.deletedAt)
          ),
          columns: { password: false },
          with: {
            oe: { columns: { id: true, name: true } },
            accountsToEntities: {
              columns: { entityId: true, role: true },
              with: { entity: { columns: { id: true, name: true } } },
            },
            auditorsToOE: {
              columns: { oeId: true },
              with: { oe: { columns: { id: true, name: true } } },
              where: eq(auditorsToOE.oeId, user.oeId),
            },
          },
        })
      : []

    // Fusionner et dédupliquer par ID
    const allAccounts = [...oeAccounts, ...auditorAccounts]
    const uniqueAccounts = Array.from(
      new Map(allAccounts.map(acc => [acc.id, acc])).values()
    )

    // Appliquer tri, pagination et retourner
    const total = uniqueAccounts.length
    const sorted = uniqueAccounts.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    const paginated = sorted.slice(params.offset, params.offset + params.limit)

    return formatResponse(false, paginated, params, total)
  }

  // 2. Construire les conditions WHERE (gère automatiquement les junction filters)
  const whereConditions = await buildWhereConditions(params, config)

  // 3. Extraire entityId et auditorOeId pour le filtrage des relations retournées
  const entityIdParam = params.filters.entityId ? Number(params.filters.entityId) : undefined
  const auditorOeIdParam = params.filters.auditorOeId ? Number(params.filters.auditorOeId) : undefined

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
      auditorsToOE: {
        columns: {
          oeId: true,
        },
        with: {
          oe: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
        // Si auditorOeId est fourni, filtrer les relations pour ne garder que celle-ci
        ...(auditorOeIdParam && {
          where: eq(auditorsToOE.oeId, auditorOeIdParam),
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
