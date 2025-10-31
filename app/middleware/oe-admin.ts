import { Role, OERole } from '#shared/types/roles'

/**
 * Middleware pour protéger les pages réservées aux OE ADMIN uniquement
 *
 * Ce middleware vérifie que l'utilisateur connecté a:
 * - role === 'OE'
 * - oeRole === 'ADMIN'
 *
 * Si l'utilisateur n'a pas ces permissions, il est redirigé vers le dashboard OE
 */
export default defineNuxtRouteMiddleware(() => {
  const { user, loggedIn } = useUserSession()

  // Vérifier que l'utilisateur est connecté
  if (!loggedIn.value || !user.value) {
    return navigateTo('/login')
  }

  // Vérifier que l'utilisateur est un OE avec le rôle ADMIN
  if (user.value.role !== Role.OE || user.value.oeRole !== OERole.ADMIN) {
    // Rediriger vers le dashboard OE avec un message d'erreur
    return navigateTo('/oe')
  }
})
