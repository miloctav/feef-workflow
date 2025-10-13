import { eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import { accounts, accountsToEntities, NewAccount, Role } from '~~/server/database/schema'
import { db } from '~~/server/database'

interface CreateAccountBody {
  firstname: string
  lastname: string
  email: string
  password: string
  role: string
  // Pour EVALUATOR_ORGANIZATION
  evaluatorOrganizationId?: number
  oeRole?: string
  // Pour ENTITY
  entityRoles?: Array<{
    entityId: number
    role: string
  }>
}

export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur connecté est FEEF
  const { user: currentUser } = await requireUserSession(event)

  if (currentUser.role !== Role.FEEF) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Seul un administrateur FEEF peut créer des comptes',
    })
  }

  // Récupérer les données du corps de la requête
  const body = await readBody<CreateAccountBody>(event)

  const { firstname, lastname, email, password, role, evaluatorOrganizationId, oeRole, entityRoles } = body

  // Validation de base
  if (!firstname || !lastname || !email || !password || !role) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tous les champs obligatoires doivent être renseignés',
    })
  }

  // Validation du rôle
  const validRoles = [Role.FEEF, Role.EVALUATOR_ORGANIZATION, Role.AUDITOR, Role.ENTITY]
  if (!validRoles.includes(role as any)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Rôle invalide',
    })
  }

  // Validation spécifique selon le rôle
  if (role === Role.EVALUATOR_ORGANIZATION) {
    if (!evaluatorOrganizationId || !oeRole) {
      throw createError({
        statusCode: 400,
        statusMessage: 'evaluatorOrganizationId et oeRole sont requis pour un compte OE',
      })
    }
  }

  if (role === Role.ENTITY) {
    if (!entityRoles || entityRoles.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'entityRoles est requis pour un compte Entity (au moins une entité)',
      })
    }
  }

  // Vérifier si l'email existe déjà
  const [existingUser] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.email, email))
    .limit(1)

  if (existingUser) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Un compte avec cet email existe déjà',
    })
  }

  // Hasher le mot de passe
  const hashedPassword = await bcrypt.hash(password, 10)

  // Préparer les données du compte
  const newAccountData: NewAccount = {
    firstname,
    lastname,
    email,
    password: hashedPassword,
    role: role as any,
    evaluatorOrganizationId: role === Role.EVALUATOR_ORGANIZATION ? evaluatorOrganizationId : null,
    oeRole: role === Role.EVALUATOR_ORGANIZATION ? (oeRole as any) : null,
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
      evaluatorOrganizationId: accounts.evaluatorOrganizationId,
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

  // Retourner le compte créé (sans le mot de passe)
  return {
    account: newAccount,
    ...(role === Role.ENTITY && { entityRoles }),
  }
})
