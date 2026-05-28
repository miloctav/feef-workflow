// Composable de gestion du warning de fin de session.
// Affiche une modal à T,5 min de l'expiration probable du cookie.
// La fenêtre "activité utilisateur" est rafraîchie par le plugin auth-interceptor
// à chaque réponse API authentifiée réussie.

const WARNING_AT_MS = 20 * 60 * 1000 // 20 min sans activité avant de prévenir
const CHECK_INTERVAL_MS = 30 * 1000 // 30 s entre deux checks

let intervalId: ReturnType<typeof setInterval> | null = null

export const useSessionWarning = () => {
  const lastActivity = useState<number>('session:lastActivity', () => Date.now())
  const showWarning = useState<boolean>('session:showWarning', () => false)

  const resetActivity = () => {
    lastActivity.value = Date.now()
    showWarning.value = false
  }

  const startWatcher = () => {
    if (intervalId !== null) return
    intervalId = setInterval(() => {
      const { loggedIn } = useUserSession()
      if (!loggedIn.value) {
        showWarning.value = false
        return
      }
      const elapsed = Date.now() - lastActivity.value
      if (elapsed >= WARNING_AT_MS && !showWarning.value) {
        showWarning.value = true
      }
    }, CHECK_INTERVAL_MS)
  }

  const stopWatcher = () => {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  return {
    lastActivity,
    showWarning,
    resetActivity,
    startWatcher,
    stopWatcher,
  }
}
