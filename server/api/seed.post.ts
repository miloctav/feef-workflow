import { timingSafeEqual } from 'node:crypto'
import { db } from '../database'
import { accounts } from '../database/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'

/**
 * Endpoint sécurisé pour seeder la base de données
 * Crée un compte admin FEEF avec les identifiants par défaut
 *
 * Sécurité : Nécessite un token secret défini dans NUXT_SEED_TOKEN
 *
 * Usage:
 * POST /api/seed
 * Headers: x-seed-token: your_secret_token
 *
 * ou
 *
 * POST /api/seed?token=your_secret_token
 */
export default defineEventHandler(async (event) => {
  try {
    // Vérifier le token de sécurité
    const tokenFromHeader = getHeader(event, 'x-seed-token')
    const tokenFromQuery = getQuery(event).token as string | undefined
    const providedToken = tokenFromHeader || tokenFromQuery

    const config = useRuntimeConfig(event)
    const expectedToken = config.seedToken

    if (!expectedToken) {
      throw createError({
        statusCode: 500,
        statusMessage: 'NUXT_SEED_TOKEN is not configured in runtimeConfig',
      })
    }

    // Comparaison en temps constant pour éviter une attaque temporelle sur le token
    const providedBuf = Buffer.from(providedToken || '')
    const expectedBuf = Buffer.from(expectedToken)
    const tokenValid =
      providedBuf.length === expectedBuf.length &&
      timingSafeEqual(providedBuf, expectedBuf)

    if (!tokenValid) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized: Invalid or missing seed token',
      })
    }

    console.log('🌱 Starting database seed via API...')

    // Vérifier si le compte admin FEEF existe déjà
    const [existingAccount] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.email, 'maxime@miloctav.fr'))
      .limit(1)

    if (existingAccount) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Admin account already exists',
      })
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash('password', 10)

    // Créer le compte FEEF admin
    const [newAccount] = await db.insert(accounts).values({
      firstname: 'Maxime',
      lastname: 'Admin',
      email: 'maxime@miloctav.fr',
      isActive: true,
      password: hashedPassword,
      role: 'FEEF',
      oeId: null,
      oeRole: null,
    }).returning()

    console.log('✅ Admin account created successfully')

    return {
      data: {
        success: true,
        message: 'Database seeded successfully',
        account: {
          id: newAccount.id,
          email: newAccount.email,
          firstname: newAccount.firstname,
          lastname: newAccount.lastname,
          role: newAccount.role,
        },
      },
    }
  } catch (error: any) {
    // Si c'est une erreur HTTP que nous avons créée, la relancer
    if (error.statusCode) {
      throw error
    }

    // Sinon, logger et retourner une erreur 500
    console.error('❌ Error during seed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error during seed',
    })
  }
})
