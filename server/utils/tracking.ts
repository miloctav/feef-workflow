import type { H3Event } from 'h3'

/**
 * Helper pour ajouter automatiquement les champs de tracking lors d'un INSERT
 * @param event - L'événement H3 contenant le contexte utilisateur
 * @param data - Les données à insérer
 * @returns Les données enrichies avec createdBy et createdAt
 */
export function forInsert<T extends Record<string, any>>(event: H3Event, data: T) {
  const userId = event.context.userId

  return {
    ...data,
    createdBy: userId,
    createdAt: new Date(),
  }
}

/**
 * Helper pour ajouter automatiquement les champs de tracking lors d'un UPDATE
 * @param event - L'événement H3 contenant le contexte utilisateur
 * @param data - Les données à mettre à jour
 * @returns Les données enrichies avec updatedBy et updatedAt
 */
export function forUpdate<T extends Record<string, any>>(event: H3Event, data: T) {
  const userId = event.context.userId

  return {
    ...data,
    updatedBy: userId,
    updatedAt: new Date(),
  }
}

/**
 * Helper pour soft delete avec tracking
 * @param event - L'événement H3 contenant le contexte utilisateur
 * @returns Les données de soft delete avec updatedBy et updatedAt
 */
export function forDelete(event: H3Event) {
  const userId = event.context.userId

  return {
    deletedAt: new Date(),
    updatedBy: userId,
    updatedAt: new Date(),
  }
}
