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
  }
})
