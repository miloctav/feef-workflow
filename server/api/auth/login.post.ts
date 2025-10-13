import bcrypt from 'bcrypt'
import { db } from '~~/server/database'
import { Role } from '~~/server/database/schema'
import { SessionUser } from '~~/server/types/session'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const { email, password } = body

  // Validation
  if (!email || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email et mot de passe requis',
    })
  }

  // Recherche de l'utilisateur avec Drizzle Query
  const user = await db.query.accounts.findFirst({
    where: (accounts: { email: any }, { eq }: any) => eq(accounts.email, email),
    with: {
      accountsToEntities: {
        columns: {
          entityId: true,
          role: true,
        },
      },
    },
  })

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Email ou mot de passe incorrect',
    })
  }

  // Vérifier si le compte n'est pas supprimé
  if (user.deletedAt) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Ce compte a été désactivé',
    })
  }

  // Vérification du mot de passe
  const isPasswordValid = await bcrypt.compare(password, user.password)

  if (!isPasswordValid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Email ou mot de passe incorrect',
    })
  }

  // Préparer les données de session selon le rôle
  let sessionData: SessionUser

  if (user.role === Role.EVALUATOR_ORGANIZATION) {
    // Utilisateur OE avec son rôle spécifique
    if (!user.evaluatorOrganizationId || !user.oeRole) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Configuration utilisateur OE invalide',
      })
    }

    sessionData = {
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role,
      evaluatorOrganizationId: user.evaluatorOrganizationId,
      oeRole: user.oeRole,
    }
  } else if (user.role === Role.ENTITY) {
    // Utilisateur Entity avec ses rôles sur différentes entités
    sessionData = {
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role,
      evaluatorOrganizationId: user.evaluatorOrganizationId,
      oeRole: user.oeRole,
      entityRoles: user.accountsToEntities.map((ate: { entityId: any; role: any }) => ({
        entityId: ate.entityId,
        role: ate.role,
      })),
    }
  } else {
    // Utilisateur FEEF ou AUDITOR (pas de sous-rôles)
    sessionData = {
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role,
      evaluatorOrganizationId: user.evaluatorOrganizationId,
      oeRole: user.oeRole,
    }
  }

  // Définir la session utilisateur avec nuxt-auth-utils
  await setUserSession(event, {
    user: sessionData,
  })

  // Retourner les informations utilisateur (sans le mot de passe)
  return {
    user: sessionData,
  }
})
