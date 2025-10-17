/**
 * Middleware pour injecter automatiquement le userId dans le contexte de la requête
 * Cela permet aux helpers de tracking (forInsert, forUpdate, forDelete) d'accéder facilement au userId
 */
export default defineEventHandler(async (event) => {
  // Récupérer la session utilisateur si elle existe (sans bloquer la requête)
  const session = await getUserSession(event)

  // Injecter le userId dans le contexte si l'utilisateur est authentifié
  if (session.user) {
    event.context.userId = session.user.id
  }
})
