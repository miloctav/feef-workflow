export default defineEventHandler(async (event) => {
  // Nettoyer la session utilisateur
  await clearUserSession(event)

  return {
    success: true,
  }
})
