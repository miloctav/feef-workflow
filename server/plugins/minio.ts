import { initializeBucket } from '../services/minio'

export default defineNitroPlugin(async (nitroApp) => {
  console.log('🔧 Initialisation de MinIO...')

  try {
    await initializeBucket()
  } catch (error) {
    console.error('❌ Échec de l\'initialisation de MinIO:', error)
    // Ne pas bloquer le démarrage de l'application
  }
})
