/**
 * Endpoint API pour déclencher manuellement la tâche de mise à jour des audits
 *
 * POST /api/tasks/run-audit-update
 *
 * Sécurité : Réservé aux utilisateurs avec le rôle FEEF
 */
export default defineEventHandler(async (event) => {
  // Vérifier l'authentification
  const { user } = await requireUserSession(event)

  // Seuls les admins FEEF peuvent déclencher manuellement
  if (user.role !== 'FEEF') {
    throw createError({
      statusCode: 403,
      message: 'Accès refusé - Admin uniquement'
    })
  }

  console.log(`[API] Manual task trigger by user #${user.id} (${user.email})`)

  try {
    // Déclencher la tâche Nitro
    const result = await runTask('audits:update-status')

    return {
      success: true,
      ...result
    }
  } catch (error) {
    console.error('[API] Failed to run task:', error)
    throw createError({
      statusCode: 500,
      message: 'Échec de l\'exécution de la tâche'
    })
  }
})
