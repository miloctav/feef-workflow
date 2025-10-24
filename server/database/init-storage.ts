import { initializeBucket } from '../services/minio'

/**
 * Script d'initialisation du stockage MinIO
 * Crée le bucket de stockage s'il n'existe pas
 *
 * Ce script est appelé automatiquement au démarrage de l'application en production
 * via le docker-entrypoint.sh
 */

async function initStorage() {
  console.log('🔄 Initialisation du stockage MinIO...')

  try {
    await initializeBucket()
    console.log('✅ Stockage MinIO initialisé avec succès')
    process.exit(0)
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation du stockage MinIO:', error)
    process.exit(1)
  }
}

initStorage()
