export default defineNuxtRouteMiddleware(() => {
  const { loggedIn } = useUserSession()

  // Rediriger vers la page de login si l'utilisateur n'est pas authentifié
  if (!loggedIn.value) {
    return navigateTo('/login')
  }
})
