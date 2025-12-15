import type { H3Event } from 'h3'
import { and, or, sql, asc, desc, ilike, inArray, isNull, type SQL } from 'drizzle-orm'
import { db } from '~~/server/database'
import type { PgTable } from 'drizzle-orm/pg-core'

/**
 * Configuration pour un filtre via table de jonction (many-to-many)
 *
 * Exemple pour filtrer les comptes par entité via accountsToEntities:
 * {
 *   junctionTable: accountsToEntities,
 *   localIdColumn: accountsToEntities.accountId,
 *   targetIdColumn: accountsToEntities.entityId,
 *   roleColumn: accountsToEntities.role
 * }
 */
export interface JunctionFilterConfig {
  /** Table de jonction (ex: accountsToEntities) */
  junctionTable: PgTable

  /** Colonne qui référence la table principale (ex: accountsToEntities.accountId) */
  localIdColumn: any

  /** Colonne qui référence l'entité à filtrer (ex: accountsToEntities.entityId) */
  targetIdColumn: any

  /** Colonne optionnelle pour filtrer par rôle dans la jonction (ex: accountsToEntities.role) */
  roleColumn?: any

  /**
   * Nom optionnel du paramètre de rôle associé (défaut: '{filterName}Role')
   * Ex: si filterName='entity', roleParam='entityRole'
   */
  roleParam?: string
}

/**
 * Configuration pour la pagination d'une table
 */
export interface PaginationConfig<TTable extends PgTable> {
  /** Table principale à interroger */
  table: TTable

  /** Champs sur lesquels effectuer la recherche globale (support dot notation pour relations: 'entity.name') */
  searchFields?: string[]

  /**
   * Configuration des filtres autorisés
   * - local: filtres sur les colonnes de la table principale
   * - relations: mapping des filtres vers les champs relationnels
   *
   * Exemple:
   * {
   *   local: ['type', 'oeId'],
   *   relations: {
   *     'entity.type': 'entity.type',    // Dot notation
   *     'entityType': 'entity.type'      // Alias court
   *   }
   * }
   */
  allowedFilters?: {
    local?: string[]
    relations?: Record<string, string>
  }

  /**
   * Configuration des tris autorisés
   * - local: colonnes de la table principale
   * - relations: colonnes relationnelles (dot notation)
   */
  allowedSorts?: {
    local?: string[]
    relations?: string[]
  }

  /**
   * Configuration des filtres via tables de jonction (many-to-many)
   *
   * Exemple:
   * {
   *   entityId: {
   *     junctionTable: accountsToEntities,
   *     localIdColumn: accountsToEntities.accountId,
   *     targetIdColumn: accountsToEntities.entityId,
   *     roleColumn: accountsToEntities.role,
   *     roleParam: 'entityRole'
   *   }
   * }
   */
  junctionFilters?: Record<string, JunctionFilterConfig>

  /** Inclure les enregistrements soft deleted (défaut: false) */
  includeSoftDeleted?: boolean

  /** Tri par défaut si non spécifié (format: 'column:order') */
  defaultSort?: string

  /** Limite par défaut (défaut: 25) */
  defaultLimit?: number

  /** Limite maximale (défaut: 100) */
  maxLimit?: number
}

/**
 * Paramètres de pagination parsés depuis les query params
 */
export interface ParsedPaginationParams {
  page: number
  limit: number
  offset: number
  search?: string
  sort?: { field: string; order: 'asc' | 'desc' }
  filters: Record<string, string | string[]>
  /** Mode unlimited activé (limit=-1) */
  isUnlimited: boolean
}

/**
 * Résultat paginé
 */
export interface PaginatedResult<T> {
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Parse les query parameters de pagination
 *
 * @example
 * ```typescript
 * const params = parsePaginationParams(event, {
 *   defaultLimit: 50,
 *   maxLimit: 200,
 *   defaultSort: 'createdAt:desc'
 * })
 * // params = { page: 1, limit: 50, offset: 0, search: '...', sort: {...}, filters: {...}, isUnlimited: false }
 * ```
 */
export function parsePaginationParams(
  query: Record<string, any>,
  config: Pick<PaginationConfig<any>, 'defaultLimit' | 'maxLimit' | 'defaultSort'> = {}
): ParsedPaginationParams {
  const defaultLimit = config.defaultLimit || 25
  const maxLimit = config.maxLimit || 100

  // Détecter le mode unlimited (limit=-1)
  const isUnlimited = query.limit === '-1'

  // Parse page
  const page = Math.max(1, parseInt(query.page as string) || 1)

  // Parse limit avec validation
  let limit: number
  if (isUnlimited) {
    // Mode unlimited: garder -1 tel quel
    limit = -1
  } else {
    limit = parseInt(query.limit as string) || defaultLimit
    limit = Math.min(Math.max(1, limit), maxLimit)
  }

  // Calculer l'offset
  const offset = isUnlimited ? 0 : (page - 1) * limit

  // Parse search
  const search = query.search as string | undefined

  // Parse sort (format: 'field:order')
  let sort: { field: string; order: 'asc' | 'desc' } | undefined
  if (query.sort) {
    const [field, order] = (query.sort as string).split(':')
    if (field && (order === 'asc' || order === 'desc')) {
      sort = { field, order }
    }
  } else if (config.defaultSort) {
    // Appliquer le tri par défaut si non spécifié
    const [field, order] = config.defaultSort.split(':')
    if (field && (order === 'asc' || order === 'desc')) {
      sort = { field, order }
    }
  }

  // Parse filters (tous les autres query params)
  const filters: Record<string, string | string[]> = {}
  const reservedParams = ['page', 'limit', 'search', 'sort']

  for (const [key, value] of Object.entries(query)) {
    if (!reservedParams.includes(key) && value) {
      // Support multiple values séparées par virgule
      const valueStr = value as string
      filters[key] = valueStr.includes(',') ? valueStr.split(',') : valueStr
    }
  }

  return { page, limit, offset, search, sort, filters, isUnlimited }
}

/**
 * Helper pour créer un identifiant SQL à partir d'un chemin (dot notation)
 * Exemple: 'entity.name' -> référence SQL vers entity.name
 */
function createSqlIdentifier(path: string): any {
  const parts = path.split('.')

  // Construire manuellement la référence SQL avec dot notation
  // On retourne directement l'objet qui peut être utilisé dans les requêtes
  if (parts.length === 1) {
    return sql.identifier(parts[0])
  } else {
    // Pour les relations, on construit la référence complète
    // ex: entity.name -> sql.raw('entity.name')
    return sql.raw(parts.map(p => `"${p}"`).join('.'))
  }
}

/**
 * Construit une condition de recherche globale sur plusieurs champs
 */
function buildSearchCondition(
  searchFields: string[],
  searchTerm: string,
  table: PgTable
): SQL | undefined {
  if (!searchTerm || searchFields.length === 0) return undefined

  const conditions = searchFields.map((field) => {
    // Support dot notation pour les relations
    if (field.includes('.')) {
      // Pour les champs relationnels, on utilise la syntaxe SQL directe
      const sqlField = createSqlIdentifier(field)
      return ilike(sqlField, `%${searchTerm}%`)
    } else {
      // Pour les champs locaux
      const column = (table as any)[field]
      return column ? ilike(column, `%${searchTerm}%`) : undefined
    }
  }).filter(Boolean) as SQL[]

  return conditions.length > 0 ? or(...conditions) : undefined
}

/**
 * Construit les conditions de filtrage
 */
function buildFilterConditions(
  filters: Record<string, string | string[]>,
  config: PaginationConfig<any>
): SQL[] {
  const conditions: SQL[] = []
  const table = config.table

  for (const [key, value] of Object.entries(filters)) {
    let column: any = null

    // Vérifier si c'est un filtre local autorisé
    if (config.allowedFilters?.local?.includes(key)) {
      column = (table as any)[key]
    }
    // Vérifier si c'est un filtre relationnel mappé
    else if (config.allowedFilters?.relations?.[key]) {
      const mappedField = config.allowedFilters.relations[key]
      if (mappedField.includes('.')) {
        column = createSqlIdentifier(mappedField)
      }
    }
    // Vérifier si c'est une dot notation directe autorisée
    else if (key.includes('.')) {
      const mappedField = config.allowedFilters?.relations?.[key] || key
      if (mappedField.includes('.')) {
        column = createSqlIdentifier(mappedField)
      }
    }

    if (column) {
      // Support multiple values (OR condition)
      if (Array.isArray(value)) {
        conditions.push(inArray(column, value))
      } else if (value === 'null') {
        // Handle "null" string as SQL NULL
        conditions.push(isNull(column))
      } else {
        // Check if filtering on an array column (PostgreSQL array)
        // Use the @> (contains) operator for array columns
        // This allows filtering actions.assignedRoles @> '{FEEF}'
        if (key === 'assignedRoles' || (column as any)?._?.dataType === 'array') {
          // For array columns, use PostgreSQL contains operator
          conditions.push(sql`${column} @> ARRAY[${value}]::text[]`)
        } else {
          conditions.push(sql`${column} = ${value}`)
        }
      }
    }
  }

  return conditions
}

/**
 * Construit une condition de filtrage via table de jonction
 * Récupère les IDs de la table principale via une requête sur la table de jonction
 *
 * @example
 * ```typescript
 * const ids = await buildJunctionFilterCondition('entityId', '5', {
 *   junctionTable: accountsToEntities,
 *   localIdColumn: accountsToEntities.accountId,
 *   targetIdColumn: accountsToEntities.entityId,
 *   roleColumn: accountsToEntities.role
 * }, params)
 * // ids = [1, 2, 3] (les IDs des comptes liés à l'entité 5)
 * ```
 *
 * @returns Tableau des IDs trouvés (peut être vide)
 */
async function buildJunctionFilterCondition(
  filterName: string,
  filterValue: string | string[],
  junctionConfig: JunctionFilterConfig,
  params: ParsedPaginationParams
): Promise<number[]> {
  const conditions: SQL[] = []

  // Filtre sur la colonne cible (ex: entityId)
  if (Array.isArray(filterValue)) {
    conditions.push(inArray(junctionConfig.targetIdColumn, filterValue.map(Number)))
  } else {
    conditions.push(sql`${junctionConfig.targetIdColumn} = ${Number(filterValue)}`)
  }

  // Filtre optionnel sur le rôle dans la jonction
  const roleParam = junctionConfig.roleParam || `${filterName}Role`
  const roleValue = params.filters[roleParam]
  if (roleValue && junctionConfig.roleColumn) {
    if (Array.isArray(roleValue)) {
      conditions.push(inArray(junctionConfig.roleColumn, roleValue))
    } else {
      conditions.push(sql`${junctionConfig.roleColumn} = ${roleValue}`)
    }
  }

  // Requête sur la table de jonction
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined
  const results = await db
    .select({ localId: junctionConfig.localIdColumn })
    .from(junctionConfig.junctionTable)
    .where(whereClause)

  return results.map((r) => r.localId)
}

/**
 * Construit les conditions WHERE complètes (soft delete + recherche + filtres)
 *
 * @example
 * ```typescript
 * const whereConditions = buildWhereConditions(params, {
 *   table: accounts,
 *   searchFields: ['firstname', 'lastname', 'email'],
 *   allowedFilters: {
 *     local: ['role', 'oeId']
 *   },
 *   includeSoftDeleted: false
 * })
 *
 * // Utiliser dans la requête
 * const data = await db.query.accounts.findMany({
 *   where: and(...whereConditions),
 *   // ...
 * })
 * ```
 */
export async function buildWhereConditions(
  params: ParsedPaginationParams,
  config: PaginationConfig<any>
): Promise<SQL[]> {
  const conditions: SQL[] = []

  // Soft delete automatique
  if (!config.includeSoftDeleted) {
    const deletedAtColumn = (config.table as any).deletedAt
    if (deletedAtColumn) {
      conditions.push(isNull(deletedAtColumn))
    }
  }

  // Recherche globale
  if (params.search && config.searchFields) {
    const searchCondition = buildSearchCondition(
      config.searchFields,
      params.search,
      config.table
    )
    if (searchCondition) {
      conditions.push(searchCondition)
    }
  }

  // Filtres via tables de jonction (many-to-many)
  if (config.junctionFilters) {
    for (const [filterName, junctionConfig] of Object.entries(config.junctionFilters)) {
      const filterValue = params.filters[filterName]
      if (filterValue) {
        // Récupérer les IDs via la table de jonction
        const ids = await buildJunctionFilterCondition(filterName, filterValue, junctionConfig, params)

        // Si aucun ID trouvé, ajouter une condition impossible pour forcer un résultat vide
        if (ids.length === 0) {
          conditions.push(sql`1 = 0`)
        } else {
          // Ajouter la condition inArray
          const idColumn = (config.table as any).id
          conditions.push(inArray(idColumn, ids))
        }
      }
    }
  }

  // Filtres classiques (local et relations)
  if (Object.keys(params.filters).length > 0) {
    const filterConditions = buildFilterConditions(params.filters, config)
    conditions.push(...filterConditions)
  }

  return conditions
}

/**
 * Construit la clause ORDER BY
 *
 * @example
 * ```typescript
 * const orderByClause = buildOrderBy(params.sort, {
 *   table: accounts,
 *   allowedSorts: {
 *     local: ['createdAt', 'firstname'],
 *     relations: ['oe.name']
 *   }
 * })
 *
 * // Utiliser dans la requête
 * const data = await db.query.accounts.findMany({
 *   orderBy: orderByClause,
 *   // ...
 * })
 * ```
 */
export function buildOrderBy(
  sort: { field: string; order: 'asc' | 'desc' } | undefined,
  config: PaginationConfig<any>
): SQL | SQL[] | undefined {
  if (!sort) return undefined

  const table = config.table
  let column: any = null

  // Vérifier si c'est un tri local autorisé
  if (config.allowedSorts?.local?.includes(sort.field)) {
    column = (table as any)[sort.field]
  }
  // Vérifier si c'est un tri relationnel autorisé (dot notation)
  else if (config.allowedSorts?.relations?.includes(sort.field)) {
    if (sort.field.includes('.')) {
      column = createSqlIdentifier(sort.field)
    }
  }

  if (!column) return undefined

  // Appliquer l'ordre avec NULLS LAST
  const orderFn = sort.order === 'asc' ? asc : desc
  return sql`${orderFn(column)} NULLS LAST`
}

/**
 * Compte le nombre total de résultats pour une requête
 *
 * @example
 * ```typescript
 * const total = await buildCountQuery(whereConditions, {
 *   table: accounts
 * })
 * // total = 150
 * ```
 */
export async function buildCountQuery(
  whereConditions: SQL[],
  config: Pick<PaginationConfig<any>, 'table'>
): Promise<number> {
  const whereClause = whereConditions.length > 0 ? and(...whereConditions) : sql`1=1`

  const countResult = await db.execute(
    sql`SELECT COUNT(*) as count FROM ${config.table} WHERE ${whereClause}`
  )

  return Number(countResult.rows[0]?.count || 0)
}

/**
 * Formate la réponse paginée avec metadata
 *
 * @example
 * ```typescript
 * const data = await db.query.accounts.findMany({ ... })
 * const total = await buildCountQuery(whereConditions, { table: accounts })
 *
 * return formatPaginatedResponse(data, params, total)
 * // { data: [...], meta: { page: 1, limit: 25, total: 150, totalPages: 6 } }
 * ```
 */
export function formatPaginatedResponse<T>(
  data: T[],
  params: ParsedPaginationParams,
  total: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / params.limit)

  return {
    data,
    meta: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
    },
  }
}

/**
 * Formate la réponse selon le mode (unlimited ou paginé)
 *
 * @example
 * ```typescript
 * // Mode unlimited
 * const data = await db.query.entities.findMany({ ... })
 * return formatResponse(true, data)
 * // Retourne: { data: [...] }
 *
 * // Mode paginé
 * const data = await db.query.entities.findMany({ ... })
 * const total = await buildCountQuery(whereConditions, config)
 * return formatResponse(false, data, params, total)
 * // Retourne: { data: [...], meta: { page, limit, total, totalPages } }
 * ```
 */
export function formatResponse<T>(
  isUnlimited: boolean,
  data: T[],
  params?: ParsedPaginationParams,
  total?: number
): { data: T[] } | PaginatedResult<T> {
  if (isUnlimited) {
    return { data }
  }

  if (!params || total === undefined) {
    throw new Error('formatResponse: params and total are required for paginated mode')
  }

  return formatPaginatedResponse(data, params, total)
}

