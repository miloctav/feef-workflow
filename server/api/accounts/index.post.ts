import { eq } from 'drizzle-orm'
import { accounts, accountsToEntities, NewAccount, Role } from '~~/server/database/schema'
import { db } from '~~/server/database'
import { generatePasswordResetUrlAndToken } from '~~/server/utils/password-reset'
import { sendAccountCreationEmail } from '~~/server/services/mail'

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


  if (currentUser.role !== Role.FEEF) {
    throw createError({
      statusCode: 403,
      message: 'Seul un administrateur FEEF peut créer des comptes',
    })
  }

  // Récupérer les données du corps de la requête
  const body = await readBody<CreateAccountBody>(event)

  const { firstname, lastname, email, role, oeId, oeRole, entityRoles } = body

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
  }

  if (role === Role.ENTITY) {
    if (!entityRoles || entityRoles.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'entityRoles est requis pour un compte Entity (au moins une entité)',
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

  // Préparer les données du compte
  const newAccountData: NewAccount = {
    firstname,
    lastname,
    email,
    role: role as any,
    oeId: role === Role.OE ? oeId : null,
    oeRole: role === Role.OE ? (oeRole as any) : null,
    passwordChangedAt: null, // Sera mis à jour quand l'utilisateur définira son mot de passe
    isActive: false, // Le compte sera activé quand l'utilisateur définira son mot de passe
  }

  // Créer le compte
  const [newAccount] = await db
    .insert(accounts)
    .values(newAccountData)
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

  // Générer le token et l'URL de réinitialisation via la fonction utilitaire partagée
  const { resetUrl } = await generatePasswordResetUrlAndToken(newAccount.id, event)

  const emailResult = await sendAccountCreationEmail({
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

  // Retourner le compte créé (sans le mot de passe)
  return {
    account: newAccount,
    emailSent: emailResult.success,
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
