import type { SessionUser } from '~~/server/types/session'

interface LoginCredentials {
  email: string
  password: string
}

export const useAuth = () => {
  // State partagé avec nuxt-auth-utils
  const { loggedIn, user, fetch: refreshSession, clear } = useUserSession()

  // États de chargement
  const loginLoading = useState('auth:loginLoading', () => false)
  const loginError = useState<string | null>('auth:loginError', () => null)

  /**
   * Connexion utilisateur
   */
  const login = async (credentials: LoginCredentials) => {
    loginLoading.value = true
    loginError.value = null

    try {
      // Appel API de login
      await $fetch('/api/auth/login', {
        method: 'POST',
        body: credentials,
      })

      // Rafraîchir la session côté client
      await refreshSession()

      return { success: true }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Email ou mot de passe incorrect'
      loginError.value = errorMessage

      return {
        success: false,
        error: errorMessage,
      }
    } finally {
      loginLoading.value = false
    }
  }

  /**
   * Déconnexion utilisateur
   */
  const logout = async () => {
    try {
      await $fetch('/api/auth/logout', {
        method: 'POST',
      })

      // Nettoyer la session côté client
      await clear()

      // Rediriger vers la page de login
      await navigateTo('/login')

      return { success: true }
    } catch (e: any) {
      console.error('Erreur lors de la déconnexion:', e)
      return {
        success: false,
        error: e.message || 'Erreur lors de la déconnexion',
      }
    }
  }

  /**
   * Réinitialiser l'erreur de login
   */
  const clearLoginError = () => {
    loginError.value = null
  }

  return {
    // Session state (depuis nuxt-auth-utils)
    loggedIn,
    user: user as Ref<SessionUser | null>,

    // Loading states
    loginLoading: readonly(loginLoading),
    loginError: readonly(loginError),

    // Actions
    login,
    logout,
    refreshSession,
    clearLoginError,
  }
}
