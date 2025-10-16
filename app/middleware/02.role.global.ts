import { Role } from '#shared/types/roles'

export default defineNuxtRouteMiddleware((to) => {
  const { user, loggedIn } = useUserSession()

  // Routes publiques qui ne nécessitent pas de vérification de rôle
  const publicRoutes = ['/login', '/forgot-password', '/reset-password']

  if (publicRoutes.includes(to.path) || !loggedIn.value) {
    return
  }

  // Extraire le premier segment de l'URL (après le /)
  const pathSegments = to.path.split('/').filter(Boolean)
  const firstSegment = pathSegments[0]

  // Mapping entre les segments d'URL et les rôles autorisés
  const routeRoleMap: Record<string, string[]> = {
    'feef': [Role.FEEF],
    'oe': [Role.OE, Role.AUDITOR],
    'auditeur': [Role.AUDITOR],
    'company': [Role.ENTITY],
  }

  // Vérifier si le segment correspond à une route protégée
  if (firstSegment && routeRoleMap[firstSegment]) {
    const allowedRoles = routeRoleMap[firstSegment]
    const userRole = user.value?.role

    // Si l'utilisateur n'a pas le rôle requis, rediriger vers sa page d'accueil
    if (!userRole || !allowedRoles.includes(userRole)) {
      // Rediriger vers la page d'accueil correspondant au rôle de l'utilisateur
      switch (userRole) {
        case Role.FEEF:
          return navigateTo('/feef')
        case Role.OE:
          return navigateTo('/oe')
        case Role.AUDITOR:
          return navigateTo('/auditeur')
        case Role.ENTITY:
          return navigateTo('/company')
        default:
          return navigateTo('/login')
      }
    }
  }
})
