/**
 * Types génériques pour les réponses API
 */

// État de chargement pour les requêtes
export interface LoadingState {
  loading: boolean
  error: string | null
}

// Réponse paginée générique
export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

// Paramètres de pagination
export interface PaginationParams {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// Réponse API générique avec succès
export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}
