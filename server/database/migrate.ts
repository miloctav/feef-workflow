import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'

/**
 * Script de migration pour la production
 * Exécute toutes les migrations SQL depuis le dossier migrations/
 *
 * Ce script est appelé automatiquement au démarrage de l'application en production
 * via le docker-entrypoint.sh
 */

async function runMigrations() {
  console.log('🔄 Démarrage des migrations de la base de données...')

  const pool = new Pool({
    connectionString: process.env.NUXT_DATABASE_URL,
  })

  try {
    const db = drizzle(pool)

    // Exécute toutes les migrations dans l'ordre
    await migrate(db, { migrationsFolder: './server/database/migrations' })

    console.log('✅ Migrations appliquées avec succès')

    // Fermer la connexion
    await pool.end()

    process.exit(0)
  } catch (error) {
    console.error('❌ Erreur lors de l\'application des migrations:', error)
    await pool.end()
    process.exit(1)
  }
}

runMigrations()
