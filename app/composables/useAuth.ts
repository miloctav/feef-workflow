import type { SessionUser } from '~~/server/types/session'

interface LoginCredentials {
  email: string
  password: string
}

interface LoginResponse {
  requiresTwoFactor?: boolean
  accountId?: number
  user?: SessionUser
  data?: { success: boolean; user?: SessionUser }
}

interface LoginResult {
  success: boolean
  requiresTwoFactor?: boolean
  accountId?: number
  error?: string
}

export const useAuth = () => {
  // State partagé avec nuxt-auth-utils - protégé pour SSR
  const session = process.client ? useUserSession() : {
    loggedIn: ref(false),
    user: ref(null),
    fetch: async () => { },
    clear: async () => { },
  }

  const { loggedIn, user, fetch: refreshSession, clear } = session

  // États de chargement
  const loginLoading = useState('auth:loginLoading', () => false)
  const loginError = useState<string | null>('auth:loginError', () => null)

  // États 2FA with persistence
  const twoFactorAccountId = useState<number | null>('auth:twoFactorAccountId', () => {
    if (process.client) {
      const stored = sessionStorage.getItem('2fa:accountId')
      return stored ? parseInt(stored, 10) : null
    }
    return null
  })

  const twoFactorExpiresAt = useState<Date | null>('auth:twoFactorExpiresAt', () => {
    if (process.client) {
      const stored = sessionStorage.getItem('2fa:expiresAt')
      return stored ? new Date(stored) : null
    }
    return null
  })

  /**
   * Connexion utilisateur
   */
  const login = async (credentials: LoginCredentials): Promise<LoginResult> => {
    loginLoading.value = true
    loginError.value = null

    try {
      // Appel API de login
      const response = await $fetch<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: credentials,
      })

      // Vérifier si 2FA est requis
      if (response.requiresTwoFactor && response.accountId) {
        return {
          success: true,
          requiresTwoFactor: true,
          accountId: response.accountId,
        }
      }

      // Trust token valide : session créée directement par le serveur
      if (response.data?.success) {
        await refreshSession()
        return { success: true }
      }

      // Rafraîchir la session côté client (cas fallback)
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
      // Appel API pour nettoyer la session serveur
      await $fetch('/api/auth/logout', {
        method: 'POST',
      })

      // Nettoyer la session côté client (cookies, session)
      await clear()

      // Vider tous les états globaux des composables
      clearNuxtState()

      // Rediriger vers la page de login
      await navigateTo('/login', { replace: true })

      return { success: true }
    } catch (e: any) {
      console.error('Erreur lors de la déconnexion:', e)

      // Même en cas d'erreur, nettoyer le client
      await clear()
      clearNuxtState()
      await navigateTo('/login', { replace: true })

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

  /**
   * Définir l'accountId pour le 2FA
   */
  const set2FAAccountId = (accountId: number) => {
    twoFactorAccountId.value = accountId
    twoFactorExpiresAt.value = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    // Persist to sessionStorage
    if (process.client) {
      sessionStorage.setItem('2fa:accountId', accountId.toString())
      sessionStorage.setItem('2fa:expiresAt', twoFactorExpiresAt.value.toISOString())
    }
  }

  /**
   * Nettoyer les données 2FA
   */
  const clear2FA = () => {
    twoFactorAccountId.value = null
    twoFactorExpiresAt.value = null

    // Clear from sessionStorage
    if (process.client) {
      sessionStorage.removeItem('2fa:accountId')
      sessionStorage.removeItem('2fa:expiresAt')
    }
  }

  /**
   * Vérifier si le code 2FA a expiré
   */
  const is2FAExpired = (): boolean => {
    return twoFactorExpiresAt.value ? new Date() > twoFactorExpiresAt.value : true
  }

  /**
   * Changer l'entité courante pour un compte ENTITY
   */
  const switchEntity = async (entityId: number) => {
    try {
      await $fetch('/api/auth/switch-entity', {
        method: 'POST',
        body: { entityId }
      })

      // Rafraîchir la session
      await refreshSession()

      // Recharger la page pour appliquer le nouveau contexte
      window.location.reload()

      return { success: true }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors du changement d\'entité'
      console.error('Erreur lors du changement d\'entité:', e)

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  return {
    // Session state (depuis nuxt-auth-utils)
    loggedIn,
    user: user as Ref<SessionUser | null>,

    // Loading states
    loginLoading: readonly(loginLoading),
    loginError: readonly(loginError),

    // 2FA states
    twoFactorAccountId: readonly(twoFactorAccountId),
    twoFactorExpiresAt: readonly(twoFactorExpiresAt),

    // Actions
    login,
    logout,
    refreshSession,
    clearLoginError,
    switchEntity,

    // 2FA actions
    set2FAAccountId,
    clear2FA,
    is2FAExpired,
  }
}
