/**
 * Plugin Garage - Vérification du bucket au démarrage
 *
 * Note: L'initialisation complète de Garage (layout, bucket, clés) doit être faite manuellement
 * via Garage CLI avant le premier démarrage de l'application.
 * Ce plugin sert uniquement de fallback pour créer le bucket si absent (dev local).
 */
import { initializeBucket } from '../services/garage'

export default defineNitroPlugin(async (nitroApp) => {
  console.log('🔧 Vérification du bucket Garage...')

  try {
    await initializeBucket()
  } catch (error) {
    console.error('❌ Échec de la vérification du bucket Garage:', error)
    // Ne pas bloquer le démarrage de l'application
  }
})
