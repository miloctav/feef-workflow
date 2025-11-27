/**
 * Configuration des critères d'audit RSE avec thèmes
 *
 * Chaque exigence possède une description et un score (A,B,C,D)
 * mais la base stocke 1,2,3,4 pour faciliter les calculs et tris.
 */

// Types supportés
export type AuditScoreFieldType = 'text'

// Score sous forme lettre (utilisé par le front)
export type AuditScoreLetter = 'A' | 'B' | 'C' | 'D'

// Valeur stockée en base
export type AuditScoreValue = 1 | 2 | 3 | 4

// Clés numériques pour les critères
export type AuditScoreKey =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6
  | 7 | 8 | 9
  | 10 | 11 | 12
  | 13 | 14 | 15
  | 16 | 17
  | 18 | 19 | 20

// Thématiques
export enum AuditScoreTheme {
  REGLEMENTATION = 0,
  GOUVERNANCE = 1,
  EMPREINTE_TERRITOIRE = 2,
  EMPLOI = 3,
  ENVIRONNEMENT = 4,
  LOYAUTE = 5,
  CLIENTS = 6,
}

// Labels des thématiques RSE pour affichage UI
export const AuditScoreThemeLabels: Record<AuditScoreTheme, string> = {
  [AuditScoreTheme.REGLEMENTATION]: 'Réglementation',
  [AuditScoreTheme.GOUVERNANCE]: 'Gouvernance',
  [AuditScoreTheme.EMPREINTE_TERRITOIRE]: 'Empreinte territoriale & sociétale',
  [AuditScoreTheme.EMPLOI]: 'Relations & conditions de travail',
  [AuditScoreTheme.ENVIRONNEMENT]: 'Environnement',
  [AuditScoreTheme.LOYAUTE]: 'Loyauté des pratiques',
  [AuditScoreTheme.CLIENTS]: 'Consommateurs',
}

// Définition d'un critère
export interface AuditScoreDefinition {
  key: AuditScoreKey
  theme: AuditScoreTheme
  description: string
  type: AuditScoreFieldType
}

// Configuration complète
export const auditScoresConfig: AuditScoreDefinition[] = [
  { key: 0, theme: AuditScoreTheme.REGLEMENTATION, type: 'text', description: "L'organisation respecte la règlementation en matière de droit du travail / du code de l'environnement, du droit des affaires" },
  { key: 1, theme: AuditScoreTheme.GOUVERNANCE, type: 'text', description: "Le dirigeant formalise son engagement éco-responsable et met en avant à minima une action emblématique par pilier de la RSE" },
  { key: 2, theme: AuditScoreTheme.GOUVERNANCE, type: 'text', description: "L'organisation s'engage dans une démarche de RSE avec ses parties prenantes" },
  { key: 3, theme: AuditScoreTheme.GOUVERNANCE, type: 'text', description: "L'organisation décline ses engagements dans un plan d'actions pertinent, avec une gouvernance définie" },
  { key: 4, theme: AuditScoreTheme.GOUVERNANCE, type: 'text', description: "L'organisation met en place des indicateurs RSE et pilote sa démarche dans une dynamique d'amélioration continue" },
  { key: 5, theme: AuditScoreTheme.GOUVERNANCE, type: 'text', description: "L'organisation s'engage dans une dynamique d'innovation" },
  { key: 6, theme: AuditScoreTheme.GOUVERNANCE, type: 'text', description: "L’entreprise s'informe des règlementations RSE et applique les évolutions nécessaires" },
  { key: 7, theme: AuditScoreTheme.EMPREINTE_TERRITOIRE, type: 'text', description: "L'organisation agit en faveur de l'emploi local et de la création de valeur dans les territoires" },
  { key: 8, theme: AuditScoreTheme.EMPREINTE_TERRITOIRE, type: 'text', description: "L'organisation s'investit dans la société avec ses parties prenantes" },
  { key: 9, theme: AuditScoreTheme.EMPREINTE_TERRITOIRE, type: 'text', description: "L'organisation promeut l'innovation et l'accès aux technologies" },
  { key: 10, theme: AuditScoreTheme.EMPLOI, type: 'text', description: "L'organisation garantit de bonnes conditions de travail et mène une politique sécurité/santé" },
  { key: 11, theme: AuditScoreTheme.EMPLOI, type: 'text', description: "Le dialogue social est au cœur des relations humaines" },
  { key: 12, theme: AuditScoreTheme.EMPLOI, type: 'text', description: "L'organisation développe son capital humain et l'employabilité" },
  { key: 13, theme: AuditScoreTheme.ENVIRONNEMENT, type: 'text', description: "L'entreprise protège l'environnement, la biodiversité et prévient les pollutions" },
  { key: 14, theme: AuditScoreTheme.ENVIRONNEMENT, type: 'text', description: "L'entreprise promeut l'utilisation durable des ressources" },
  { key: 15, theme: AuditScoreTheme.ENVIRONNEMENT, type: 'text', description: "L’entreprise promeut l’éco-conception et réduit les impacts environnementaux" },
  { key: 16, theme: AuditScoreTheme.LOYAUTE, type: 'text', description: "L'organisation assure la transparence et maîtrise les risques de corruption" },
  { key: 17, theme: AuditScoreTheme.LOYAUTE, type: 'text', description: "L'organisation promeut la RSE dans sa chaîne de valeur et applique des achats responsables" },
  { key: 18, theme: AuditScoreTheme.CLIENTS, type: 'text', description: "L'organisation produit/distribue des produits conformes, sûrs et de qualité marché" },
  { key: 19, theme: AuditScoreTheme.CLIENTS, type: 'text', description: "L'organisation agit pour la sécurité et la santé des consommateurs" },
  { key: 20, theme: AuditScoreTheme.CLIENTS, type: 'text', description: "L'organisation sensibilise et accompagne les consommateurs vers une consommation responsable" },
]

/* -------------------------------------------------------------------------- */
/*                                SCORE MAPPING                               */
/* -------------------------------------------------------------------------- */

export const scoreLetterToValue: Record<AuditScoreLetter, AuditScoreValue> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
}

export const scoreValueToLetter: Record<AuditScoreValue, AuditScoreLetter> = {
  1: 'A',
  2: 'B',
  3: 'C',
  4: 'D',
}

export function toScoreValue(letter: AuditScoreLetter): AuditScoreValue {
  return scoreLetterToValue[letter]
}

export function toScoreLetter(value: AuditScoreValue): AuditScoreLetter {
  return scoreValueToLetter[value]
}

export function getAuditScoreDefinition(key: AuditScoreKey): AuditScoreDefinition | undefined {
  return auditScoresConfig.find(item => item.key === key)
}

// Helper pour récupérer les critères d'un thème
export function getAuditScoreByTheme(theme: AuditScoreTheme): AuditScoreDefinition[] {
  return auditScoresConfig.filter(item => item.theme === theme)
}

// Helper pour regrouper les critères par thème
export function getScoresByTheme(): Map<AuditScoreTheme, AuditScoreDefinition[]> {
  const grouped = new Map<AuditScoreTheme, AuditScoreDefinition[]>()

  for (const theme of Object.values(AuditScoreTheme).filter(v => typeof v === 'number')) {
    grouped.set(theme as AuditScoreTheme, auditScoresConfig.filter(c => c.theme === theme))
  }

  return grouped
}
