import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { accounts } from '~~/server/database/schema'
import { SessionUser } from '~~/server/types/session'
import { getEntityContext } from '~~/server/utils/entity-context'

type UserWithEntities = typeof accounts.$inferSelect & {
  accountsToEntities: { entityId: number; role: any }[]
}

export async function buildSessionData(user: UserWithEntities): Promise<SessionUser> {
  if (user.role === Role.OE) {
    if (!user.oeId || !user.oeRole) {
      throw createError({
        statusCode: 500,
        message: 'Configuration utilisateur OE invalide',
      })
    }

    return {
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role,
      oeId: user.oeId,
      oeRole: user.oeRole,
      passwordChangedAt: user.passwordChangedAt,
      isActive: user.isActive,
      emailNotificationsEnabled: user.emailNotificationsEnabled,
    }
  }

  if (user.role === Role.ENTITY) {
    let currentEntityId = user.currentEntityId
    let currentEntityRole = null

    // Si pas de currentEntityId défini, prendre la première entité
    if (!currentEntityId && user.accountsToEntities.length > 0) {
      currentEntityId = user.accountsToEntities[0].entityId

      // Mettre à jour currentEntityId en DB
      await db.update(accounts)
        .set({ currentEntityId })
        .where(eq(accounts.id, user.id))
    }

    // Récupérer le rôle sur l'entité courante
    if (currentEntityId) {
      const entityContext = await getEntityContext(user.id, currentEntityId)
      if (entityContext) {
        currentEntityRole = entityContext.role
      }
    }

    return {
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role,
      oeId: user.oeId,
      oeRole: user.oeRole,
      currentEntityId,
      currentEntityRole,
      entityRoles: user.accountsToEntities.map((ate: { entityId: any; role: any }) => ({
        entityId: ate.entityId,
        role: ate.role,
      })),
      passwordChangedAt: user.passwordChangedAt,
      isActive: user.isActive,
      emailNotificationsEnabled: user.emailNotificationsEnabled,
    }
  }

  // Utilisateur FEEF ou AUDITOR (pas de sous-rôles)
  return {
    id: user.id,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    role: user.role,
    oeId: user.oeId,
    oeRole: user.oeRole,
    passwordChangedAt: user.passwordChangedAt,
    isActive: user.isActive,
    emailNotificationsEnabled: user.emailNotificationsEnabled,
  }
}
