import bcrypt from 'bcrypt'
import { eq, and, isNull, inArray } from 'drizzle-orm'
import { accounts, accountsToEntities, entities, oes, NewAccount } from '~~/server/database/schema'
import { db } from '~~/server/database'
import { generatePasswordResetUrlAndToken } from '~~/server/utils/password-reset'
import { sendAccountCreationEmail } from '~~/server/services/mail'
import { forInsert } from '~~/server/utils/tracking'

interface CreateAccountBody {
  firstname: string
  lastname: string
  email: string
  role: string
  // Pour OE
  oeId?: number
  oeRole?: string
  // Pour ENTITY
  entityRoles?: Array<{
    entityId: number
    role: string
  }>
}

export default defineEventHandler(async (event) => {
  console.log('[Accounts API] Création de compte')
  // Vérifier que l'utilisateur connecté est FEEF
  const { user: currentUser } = await requireUserSession(event)

  // Récupérer les données du corps de la requête
  const body = await readBody<CreateAccountBody>(event)

  const { firstname, lastname, email, role, oeId, oeRole, entityRoles } = body


  if (currentUser.role === Role.FEEF) {

  } else if (currentUser.role === Role.OE && currentUser.oeRole === OERole.ADMIN) {
    if(currentUser.oeId !== oeId) {
      throw createError({
        statusCode: 403,
        message: 'Vous ne pouvez créer des comptes que pour votre propre OE',
      })
    }

  } else {
    throw createError({
      statusCode: 403,
      message: 'Vous n\'êtes pas autorisé à créer des comptes utilisateurs',
    })
  }

  // Validation de base
  if (!firstname || !lastname || !email || !role) {
    throw createError({
      statusCode: 400,
      message: 'Tous les champs obligatoires doivent être renseignés',
    })
  }

  // Validation du rôle
  const validRoles = [Role.FEEF, Role.OE, Role.AUDITOR, Role.ENTITY]
  if (!validRoles.includes(role as any)) {
    throw createError({
      statusCode: 400,
      message: 'Rôle invalide',
    })
  }

  // Validation spécifique selon le rôle
  if (role === Role.OE) {
    if (!oeId || !oeRole) {
      throw createError({
        statusCode: 400,
        message: 'oeId et oeRole sont requis pour un compte OE',
      })
    }

    // Vérifier que l'OE existe et n'est pas supprimé
    const [oe] = await db
      .select({ id: oes.id })
      .from(oes)
      .where(and(eq(oes.id, oeId), isNull(oes.deletedAt)))
      .limit(1)

    if (!oe) {
      throw createError({
        statusCode: 400,
        message: `L'organisme évaluateur avec l'ID ${oeId} n'existe pas ou a été supprimé`,
      })
    }
  }

  if (role === Role.ENTITY) {
    if (!entityRoles || entityRoles.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'entityRoles est requis pour un compte Entity (au moins une entité)',
      })
    }

    // Vérifier qu'il n'y a pas de doublons dans entityRoles
    const entityIds = entityRoles.map(er => er.entityId)
    const uniqueEntityIds = [...new Set(entityIds)]
    if (entityIds.length !== uniqueEntityIds.length) {
      throw createError({
        statusCode: 400,
        message: 'Le tableau entityRoles contient des doublons. Chaque entité ne peut être associée qu\'une seule fois.',
      })
    }

    // Vérifier que toutes les entités existent, ne sont pas supprimées et sont en mode MASTER
    const entitiesData = await db
      .select({
        id: entities.id,
        mode: entities.mode,
        name: entities.name
      })
      .from(entities)
      .where(and(inArray(entities.id, entityIds), isNull(entities.deletedAt)))

    // Vérifier que toutes les entités demandées ont été trouvées
    if (entitiesData.length !== entityIds.length) {
      const foundIds = entitiesData.map(e => e.id)
      const missingIds = entityIds.filter(id => !foundIds.includes(id))
      throw createError({
        statusCode: 400,
        message: `Les entités suivantes n'existent pas ou ont été supprimées : ${missingIds.join(', ')}`,
      })
    }

    // Vérifier que toutes les entités sont en mode MASTER
    const followerEntities = entitiesData.filter(e => e.mode !== 'MASTER')
    if (followerEntities.length > 0) {
      const followerNames = followerEntities.map(e => `${e.name} (ID: ${e.id})`).join(', ')
      throw createError({
        statusCode: 400,
        message: `Les entités suivantes sont en mode FOLLOWER et ne peuvent pas être associées à des comptes : ${followerNames}. Seules les entités MASTER peuvent avoir des comptes associés.`,
      })
    }
  }

  console.log('[Accounts API] Création du compte pour', email, 'avec le rôle', role)

  // Vérifier si l'email existe déjà
  const [existingUser] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.email, email))
    .limit(1)

  if (existingUser) {
    throw createError({
      statusCode: 409,
      message: 'Un compte avec cet email existe déjà',
    })
  }

  console.log('[Accounts API] Insertion en base du nouveau compte')

  // Vérifier si on est en mode DEV via le runtimeConfig
  const config = useRuntimeConfig(event)
  const isDevMode = config.devMode

  // Préparer les données du compte
  const newAccountData: NewAccount = {
    firstname,
    lastname,
    email,
    role: role as any,
    oeId: role === Role.OE ? oeId : null,
    oeRole: role === Role.OE ? (oeRole as any) : null,
    passwordChangedAt: isDevMode ? new Date() : null, // En DEV, on considère que le mot de passe a été défini
    isActive: isDevMode ? true : false, // En DEV, le compte est actif directement
    password: isDevMode ? await bcrypt.hash('password', 10) : undefined, // En DEV, mot de passe par défaut
  }

  // Créer le compte
  const [newAccount] = await db
    .insert(accounts)
    .values(forInsert(event, newAccountData))
    .returning({
      id: accounts.id,
      firstname: accounts.firstname,
      lastname: accounts.lastname,
      email: accounts.email,
      role: accounts.role,
      oeId: accounts.oeId,
      oeRole: accounts.oeRole,
    })

  // Si c'est un compte Entity, créer les liaisons avec les entités
  if (role === Role.ENTITY && entityRoles && entityRoles.length > 0) {
    await db.insert(accountsToEntities).values(
      entityRoles.map(er => ({
        accountId: newAccount.id,
        entityId: er.entityId,
        role: er.role as any,
      }))
    )
  }

  console.log('[Accounts API] Nouveau compte créé avec ID', newAccount.id)

  // En mode DEV, on ne génère pas de token et on n'envoie pas d'email
  let emailResult = { success: false }
  if (!isDevMode) {
    // Générer le token et l'URL de réinitialisation via la fonction utilitaire partagée
    const { resetUrl } = await generatePasswordResetUrlAndToken(newAccount.id, event)

    emailResult = await sendAccountCreationEmail({
      email: newAccount.email,
      firstName: newAccount.firstname,
      lastName: newAccount.lastname,
      role: getRoleName(newAccount.role),
      resetPasswordUrl: resetUrl,
      expiresInHours: 48
    })

    console.log('[Accounts API] Email de création de compte envoyé à', newAccount.email, 'avec le résultat', emailResult)

    if (!emailResult.success) {
      console.error('[Accounts API] Erreur lors de l\'envoi de l\'email:', emailResult.error)
      // Note: On ne bloque pas la création du compte si l'email échoue
      // L'admin pourra renvoyer l'email manuellement via l'endpoint resend-email
    }
  } else {
    console.log('[Accounts API] Mode DEV activé - Pas d\'envoi d\'email. Mot de passe par défaut: "password"')
  }

  // Retourner le compte créé (sans le mot de passe)
  return {
    account: newAccount,
    emailSent: emailResult.success,
    ...(isDevMode && { devMode: true, defaultPassword: 'password' }),
    ...(role === Role.ENTITY && { entityRoles }),
  }
})

/**
 * Helper pour formater les noms de rôles en français
 */
function getRoleName(role: string): string {
  const roleNames: Record<string, string> = {
    'FEEF': 'Administrateur FEEF',
    'OE': 'Organisme Évaluateur',
    'AUDITOR': 'Auditeur',
    'ENTITY': 'Entreprise'
  }
  return roleNames[role] || role
}
