import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { accounts } from '~~/server/database/schema'
import { SessionUser } from '~~/server/types/session'
import { getEntityContext } from '~~/server/utils/entity-context'
import { validate2FACode } from '~~/server/utils/two-factor'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const { accountId, code } = body

  // Validation
  if (!accountId || !code) {
    throw createError({
      statusCode: 400,
      message: 'ID de compte et code requis',
    })
  }

  // Vérifier le code 2FA
  const validation = await validate2FACode(accountId, code)

  if (!validation.valid) {
    throw createError({
      statusCode: 400,
      message: validation.error || 'Code invalide',
      data: {
        attemptsRemaining: validation.attemptsRemaining,
      },
    })
  }

  // Code valide, charger les données utilisateur
  const user = await db.query.accounts.findFirst({
    where: eq(accounts.id, accountId),
    with: {
      accountsToEntities: {
        columns: {
          entityId: true,
          role: true,
        },
      },
    },
  })

  if (!user || user.deletedAt) {
    throw createError({
      statusCode: 404,
      message: 'Utilisateur non trouvé',
    })
  }

  // Préparer les données de session selon le rôle
  let sessionData: SessionUser

  if (user.role === Role.OE) {
    // Utilisateur OE avec son rôle spécifique
    if (!user.oeId || !user.oeRole) {
      throw createError({
        statusCode: 500,
        message: 'Configuration utilisateur OE invalide',
      })
    }

    sessionData = {
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role,
      oeId: user.oeId,
      oeRole: user.oeRole,
      passwordChangedAt: user.passwordChangedAt,
      isActive: user.isActive,
    }
  } else if (user.role === Role.ENTITY) {
    // Utilisateur Entity avec ses rôles sur différentes entités
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

    sessionData = {
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
    }
  } else {
    // Utilisateur FEEF ou AUDITOR (pas de sous-rôles)
    sessionData = {
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role,
      oeId: user.oeId,
      oeRole: user.oeRole,
      passwordChangedAt: user.passwordChangedAt,
      isActive: user.isActive,
    }
  }

  // Créer la session utilisateur
  await setUserSession(event, {
    user: sessionData,
  })

  // Retourner les informations utilisateur
  return {
    data: {
      success: true,
      user: sessionData,
    },
  }
})
