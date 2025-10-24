import type { Account } from '../database/schema'
import { type RoleType, type OERoleType, type EntityRoleType } from '../database/schema'

// Type de base pour les données de session (sans le mot de passe)
type BaseSessionUser = Omit<Account, 'password' | 'createdAt' | 'deletedAt'>

// Type pour les rôles Entity
export type EntityRoleData = {
  entityId: number
  role: EntityRoleType
}

// Interface de base pour la session utilisateur
export interface SessionUser extends Omit<BaseSessionUser, 'oeId' | 'oeRole' | 'currentEntityId'> {
  role: RoleType
  oeId: number | null
  oeRole: OERoleType | null
  currentEntityId?: number
  currentEntityRole?: EntityRoleType
  entityRoles?: EntityRoleData[]
}

// Extension des types nuxt-auth-utils
declare module '#auth-utils' {
  interface User extends SessionUser {}
}

// Extension du contexte H3
declare module 'h3' {
  interface H3EventContext {
    user?: SessionUser
  }
}

export {}
