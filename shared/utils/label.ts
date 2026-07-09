/**
 * Calcule la date d'expiration du label : date de décision FEEF + 1 an.
 *
 * Règle unique, utilisée à la fois par la state machine (décision prise dans
 * l'application) et par les seeds/backfills (décisions historiques importées).
 *
 * Le formatage se fait sur les composantes locales de la date : passer par
 * toISOString() convertirait en UTC et reculerait la date d'un jour pour tout
 * fuseau à l'est de Greenwich (une décision du 12/09 expirerait le 11/09).
 *
 * @param decisionDate - Date de la décision FEEF (par défaut : maintenant)
 * @returns La date d'expiration au format YYYY-MM-DD
 */
export function computeLabelExpirationDate(decisionDate: Date = new Date()): string {
  const expirationDate = new Date(decisionDate)
  expirationDate.setFullYear(expirationDate.getFullYear() + 1)

  const year = expirationDate.getFullYear()
  const month = String(expirationDate.getMonth() + 1).padStart(2, '0')
  const day = String(expirationDate.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
