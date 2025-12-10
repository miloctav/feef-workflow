/**
 * Endpoint API pour déclencher manuellement la tâche de vérification d'expiration de label
 *
 * POST /api/tasks/run-label-expiration-check
 *
 * Sécurité : Réservé aux utilisateurs avec le rôle FEEF
 */
export default defineEventHandler(async (event) => {
    // Vérifier l'authentification
    const { user } = await requireUserSession(event)

    // Seuls les admins FEEF peuvent déclencher manuellement
    if (user.role !== Role.FEEF) {
        throw createError({
            statusCode: 403,
            message: 'Accès refusé - Admin uniquement'
        })
    }

    console.log(`[API] Manual label expiration check trigger by user #${user.id} (${user.email})`)

    try {
        // Déclencher la tâche Nitro
        const result = await runTask('actions:check-label-expiration')

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
