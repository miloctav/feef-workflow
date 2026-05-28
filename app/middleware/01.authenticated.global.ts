export default defineNuxtRouteMiddleware((to, from) => {
  const { loggedIn } = useUserSession()

  const excludedRoutes = ['/login', '/reset-password', '/forgot-password', '/verify-email', '/verify-2fa']

  // Rediriger vers la page de login si l'utilisateur n'est pas authentifié.
  // On préserve la destination via ?redirect= pour y revenir après login.
  if (!loggedIn.value && !excludedRoutes.includes(to.path)) {
    const redirect = to.fullPath && to.fullPath !== '/' ? `?redirect=${encodeURIComponent(to.fullPath)}` : ''
    return navigateTo(`/login${redirect}`)
  }
})
