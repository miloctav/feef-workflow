/**
 * Métadonnées de pagination retournées par l'API
 */
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

/**
 * Réponse paginée générique de l'API
 */
export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

/**
 * Paramètres de requête pour la pagination
 */
export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
  sort?: string
  [key: string]: any // Pour les filtres supplémentaires
}

/**
 * État de pagination consolidé
 */
export interface PaginationState {
  /** Numéro de page actuelle */
  page: number
  /** Nombre d'éléments par page */
  limit: number
  /** Nombre total d'éléments */
  total: number
  /** Nombre total de pages */
  totalPages: number
  /** Y a-t-il une page suivante ? */
  hasNext: boolean
  /** Y a-t-il une page précédente ? */
  hasPrev: boolean
}

/**
 * Options de configuration pour usePaginatedFetch
 */
export interface PaginatedFetchOptions {
  /** Clé unique pour le cache (défaut: URL) */
  key?: string
  /** Limite par défaut d'éléments par page */
  defaultLimit?: number
  /** Paramètres initiaux */
  initialParams?: PaginationParams
  /** Exécuter immédiatement la requête (défaut: true) */
  immediate?: boolean
  /** Activer le watch sur les paramètres (défaut: true) */
  watch?: boolean
}
