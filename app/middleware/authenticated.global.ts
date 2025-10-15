export default defineNuxtRouteMiddleware((to, from) => {
  const { loggedIn } = useUserSession()

  const excludedRoutes = ['/login']

  // Rediriger vers la page de login si l'utilisateur n'est pas authentifié
  if (!loggedIn.value && !excludedRoutes.includes(to.path)) {
    return navigateTo('/login')
  }
})
