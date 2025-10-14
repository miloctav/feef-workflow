import type { H3Event } from 'h3'
import { and, or, sql, asc, desc, ilike, inArray, isNull, type SQL } from 'drizzle-orm'
import { db } from '~~/server/database'
import type { PgTable } from 'drizzle-orm/pg-core'

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
 * // params = { page: 1, limit: 50, offset: 0, search: '...', sort: {...}, filters: {...} }
 * ```
 */
export function parsePaginationParams(
  event: H3Event,
  config: Pick<PaginationConfig<any>, 'defaultLimit' | 'maxLimit' | 'defaultSort'> = {}
): ParsedPaginationParams {
  const query = getQuery(event)
  const defaultLimit = config.defaultLimit || 25
  const maxLimit = config.maxLimit || 100

  // Parse page
  const page = Math.max(1, parseInt(query.page as string) || 1)

  // Parse limit avec validation
  let limit = parseInt(query.limit as string) || defaultLimit
  limit = Math.min(Math.max(1, limit), maxLimit)

  // Calculer l'offset
  const offset = (page - 1) * limit

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

  return { page, limit, offset, search, sort, filters }
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
      } else {
        conditions.push(sql`${column} = ${value}`)
      }
    }
  }

  return conditions
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
export function buildWhereConditions(
  params: ParsedPaginationParams,
  config: PaginationConfig<any>
): SQL[] {
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

  // Filtres
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
 * Helper pour créer une réponse paginée complète
 *
 * @example
 * ```typescript
 * export default defineEventHandler(async (event) => {
 *   const config = {
 *     table: accounts,
 *     searchFields: ['firstname', 'lastname'],
 *     allowedFilters: { local: ['role'] },
 *     allowedSorts: { local: ['createdAt'] }
 *   }
 *
 *   const params = parsePaginationParams(event, config)
 *   const whereConditions = buildWhereConditions(params, config)
 *   const orderByClause = buildOrderBy(params.sort, config)
 *
 *   const data = await db.query.accounts.findMany({
 *     where: and(...whereConditions),
 *     orderBy: orderByClause,
 *     limit: params.limit,
 *     offset: params.offset
 *   })
 *
 *   const total = await buildCountQuery(whereConditions, config)
 *   return formatPaginatedResponse(data, params, total)
 * })
 * ```
 */
