import type { AuditNotation } from '~~/server/database/schema'
import type { AuditScoreKey, AuditScoreLetter, AuditScoreTheme } from '~~/server/config/auditNotation.config'

// Exporter les labels et helper depuis le config serveur pour utilisation frontend
export { AuditScoreThemeLabels, getScoresByTheme } from '~~/server/config/auditNotation.config'

/**
 * Types pour les notations d'audit
 */

// Notation publique (pour affichage)
export type AuditNotationPublic = Omit<AuditNotation, 'never'>

/**
 * Type pour un score de notation enrichi (retourné par le GET)
 * Extends le type de base avec les données calculées depuis le config
 */
export interface AuditNotationWithEnrichment extends AuditNotationPublic {
  scoreLetter: AuditScoreLetter // 'A', 'B', 'C', 'D'
  theme: AuditScoreTheme | null // 0-6
}

/**
 * Type pour l'input d'un score (pour le POST)
 */
export interface ScoreInput {
  criterionKey: AuditScoreKey // 0-20
  score: number // 1-4 (A=1, B=2, C=3, D=4)
}

/**
 * Type pour le body du POST
 */
export interface UpdateAuditNotationData {
  scores: ScoreInput[]
}
