import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import bcrypt from 'bcrypt'
import { accounts, oes } from './schema'
import { eq } from 'drizzle-orm'

async function seed() {
  // Créer la connexion à la base de données
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  const db = drizzle(pool)

  console.log('🌱 Seeding database...')

  try {
    // Créer les organismes évaluateurs
    console.log('📋 Création des organismes évaluateurs...')
    
    // Vérifier si Ecocert existe déjà
    const [existingEcocert] = await db
      .select()
      .from(oes)
      .where(eq(oes.name, 'Ecocert'))
      .limit(1)

    if (existingEcocert) {
      console.log('✅ Ecocert existe déjà')
    } else {
      await db.insert(oes).values({
        name: 'Ecocert',
      })
      console.log('✅ Organisme évaluateur Ecocert créé')
    }

    // Vérifier si SGS existe déjà
    const [existingSGS] = await db
      .select()
      .from(oes)
      .where(eq(oes.name, 'SGS'))
      .limit(1)

    if (existingSGS) {
      console.log('✅ SGS existe déjà')
    } else {
      await db.insert(oes).values({
        name: 'SGS',
      })
      console.log('✅ Organisme évaluateur SGS créé')
    }

    // Vérifier si le compte FEEF existe déjà
    const [existingAccount] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.email, 'maxime@miloctav.fr'))
      .limit(1)

    if (existingAccount) {
      console.log('✅ Le compte FEEF existe déjà')
    } else {
      // Hasher le mot de passe
      const hashedPassword = await bcrypt.hash('admin', 10)

      // Créer le compte FEEF
      await db.insert(accounts).values({
        firstname: 'Maxime',
        lastname: 'Admin',
        email: 'maxime@miloctav.fr',
        isActive: true,
        password: hashedPassword,
        role: "FEEF",
        oeId: null,
        oeRole: null,
      })

      console.log('✅ Compte FEEF créé avec succès')
      console.log('   Email: maxime@miloctav.fr')
      console.log('   Mot de passe: admin')
    }
  } catch (error) {
    console.error('❌ Erreur lors du seed:', error)
    throw error
  } finally {
    await pool.end()
    console.log('🏁 Seed terminé')
  }
}

// Exécuter le seed
seed().catch((error) => {
  console.error(error)
  process.exit(1)
})
