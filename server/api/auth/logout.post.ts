import { getTrustCookieName } from '~~/server/utils/trusted-devices'

export default defineEventHandler(async (event) => {
  const trustToken = getCookie(event, getTrustCookieName())
  console.log('[Logout] Trust cookie before clear:', trustToken ? 'YES' : 'NO')

  // Nettoyer la session utilisateur (ne touche pas au cookie de confiance)
  await clearUserSession(event)

  return {
    success: true,
  }
})
