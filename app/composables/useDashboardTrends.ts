/**
 * Composable pour gérer les tendances du dashboard
 * Compare les données actuelles avec le snapshot de la dernière connexion
 */

interface DashboardSnapshot {
  timestamp: string
  cards: {
    [cardKey: string]: number
  }
}

interface CardTrend {
  trend: 'up' | 'down' | null
  lastValue: number | undefined
  lastDate: string | undefined
}

interface TrendsMap {
  [cardKey: string]: CardTrend
}

interface DashboardCard {
  shortText: string
  value: number
  alertesRouges: number
  alertesOranges: number
  color: string
  bgColor: string
  auditTypes?: {
    initial: number
    renewal: number
    monitoring: number
  }
}

interface DashboardCategory {
  label: string
  cards: DashboardCard[]
}

/**
 * Génère une clé unique pour identifier une carte
 */
function generateCardKey(categoryLabel: string, card: DashboardCard): string {
  return `${categoryLabel}_${card.shortText}`
}

/**
 * Formate une date ISO en format français
 */
function formatDate(isoString: string): string {
  const date = new Date(isoString)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')

  return `${day}/${month}/${year} à ${hours}h${minutes}`
}

export function useDashboardTrends() {
  const { user } = useAuth()

  /**
   * Récupère la clé de stockage unique pour l'utilisateur
   */
  const getStorageKey = (): string | null => {
    if (!user.value?.id)
      return null
    return `user_${user.value.id}_dashboard_snapshot`
  }

  /**
   * Charge le snapshot depuis localStorage
   */
  const loadSnapshot = (): DashboardSnapshot | null => {
    const key = getStorageKey()
    if (!key)
      return null

    try {
      const stored = localStorage.getItem(key)
      if (!stored)
        return null

      return JSON.parse(stored) as DashboardSnapshot
    }
    catch (error) {
      console.error('Erreur lors du chargement du snapshot dashboard:', error)
      return null
    }
  }

  /**
   * Récupère les tendances en comparant avec le snapshot précédent
   */
  const getTrends = (categories: DashboardCategory[]): TrendsMap => {
    const snapshot = loadSnapshot()

    // Pas de snapshot, pas de tendances
    if (!snapshot)
      return {}

    const trends: TrendsMap = {}

    for (const category of categories) {
      for (const card of category.cards) {
        const cardKey = generateCardKey(category.label, card)
        const currentValue = card.value
        const previousValue = snapshot.cards[cardKey]

        // Nouvelle carte ou valeur manquante
        if (previousValue === undefined)
          continue

        // Comparaison des valeurs
        if (currentValue > previousValue) {
          trends[cardKey] = {
            trend: 'up',
            lastValue: previousValue,
            lastDate: formatDate(snapshot.timestamp),
          }
        }
        else if (currentValue < previousValue) {
          trends[cardKey] = {
            trend: 'down',
            lastValue: previousValue,
            lastDate: formatDate(snapshot.timestamp),
          }
        }
        // Si égal, pas de tendance (ne pas ajouter au map)
      }
    }

    return trends
  }

  /**
   * Sauvegarde le snapshot actuel dans localStorage
   */
  const saveSnapshot = (categories: DashboardCategory[]): void => {
    const key = getStorageKey()
    if (!key)
      return

    try {
      const snapshot: DashboardSnapshot = {
        timestamp: new Date().toISOString(),
        cards: {},
      }

      for (const category of categories) {
        for (const card of category.cards) {
          const cardKey = generateCardKey(category.label, card)
          snapshot.cards[cardKey] = card.value
        }
      }

      localStorage.setItem(key, JSON.stringify(snapshot))
    }
    catch (error) {
      console.error('Erreur lors de la sauvegarde du snapshot dashboard:', error)
    }
  }

  return {
    getTrends,
    saveSnapshot,
  }
}
