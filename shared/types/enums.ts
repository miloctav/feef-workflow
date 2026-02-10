/**
 * Constantes d'enums partagées entre le front et le back
 */

/**
 * Types d'entités
 */
export const EntityType = {
  COMPANY: 'COMPANY',
  GROUP: 'GROUP',
} as const

export type EntityTypeType = typeof EntityType[keyof typeof EntityType]

/**
 * Labels français pour les types d'entités
 */
export const EntityTypeLabels: Record<EntityTypeType, string> = {
  [EntityType.COMPANY]: 'Entreprise',
  [EntityType.GROUP]: 'Groupe',
}

/**
 * Obtenir la liste des types d'entités avec labels
 */
export function getEntityTypeItems(includeAll: true): Array<{ label: string; value: EntityTypeType | null }>
export function getEntityTypeItems(includeAll: false): Array<{ label: string; value: EntityTypeType }>
export function getEntityTypeItems(includeAll = false): Array<{ label: string; value: EntityTypeType | null }> {
  const items = Object.entries(EntityType).map(([_, value]) => ({
    label: EntityTypeLabels[value as EntityTypeType],
    value: value as EntityTypeType,
  }))

  if (includeAll) {
    return [{ label: 'Tous les types', value: null }, ...items]
  }

  return items
}

/**
 * Modes d'entités
 */
export const EntityMode = {
  MASTER: 'MASTER',
  FOLLOWER: 'FOLLOWER',
} as const

export type EntityModeType = typeof EntityMode[keyof typeof EntityMode]

/**
 * Labels français pour les modes d'entités
 */
export const EntityModeLabels: Record<EntityModeType, string> = {
  [EntityMode.MASTER]: 'Maître',
  [EntityMode.FOLLOWER]: 'Suiveur',
}

/**
 * Obtenir la liste des modes d'entités avec labels
 */
export function getEntityModeItems(includeAll: true): Array<{ label: string; value: EntityModeType | null }>
export function getEntityModeItems(includeAll: false): Array<{ label: string; value: EntityModeType }>
export function getEntityModeItems(includeAll = false): Array<{ label: string; value: EntityModeType | null }> {
  const items = Object.entries(EntityMode).map(([_, value]) => ({
    label: EntityModeLabels[value as EntityModeType],
    value: value as EntityModeType,
  }))

  if (includeAll) {
    return [{ label: 'Tous les modes', value: null }, ...items]
  }

  return items
}

/**
 * Types d'audit
 */
export const AuditType = {
  INITIAL: 'INITIAL',
  RENEWAL: 'RENEWAL',
  MONITORING: 'MONITORING',
} as const

export type AuditTypeType = typeof AuditType[keyof typeof AuditType]

/**
 * Labels français pour les types d'audit
 */
export const AuditTypeLabels: Record<AuditTypeType, string> = {
  [AuditType.INITIAL]: 'Initial',
  [AuditType.RENEWAL]: 'Renouvellement',
  [AuditType.MONITORING]: 'Suivi',
}

/**
 * Couleurs de badge pour les types d'audit (pour Nuxt UI)
 */
export const AuditTypeColors: Record<AuditTypeType, 'primary' | 'warning' | 'info'> = {
  [AuditType.INITIAL]: 'primary',
  [AuditType.RENEWAL]: 'warning',
  [AuditType.MONITORING]: 'info'
}

/**
 * Mode de surveillance pour les audits MONITORING
 */
export const MonitoringMode = {
  PHYSICAL: 'PHYSICAL',
  DOCUMENTARY: 'DOCUMENTARY',
} as const

export type MonitoringModeType = typeof MonitoringMode[keyof typeof MonitoringMode]

export const MonitoringModeLabels: Record<MonitoringModeType, string> = {
  [MonitoringMode.PHYSICAL]: 'physique',
  [MonitoringMode.DOCUMENTARY]: 'documentaire',
}

/**
 * Obtenir le label complet pour un audit (avec mode si MONITORING)
 */
export function getFullAuditTypeLabel(type: AuditTypeType, monitoringMode?: MonitoringModeType | null): string {
  const baseLabel = AuditTypeLabels[type]
  if (type === AuditType.MONITORING && monitoringMode) {
    return `${baseLabel} (${MonitoringModeLabels[monitoringMode]})`
  }
  return baseLabel
}

/**
 * Obtenir la liste des types d'audit avec labels
 */
export function getAuditTypeItems(includeAll: true): Array<{ label: string; value: AuditTypeType | null }>
export function getAuditTypeItems(includeAll: false): Array<{ label: string; value: AuditTypeType }>
export function getAuditTypeItems(includeAll = false): Array<{ label: string; value: AuditTypeType | null }> {
  const items = Object.entries(AuditType).map(([_, value]) => ({
    label: AuditTypeLabels[value as AuditTypeType],
    value: value as AuditTypeType,
  }))

  if (includeAll) {
    return [{ label: 'Tous les types', value: null }, ...items]
  }

  return items
}

/**
 * Obtenir le label d'un type d'entité
 */
export function getEntityTypeLabel(type: EntityTypeType): string {
  return EntityTypeLabels[type] || type
}

/**
 * Obtenir le label d'un mode d'entité
 */
export function getEntityModeLabel(mode: EntityModeType): string {
  return EntityModeLabels[mode] || mode
}

/**
 * Obtenir le label d'un type d'audit
 */
export function getAuditTypeLabel(type: AuditTypeType): string {
  return AuditTypeLabels[type] || type
}

/**
 * Obtenir la couleur du badge d'un type d'audit
 */
export function getAuditTypeColor(type: AuditTypeType): 'primary' | 'warning' | 'info' {
  return AuditTypeColors[type] || 'primary'
}

/**
 * Statuts d'audit
 */
export const AuditStatus = {
  PENDING_CASE_APPROVAL: 'PENDING_CASE_APPROVAL',
  PENDING_OE_ACCEPTANCE: 'PENDING_OE_ACCEPTANCE',
  PENDING_OE_CHOICE: 'PENDING_OE_CHOICE',
  PLANNING: 'PLANNING',
  SCHEDULED: 'SCHEDULED',
  PENDING_REPORT: 'PENDING_REPORT',
  PENDING_CORRECTIVE_PLAN: 'PENDING_CORRECTIVE_PLAN',
  PENDING_CORRECTIVE_PLAN_VALIDATION: 'PENDING_CORRECTIVE_PLAN_VALIDATION',
  PENDING_OE_OPINION: 'PENDING_OE_OPINION',
  PENDING_FEEF_DECISION: 'PENDING_FEEF_DECISION',
  COMPLETED: 'COMPLETED',
  REFUSED_BY_OE: 'REFUSED_BY_OE',
  REFUSED_PLAN: 'REFUSED_PLAN',
  PENDING_COMPLEMENTARY_AUDIT: 'PENDING_COMPLEMENTARY_AUDIT',
} as const

export type AuditStatusType = typeof AuditStatus[keyof typeof AuditStatus]

/**
 * Labels français pour les statuts d'audit
 */
export const AuditStatusLabels: Record<AuditStatusType, string> = {
  [AuditStatus.PLANNING]: 'Planification',
  [AuditStatus.SCHEDULED]: 'Planifié',
  [AuditStatus.PENDING_REPORT]: 'En attente du rapport',
  [AuditStatus.PENDING_CORRECTIVE_PLAN]: 'En attente du plan correctif',
  [AuditStatus.PENDING_CORRECTIVE_PLAN_VALIDATION]: 'En attente de validation du plan',
  [AuditStatus.PENDING_OE_OPINION]: 'En attente de l\'avis OE',
  [AuditStatus.PENDING_FEEF_DECISION]: 'En attente de décision FEEF',
  [AuditStatus.COMPLETED]: 'Terminé',
  [AuditStatus.PENDING_CASE_APPROVAL]: "En attente d'approbation du dossier",
  [AuditStatus.PENDING_OE_ACCEPTANCE]: "En attente de l'acceptation OE",
  [AuditStatus.PENDING_OE_CHOICE]: "En attente du choix de l'OE",
  [AuditStatus.REFUSED_BY_OE]: "Refusé par l'OE",
  [AuditStatus.REFUSED_PLAN]: "Plan d'action refusé",
  [AuditStatus.PENDING_COMPLEMENTARY_AUDIT]: 'Audit complémentaire',
}

/**
 * Couleurs de badge pour les statuts d'audit (pour Nuxt UI)
 */
export const AuditStatusColors: Record<AuditStatusType, 'primary' | 'warning' | 'success' | 'info' | 'neutral' | 'error'> = {
  [AuditStatus.PENDING_CASE_APPROVAL]: 'warning',
  [AuditStatus.PENDING_OE_ACCEPTANCE]: 'warning',
  [AuditStatus.PENDING_OE_CHOICE]: 'warning',
  [AuditStatus.PLANNING]: 'info',
  [AuditStatus.SCHEDULED]: 'info',
  [AuditStatus.PENDING_REPORT]: 'warning',
  [AuditStatus.PENDING_CORRECTIVE_PLAN]: 'warning',
  [AuditStatus.PENDING_CORRECTIVE_PLAN_VALIDATION]: 'warning',
  [AuditStatus.PENDING_OE_OPINION]: 'warning',
  [AuditStatus.PENDING_FEEF_DECISION]: 'primary',
  [AuditStatus.COMPLETED]: 'success',
  [AuditStatus.REFUSED_BY_OE]: 'error',
  [AuditStatus.REFUSED_PLAN]: 'error',
  [AuditStatus.PENDING_COMPLEMENTARY_AUDIT]: 'warning',
}

/**
 * Obtenir le label d'un statut d'audit
 */
export function getAuditStatusLabel(status: AuditStatusType): string {
  return AuditStatusLabels[status] || status
}

/**
 * Obtenir la couleur du badge d'un statut d'audit
 */
export function getAuditStatusColor(status: AuditStatusType): 'primary' | 'warning' | 'success' | 'info' | 'neutral' | 'error' {
  return AuditStatusColors[status] || 'neutral'
}

/**
 * Flow des statuts d'audit (ordre chronologique)
 * Exclut REFUSED_BY_OE qui est hors du flow normal
 */
export const AuditStatusFlow: AuditStatusType[] = [
  AuditStatus.PENDING_CASE_APPROVAL,
  AuditStatus.PENDING_OE_CHOICE,
  AuditStatus.PENDING_OE_ACCEPTANCE,
  AuditStatus.PLANNING,
  AuditStatus.SCHEDULED,
  AuditStatus.PENDING_REPORT,
  AuditStatus.PENDING_CORRECTIVE_PLAN,
  AuditStatus.PENDING_CORRECTIVE_PLAN_VALIDATION,
  AuditStatus.PENDING_OE_OPINION,
  AuditStatus.PENDING_FEEF_DECISION,
  AuditStatus.COMPLETED,
]

/**
 * Descriptions détaillées pour les statuts d'audit
 */
export const AuditStatusDescriptions: Record<AuditStatusType, string> = {
  [AuditStatus.PENDING_CASE_APPROVAL]: 'Le dossier attend la validation par FEEF',
  [AuditStatus.PENDING_OE_CHOICE]: "Sélection de l'organisme évaluateur",
  [AuditStatus.PENDING_OE_ACCEPTANCE]: "En attente de l'acceptation par l'OE",
  [AuditStatus.PLANNING]: "Planification de l'audit avec l'auditeur",
  [AuditStatus.SCHEDULED]: 'Audit planifié, en attente de réalisation',
  [AuditStatus.PENDING_REPORT]: "Rédaction du rapport d'audit",
  [AuditStatus.PENDING_CORRECTIVE_PLAN]: "Élaboration du plan d'action correctif",
  [AuditStatus.PENDING_CORRECTIVE_PLAN_VALIDATION]: "Validation du plan correctif par l'OE",
  [AuditStatus.PENDING_OE_OPINION]: "Rédaction de l'avis par l'organisme évaluateur",
  [AuditStatus.PENDING_FEEF_DECISION]: 'Décision finale de labellisation par FEEF',
  [AuditStatus.COMPLETED]: 'Label obtenu avec succès !',
  [AuditStatus.REFUSED_BY_OE]: "Audit refusé par l'organisme évaluateur",
  [AuditStatus.REFUSED_PLAN]: "Le plan d'action correctif a été refusé définitivement",
  [AuditStatus.PENDING_COMPLEMENTARY_AUDIT]: "Un audit complémentaire est en cours pour vérifier les corrections",
}

/**
 * Obtenir la description d'un statut d'audit
 */
export function getAuditStatusDescription(status: AuditStatusType): string {
  return AuditStatusDescriptions[status] || ''
}

/**
 * Catégories de documents de revue documentaire
 */
export const DocumentaryReviewCategory = {
  CANDIDACY: 'CANDIDACY',
  AUDIT: 'AUDIT',
  OTHER: 'OTHER',
  CORRECTIVE_ACTION_PROOF: 'CORRECTIVE_ACTION_PROOF',
} as const

export type DocumentaryReviewCategoryType = typeof DocumentaryReviewCategory[keyof typeof DocumentaryReviewCategory]

/**
 * Labels français pour les catégories de revue documentaire
 */
export const DocumentaryReviewCategoryLabels: Record<DocumentaryReviewCategoryType, string> = {
  [DocumentaryReviewCategory.CANDIDACY]: 'Documents de candidature',
  [DocumentaryReviewCategory.AUDIT]: 'Documents d\'audits',
  [DocumentaryReviewCategory.OTHER]: 'Autres',
  [DocumentaryReviewCategory.CORRECTIVE_ACTION_PROOF]: 'Preuves du plan d\'action correctif',
}

/**
 * Icônes pour les catégories de revue documentaire (Lucide icons)
 */
export const DocumentaryReviewCategoryIcons: Record<DocumentaryReviewCategoryType, string> = {
  [DocumentaryReviewCategory.CANDIDACY]: 'i-lucide-file-check',
  [DocumentaryReviewCategory.AUDIT]: 'i-lucide-clipboard-check',
  [DocumentaryReviewCategory.OTHER]: 'i-lucide-file',
  [DocumentaryReviewCategory.CORRECTIVE_ACTION_PROOF]: 'i-lucide-file-badge',
}

/**
 * Couleurs de badge pour les catégories (pour Nuxt UI)
 */
export const DocumentaryReviewCategoryColors: Record<DocumentaryReviewCategoryType, 'primary' | 'success' | 'neutral' | 'warning'> = {
  [DocumentaryReviewCategory.CANDIDACY]: 'primary',
  [DocumentaryReviewCategory.AUDIT]: 'success',
  [DocumentaryReviewCategory.OTHER]: 'neutral',
  [DocumentaryReviewCategory.CORRECTIVE_ACTION_PROOF]: 'warning',
}

/**
 * Obtenir le label d'une catégorie de revue documentaire
 */
export function getDocumentaryReviewCategoryLabel(category: DocumentaryReviewCategoryType): string {
  return DocumentaryReviewCategoryLabels[category] || category
}

/**
 * Obtenir l'icône d'une catégorie de revue documentaire
 */
export function getDocumentaryReviewCategoryIcon(category: DocumentaryReviewCategoryType): string {
  return DocumentaryReviewCategoryIcons[category] || 'i-lucide-file'
}

/**
 * Obtenir la couleur du badge d'une catégorie
 */
export function getDocumentaryReviewCategoryColor(category: DocumentaryReviewCategoryType): 'primary' | 'success' | 'neutral' | 'warning' {
  return DocumentaryReviewCategoryColors[category] || 'neutral'
}

/**
 * Obtenir la liste des catégories avec labels
 */
export function getDocumentaryReviewCategoryItems(): Array<{ label: string; value: DocumentaryReviewCategoryType }> {
  return Object.entries(DocumentaryReviewCategory).map(([_, value]) => ({
    label: DocumentaryReviewCategoryLabels[value as DocumentaryReviewCategoryType],
    value: value as DocumentaryReviewCategoryType,
  }))
}

/**
 * Phases d'audit (pour les notations)
 */
export const AuditPhase = {
  PHASE_1: 'PHASE_1',
  PHASE_2: 'PHASE_2',
} as const

export type AuditPhaseType = typeof AuditPhase[keyof typeof AuditPhase]

/**
 * Labels français pour les phases d'audit
 */
export const AuditPhaseLabels: Record<AuditPhaseType, string> = {
  [AuditPhase.PHASE_1]: 'Phase 1 - Audit initial',
  [AuditPhase.PHASE_2]: 'Phase 2 - Audit complémentaire',
}

/**
 * Obtenir le label d'une phase d'audit
 */
export function getAuditPhaseLabel(phase: AuditPhaseType): string {
  return AuditPhaseLabels[phase] || phase
}

/**
 * Régions françaises (13 métropolitaines + 5 outre-mer)
 */
export const FrenchRegion = {
  AUVERGNE_RHONE_ALPES: 'AUVERGNE_RHONE_ALPES',
  BOURGOGNE_FRANCHE_COMTE: 'BOURGOGNE_FRANCHE_COMTE',
  BRETAGNE: 'BRETAGNE',
  CENTRE_VAL_DE_LOIRE: 'CENTRE_VAL_DE_LOIRE',
  CORSE: 'CORSE',
  GRAND_EST: 'GRAND_EST',
  HAUTS_DE_FRANCE: 'HAUTS_DE_FRANCE',
  ILE_DE_FRANCE: 'ILE_DE_FRANCE',
  NORMANDIE: 'NORMANDIE',
  NOUVELLE_AQUITAINE: 'NOUVELLE_AQUITAINE',
  OCCITANIE: 'OCCITANIE',
  PAYS_DE_LA_LOIRE: 'PAYS_DE_LA_LOIRE',
  PROVENCE_ALPES_COTE_D_AZUR: 'PROVENCE_ALPES_COTE_D_AZUR',
  GUADELOUPE: 'GUADELOUPE',
  GUYANE: 'GUYANE',
  LA_REUNION: 'LA_REUNION',
  MARTINIQUE: 'MARTINIQUE',
  MAYOTTE: 'MAYOTTE',
} as const

export type FrenchRegionType = typeof FrenchRegion[keyof typeof FrenchRegion]

/**
 * Labels français pour les régions
 */
export const FrenchRegionLabels: Record<FrenchRegionType, string> = {
  [FrenchRegion.AUVERGNE_RHONE_ALPES]: 'Auvergne-Rhône-Alpes',
  [FrenchRegion.BOURGOGNE_FRANCHE_COMTE]: 'Bourgogne-Franche-Comté',
  [FrenchRegion.BRETAGNE]: 'Bretagne',
  [FrenchRegion.CENTRE_VAL_DE_LOIRE]: 'Centre-Val de Loire',
  [FrenchRegion.CORSE]: 'Corse',
  [FrenchRegion.GRAND_EST]: 'Grand Est',
  [FrenchRegion.HAUTS_DE_FRANCE]: 'Hauts-de-France',
  [FrenchRegion.ILE_DE_FRANCE]: 'Île-de-France',
  [FrenchRegion.NORMANDIE]: 'Normandie',
  [FrenchRegion.NOUVELLE_AQUITAINE]: 'Nouvelle-Aquitaine',
  [FrenchRegion.OCCITANIE]: 'Occitanie',
  [FrenchRegion.PAYS_DE_LA_LOIRE]: 'Pays de la Loire',
  [FrenchRegion.PROVENCE_ALPES_COTE_D_AZUR]: 'Provence-Alpes-Côte d\'Azur',
  [FrenchRegion.GUADELOUPE]: 'Guadeloupe',
  [FrenchRegion.GUYANE]: 'Guyane',
  [FrenchRegion.LA_REUNION]: 'La Réunion',
  [FrenchRegion.MARTINIQUE]: 'Martinique',
  [FrenchRegion.MAYOTTE]: 'Mayotte',
}

/**
 * Obtenir le label d'une région française
 */
export function getRegionLabel(region: string): string {
  return FrenchRegionLabels[region as FrenchRegionType] || region
}

/**
 * Obtenir la liste des régions avec labels pour USelect
 */
export function getRegionItems(): Array<{ label: string; value: FrenchRegionType }> {
  return Object.entries(FrenchRegion).map(([_, value]) => ({
    label: FrenchRegionLabels[value as FrenchRegionType],
    value: value as FrenchRegionType,
  }))
}