import type { Account } from '~~/server/database/schema'
import { Role, OERole, EntityRole } from '#shared/types/roles'

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
  password?: string
  role: typeof Role[keyof typeof Role]
  // Pour OE
  oeId?: number
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
  oeId?: number
  oeRole?: typeof OERole[keyof typeof OERole]
  entityRoles?: Array<{
    entityId: number
    role: typeof EntityRole[keyof typeof EntityRole]
  }>
}

// Compte avec relations (retourné par l'API)
export interface AccountWithRelations extends AccountPublic {
  oe?: {
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
