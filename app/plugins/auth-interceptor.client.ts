// Intercepteur global $fetch côté client.
// - Met à jour l'horodatage d'activité de session à chaque réponse API authentifiée.
// - Sur 401, revalide la session côté serveur avant de décider :
//   . si la session est toujours valide => faux 401 (bug applicatif), on affiche un toast sans déconnecter.
//   . si la session a réellement expiré => clear + redirection vers /login?redirect=<page-courante>.
// Les routes d'auth (login, 2FA, mot de passe oublié, reset) sont exclues pour éviter les boucles.

const AUTH_ROUTE_PREFIXES = [
  '/api/auth/login',
  '/api/auth/2fa/',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/_auth/session',
]

const isAuthRoute = (url: string) => AUTH_ROUTE_PREFIXES.some(prefix => url.includes(prefix))

const extractUrl = (request: any): string => {
  if (typeof request === 'string') return request
  if (request instanceof URL) return request.toString()
  if (request?.url) return request.url
  return ''
}

export default defineNuxtPlugin((nuxtApp) => {
  let handling401 = false

  const wrapped = $fetch.create({
    onResponse({ request, response }) {
      if (!response.ok) return
      const url = extractUrl(request)
      if (!url.startsWith('/api/') || isAuthRoute(url)) return
      // Toute réponse API authentifiée réussie compte comme activité utilisateur.
      nuxtApp.runWithContext(() => {
        const { resetActivity } = useSessionWarning()
        resetActivity()
      })
    },

    async onResponseError({ request, response }) {
      if (response.status !== 401) return
      const url = extractUrl(request)
      if (isAuthRoute(url)) return

      if (handling401) return
      handling401 = true

      try {
        await nuxtApp.runWithContext(async () => {
          const router = useRouter()
          const currentPath = router.currentRoute.value.fullPath

          if (router.currentRoute.value.path === '/login') return

          const session = useUserSession()
          await session.fetch()

          const toast = useToast()

          if (session.loggedIn.value) {
            // Faux 401 : la session est toujours valide côté serveur.
            // C'est probablement un bug applicatif (mauvais code de statut sur une route métier).
            toast.add({
              title: 'Action non autorisée',
              description: 'Vous n\'avez pas les droits nécessaires pour cette action.',
              color: 'error',
            })
            return
          }

          // Vraie expiration : on nettoie et on redirige.
          toast.add({
            title: 'Session expirée',
            description: 'Veuillez vous reconnecter.',
            color: 'warning',
          })

          await session.clear()
          clearNuxtState()

          const redirect = currentPath && currentPath !== '/login' ? `?redirect=${encodeURIComponent(currentPath)}` : ''
          await navigateTo(`/login${redirect}`, { replace: true })
        })
      } finally {
        handling401 = false
      }
    },
  })

  // @ts-expect-error réassignation volontaire pour propager l'intercepteur globalement
  globalThis.$fetch = wrapped
})
