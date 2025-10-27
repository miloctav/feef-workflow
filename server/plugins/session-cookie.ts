/**
 * Plugin Nitro pour permettre les cookies de session sur HTTP
 *
 * Par défaut, nuxt-auth-utils définit le flag "Secure" sur les cookies en production,
 * ce qui empêche leur envoi sur HTTP (uniquement HTTPS).
 *
 * Ce plugin retire le flag "Secure" des cookies de session pour permettre
 * l'authentification sur HTTP.
 *
 * IMPORTANT: Lorsque vous activez HTTPS en production, supprimez ce plugin
 * ou modifiez-le pour conserver le flag "Secure".
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (event) => {
    // Récupérer les en-têtes Set-Cookie
    const setCookieHeaders = getResponseHeaders(event)['set-cookie']

    if (setCookieHeaders) {
      // Convertir en tableau si c'est une chaîne unique
      const cookies = Array.isArray(setCookieHeaders)
        ? setCookieHeaders
        : [setCookieHeaders]

      // Retirer le flag "Secure" de tous les cookies de session
      const modifiedCookies = cookies.map(cookie => {
        if (typeof cookie === 'string' && cookie.includes('nuxt-session')) {
          // Retire le flag "Secure" du cookie
          return cookie.replace(/;\s*Secure/gi, '')
        }
        return cookie
      })

      // Mettre à jour l'en-tête avec les cookies modifiés
      setResponseHeaders(event, { 'set-cookie': modifiedCookies })
    }
  })
})
