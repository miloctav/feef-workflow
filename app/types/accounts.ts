import type { Account, Role, OERole, EntityRole } from '~~/server/database/schema'

/**
 * Types pour les comptes utilisateurs
 */

// Compte sans le mot de passe (pour affichage)
export type AccountPublic = Omit<Account, 'password'>

// Données pour créer un compte
export interface CreateAccountData {
  firstname: string
  lastname: string
  email: string
  password: string
  role: typeof Role[keyof typeof Role]
  // Pour EVALUATOR_ORGANIZATION
  evaluatorOrganizationId?: number
  oeRole?: typeof OERole[keyof typeof OERole]
  // Pour ENTITY
  entityRoles?: Array<{
    entityId: number
    role: typeof EntityRole[keyof typeof EntityRole]
  }>
}

// Données pour mettre à jour un compte
export interface UpdateAccountData {
  firstname?: string
  lastname?: string
  email?: string
  password?: string
  // Autres champs selon le rôle
  evaluatorOrganizationId?: number
  oeRole?: typeof OERole[keyof typeof OERole]
  entityRoles?: Array<{
    entityId: number
    role: typeof EntityRole[keyof typeof EntityRole]
  }>
}

// Compte avec relations (retourné par l'API)
export interface AccountWithRelations extends AccountPublic {
  evaluatorOrganization?: {
    id: number
    name: string
  }
  accountsToEntities?: Array<{
    entityId: number
    role: typeof EntityRole[keyof typeof EntityRole]
    entity: {
      id: number
      name: string
    }
  }>
}
