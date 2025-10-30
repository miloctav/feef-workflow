import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

let _pool: Pool | null = null
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

/**
 * Initialiser la connexion à la base de données (lazy initialization)
 * Utilise useRuntimeConfig() pour obtenir DATABASE_URL
 */
function initDatabase() {
  if (!_db) {
    const config = useRuntimeConfig()
    _pool = new Pool({
      connectionString: config.databaseUrl,
    })
    _db = drizzle(_pool, { schema })
  }
  return _db
}

// Proxy pour initialiser la DB à la première utilisation
// Permet de garder la syntaxe `db.query.xxx` sans changement dans le code
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const database = initDatabase()
    const value = database[prop as keyof ReturnType<typeof drizzle<typeof schema>>]
    // Bind les méthodes au bon contexte
    return typeof value === 'function' ? value.bind(database) : value
  }
})
