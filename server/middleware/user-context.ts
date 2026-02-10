/**
 * Middleware pour injecter automatiquement le userId dans le contexte de la requête
 * Cela permet aux helpers de tracking (forInsert, forUpdate, forDelete) d'accéder facilement au userId
 * Pour les comptes ENTITY, injecte également entityId et entityRole
 */
export default defineEventHandler(async (event) => {
  // Récupérer la session utilisateur si elle existe (sans bloquer la requête)
  const session = await getUserSession(event)

  // Injecter le userId dans le contexte si l'utilisateur est authentifié
  if (session.user) {
    event.context.userId = session.user.id

    // Pour les comptes ENTITY, injecter aussi le contexte d'entité
    if (session.user.currentEntityId) {
      event.context.entityId = session.user.currentEntityId
      event.context.entityRole = session.user.currentEntityRole
    }

    // Sliding session : renouveler la session si le seuil est dépassé
    const config = useRuntimeConfig()
    const refreshThreshold = (config.sessionRefreshThreshold as number) * 1000
    const absoluteMaxAge = (config.sessionAbsoluteMaxAge as number) * 1000
    const now = Date.now()
    const lastRefresh = session.user.lastRefresh || 0
    const sessionCreatedAt = session.user.sessionCreatedAt || 0

    // Vérifier la durée de vie absolue (8h)
    // Si dépassée, ne PAS renouveler → la session expirera naturellement à son prochain maxAge
    const sessionAge = now - sessionCreatedAt
    if (sessionAge < absoluteMaxAge) {
      // Renouveler si le seuil de 15 min est dépassé
      const elapsed = now - lastRefresh
      if (elapsed > refreshThreshold) {
        try {
          await replaceUserSession(event, {
            user: {
              ...session.user,
              lastRefresh: now,
              sessionCreatedAt: session.user.sessionCreatedAt,
            },
          })
        } catch (error) {
          console.error('[Sliding Session] Erreur renouvellement:', error)
        }
      }
    }
  }
})
