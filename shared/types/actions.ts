/**
 * Types et registre des actions pour le workflow de labellisation FEEF
 *
 * Ce fichier définit tous les types d'actions, leurs critères de complétion,
 * leurs triggers de création automatique, et les groupes d'actions partagées.
 */

import { Role, type RoleType } from './roles'
import { AuditStatus, type AuditStatusType } from './enums'

/**
 * Action type identifiers
 */
export const ActionType = {
  // FEEF Actions
  FEEF_VALIDATE_CASE_SUBMISSION: 'FEEF_VALIDATE_CASE_SUBMISSION',
  FEEF_VALIDATE_LABELING_DECISION: 'FEEF_VALIDATE_LABELING_DECISION',

  // ENTITY Actions
  ENTITY_SUBMIT_CASE: 'ENTITY_SUBMIT_CASE',
  ENTITY_MARK_DOCUMENTARY_REVIEW_READY: 'ENTITY_MARK_DOCUMENTARY_REVIEW_READY',
  ENTITY_CHOOSE_OE: 'ENTITY_CHOOSE_OE',
  ENTITY_UPLOAD_REQUESTED_DOCUMENTS: 'ENTITY_UPLOAD_REQUESTED_DOCUMENTS',
  ENTITY_UPDATE_CASE_INFORMATION: 'ENTITY_UPDATE_CASE_INFORMATION',
  ENTITY_SIGN_FEEF_CONTRACT: 'ENTITY_SIGN_FEEF_CONTRACT',
  ENTITY_UPLOAD_CORRECTIVE_PLAN: 'ENTITY_UPLOAD_CORRECTIVE_PLAN',
  ENTITY_UPDATE_DOCUMENT: 'ENTITY_UPDATE_DOCUMENT',

  // OE Actions
  OE_ACCEPT_OR_REFUSE_AUDIT: 'OE_ACCEPT_OR_REFUSE_AUDIT',

  // OE/AUDITOR Actions fusionnées (multi-rôles)
  SET_AUDIT_DATES: 'SET_AUDIT_DATES',
  UPLOAD_AUDIT_PLAN: 'UPLOAD_AUDIT_PLAN',
  UPLOAD_AUDIT_REPORT: 'UPLOAD_AUDIT_REPORT',
  VALIDATE_CORRECTIVE_PLAN: 'VALIDATE_CORRECTIVE_PLAN',
  UPLOAD_LABELING_OPINION: 'UPLOAD_LABELING_OPINION',
} as const

export type ActionTypeType = typeof ActionType[keyof typeof ActionType]

/**
 * Action status identifiers
 */
export const ActionStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const

export type ActionStatusType = typeof ActionStatus[keyof typeof ActionStatus]

/**
 * Action metadata structure
 */
export interface ActionMetadata {
  // Pour les actions d'upload de documents
  documentType?: string
  documentaryReviewId?: number

  // Pour les actions de mise à jour
  requiredFields?: string[]

  // Pour les actions de signature de contrat
  contractId?: number

  // Pour le choix de l'OE
  availableOeIds?: number[]

  // Toute autre donnée contextuelle
  [key: string]: any
}

/**
 * Completion detection configuration
 */
export interface ActionCompletionCriteria {
  // Champ de base de données qui doit être défini
  field?: string

  // Statut(s) d'audit qui déclenche(nt) la complétion (OR si plusieurs)
  auditStatus?: AuditStatusType | AuditStatusType[]

  // Type de document qui doit être uploadé
  documentType?: string

  // Fonction de vérification personnalisée (évaluée côté serveur)
  customCheck?: string // Nom de fonction à appeler
}

/**
 * Action type definition
 */
export interface ActionTypeDefinition {
  key: ActionTypeType
  titleFr: string
  descriptionFr: string

  // Assignation de rôle (peut contenir plusieurs rôles pour actions partagées)
  assignedRoles: RoleType[]

  // Durée par défaut
  defaultDurationDays: number

  // Critères de complétion automatique
  completionCriteria: ActionCompletionCriteria

  // Triggers de création automatique
  triggers: {
    // Créée quand l'audit atteint ce statut
    onAuditStatus?: AuditStatusType[]

    // Créée quand un champ d'entité change
    onEntityFieldChange?: string[]

    // Créée quand un document est demandé
    onDocumentRequest?: boolean

    // Créée quand un contrat atteint ce statut
    onContractStatus?: string[]

    // Trigger personnalisé
    customTrigger?: string // Nom de fonction
  }

  // Icône pour l'UI (Lucide icons)
  icon?: string

  // Couleur pour l'UI
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info'
}

/**
 * Complete action type registry
 */
export const ACTION_TYPE_REGISTRY: Record<ActionTypeType, ActionTypeDefinition> = {
  // ============================================
  // FEEF ACTIONS
  // ============================================

  [ActionType.FEEF_VALIDATE_CASE_SUBMISSION]: {
    key: ActionType.FEEF_VALIDATE_CASE_SUBMISSION,
    titleFr: 'Valider le dépôt d\'un dossier',
    descriptionFr: 'Examiner et approuver la soumission du dossier de candidature',
    assignedRoles: [Role.FEEF],
    defaultDurationDays: 7,
    completionCriteria: {
      customCheck: 'checkCaseApprovedEvent',
    },
    triggers: {
      onAuditStatus: [AuditStatus.PENDING_CASE_APPROVAL],
    },
    icon: 'i-lucide-file-check',
    color: 'primary',
  },

  [ActionType.FEEF_VALIDATE_LABELING_DECISION]: {
    key: ActionType.FEEF_VALIDATE_LABELING_DECISION,
    titleFr: 'Valider la labellisation d\'un audit',
    descriptionFr: 'Examiner l\'avis de l\'OE et prendre la décision finale de labellisation',
    assignedRoles: [Role.FEEF],
    defaultDurationDays: 10,
    completionCriteria: {
      customCheck: 'checkFeefDecisionEvent',
    },
    triggers: {
      onAuditStatus: [AuditStatus.PENDING_FEEF_DECISION],
    },
    icon: 'i-lucide-award',
    color: 'success',
  },

  // ============================================
  // ENTITY ACTIONS
  // ============================================

  [ActionType.ENTITY_SUBMIT_CASE]: {
    key: ActionType.ENTITY_SUBMIT_CASE,
    titleFr: 'Déposer son dossier',
    descriptionFr: 'Soumettre votre dossier de candidature à la labellisation',
    assignedRoles: [Role.ENTITY],
    defaultDurationDays: 30,
    completionCriteria: {
      customCheck: 'checkCaseSubmittedEvent',
    },
    triggers: {
      // Pas de trigger automatique pour le moment
    },
    icon: 'i-lucide-send',
    color: 'primary',
  },

  [ActionType.ENTITY_MARK_DOCUMENTARY_REVIEW_READY]: {
    key: ActionType.ENTITY_MARK_DOCUMENTARY_REVIEW_READY,
    titleFr: 'Marquer la revue documentaire comme prête',
    descriptionFr: 'Confirmer que tous vos documents sont à jour et prêts pour la revue',
    assignedRoles: [Role.ENTITY],
    defaultDurationDays: 14,
    completionCriteria: {
      customCheck: 'checkDocumentaryReviewReadyEvent',
    },
    triggers: {
      onAuditStatus: [AuditStatus.SCHEDULED],
    },
    icon: 'i-lucide-check-circle',
    color: 'success',
  },

  [ActionType.ENTITY_CHOOSE_OE]: {
    key: ActionType.ENTITY_CHOOSE_OE,
    titleFr: 'Choisir son organisme évaluateur',
    descriptionFr: 'Sélectionner l\'OE qui effectuera votre audit de labellisation',
    assignedRoles: [Role.ENTITY],
    defaultDurationDays: 15,
    completionCriteria: {
      // L'action se termine soit quand l'OE accepte (PLANNING), soit quand l'entité choisit un OE (PENDING_OE_ACCEPTANCE)
      auditStatus: [AuditStatus.PLANNING, AuditStatus.PENDING_OE_ACCEPTANCE],
    },
    triggers: {
      onAuditStatus: [AuditStatus.PENDING_OE_CHOICE],
    },
    icon: 'i-lucide-users',
    color: 'primary',
  },

  [ActionType.ENTITY_UPLOAD_REQUESTED_DOCUMENTS]: {
    key: ActionType.ENTITY_UPLOAD_REQUESTED_DOCUMENTS,
    titleFr: 'Mettre à jour les documents demandés',
    descriptionFr: 'Téléverser une nouvelle version des documents requis',
    assignedRoles: [Role.ENTITY],
    defaultDurationDays: 10,
    completionCriteria: {
      customCheck: 'checkDocumentVersionUploaded',
    },
    triggers: {
      // Pas de trigger automatique pour le moment
    },
    icon: 'i-lucide-upload',
    color: 'warning',
  },

  [ActionType.ENTITY_UPDATE_CASE_INFORMATION]: {
    key: ActionType.ENTITY_UPDATE_CASE_INFORMATION,
    titleFr: 'Mettre à jour les informations du dossier',
    descriptionFr: 'Modifier les informations demandées dans votre dossier',
    assignedRoles: [Role.ENTITY],
    defaultDurationDays: 10,
    completionCriteria: {
      customCheck: 'checkEntityFieldUpdated',
    },
    triggers: {
      // Pas de trigger automatique pour le moment
    },
    icon: 'i-lucide-edit',
    color: 'info',
  },

  [ActionType.ENTITY_SIGN_FEEF_CONTRACT]: {
    key: ActionType.ENTITY_SIGN_FEEF_CONTRACT,
    titleFr: 'Signer le contrat avec la FEEF',
    descriptionFr: 'Signer le contrat d\'engagement avec la FEEF',
    assignedRoles: [Role.ENTITY],
    defaultDurationDays: 15,
    completionCriteria: {
      customCheck: 'checkContractEntitySigned',
    },
    triggers: {
      onContractStatus: ['PENDING_ENTITY'],
    },
    icon: 'i-lucide-pen-tool',
    color: 'warning',
  },

  [ActionType.ENTITY_UPLOAD_CORRECTIVE_PLAN]: {
    key: ActionType.ENTITY_UPLOAD_CORRECTIVE_PLAN,
    titleFr: 'Mettre en ligne votre plan d\'action correctif',
    descriptionFr: 'Téléverser le plan d\'action pour corriger les non-conformités identifiées lors de l\'audit',
    assignedRoles: [Role.ENTITY],
    defaultDurationDays: 30, // Fallback si actionPlanDeadline non définie
    completionCriteria: {
      auditStatus: AuditStatus.PENDING_CORRECTIVE_PLAN_VALIDATION,
    },
    triggers: {
      onAuditStatus: [AuditStatus.PENDING_CORRECTIVE_PLAN],
    },
    icon: 'i-lucide-list-checks',
    color: 'warning',
  },

  [ActionType.ENTITY_UPDATE_DOCUMENT]: {
    key: ActionType.ENTITY_UPDATE_DOCUMENT,
    titleFr: 'Mettre à jour les documents demandés',
    descriptionFr: 'Téléverser les nouvelles versions des documents demandés par l\'OE',
    assignedRoles: [Role.ENTITY],
    defaultDurationDays: 10,
    completionCriteria: {
      customCheck: 'checkAllDocumentRequestsCompleted',
    },
    triggers: {
      // Pas de trigger automatique - créée manuellement lors de la demande
    },
    icon: 'i-lucide-file-edit',
    color: 'warning',
  },

  // ============================================
  // OE ACTIONS
  // ============================================

  [ActionType.OE_ACCEPT_OR_REFUSE_AUDIT]: {
    key: ActionType.OE_ACCEPT_OR_REFUSE_AUDIT,
    titleFr: 'Accepter ou refuser l\'audit',
    descriptionFr: 'Indiquez si vous acceptez ou refusez d\'effectuer cet audit',
    assignedRoles: [Role.OE],
    defaultDurationDays: 7,
    completionCriteria: {
      customCheck: 'checkOeResponseEvent',
    },
    triggers: {
      onAuditStatus: [AuditStatus.PENDING_OE_ACCEPTANCE],
    },
    icon: 'i-lucide-clipboard-check',
    color: 'warning',
  },

  // ============================================
  // OE/AUDITOR ACTIONS PARTAGÉES
  // ============================================

  [ActionType.SET_AUDIT_DATES]: {
    key: ActionType.SET_AUDIT_DATES,
    titleFr: 'Définir les dates d\'audit',
    descriptionFr: 'Définir les dates de début et de fin de l\'audit',
    assignedRoles: [Role.OE, Role.AUDITOR],
    defaultDurationDays: 10,
    completionCriteria: {
      customCheck: 'checkAuditDatesSet',
    },
    triggers: {
      onAuditStatus: [AuditStatus.PLANNING],
    },
    icon: 'i-lucide-calendar',
    color: 'primary',
  },

  [ActionType.UPLOAD_AUDIT_PLAN]: {
    key: ActionType.UPLOAD_AUDIT_PLAN,
    titleFr: 'Mettre en ligne le plan d\'audit',
    descriptionFr: 'Téléverser le plan d\'audit détaillé',
    assignedRoles: [Role.OE, Role.AUDITOR],
    defaultDurationDays: 15,
    completionCriteria: {
      documentType: 'PLAN',
    },
    triggers: {
      onAuditStatus: [AuditStatus.PLANNING],
    },
    icon: 'i-lucide-calendar-check',
    color: 'primary',
  },

  [ActionType.UPLOAD_AUDIT_REPORT]: {
    key: ActionType.UPLOAD_AUDIT_REPORT,
    titleFr: 'Mettre en ligne le rapport d\'audit et les scores',
    descriptionFr: 'Téléverser le rapport complet de l\'audit avec les scores',
    assignedRoles: [Role.OE, Role.AUDITOR],
    defaultDurationDays: 20,
    completionCriteria: {
      documentType: 'REPORT',
    },
    triggers: {
      onAuditStatus: [AuditStatus.PENDING_REPORT],
    },
    icon: 'i-lucide-file-text',
    color: 'success',
  },

  [ActionType.VALIDATE_CORRECTIVE_PLAN]: {
    key: ActionType.VALIDATE_CORRECTIVE_PLAN,
    titleFr: 'Valider le plan d\'action correctif',
    descriptionFr: 'Examiner et valider le plan d\'action correctif de l\'entité',
    assignedRoles: [Role.OE, Role.AUDITOR],
    defaultDurationDays: 10,
    completionCriteria: {
      customCheck: 'checkCorrectivePlanValidatedEvent',
    },
    triggers: {
      onAuditStatus: [AuditStatus.PENDING_CORRECTIVE_PLAN_VALIDATION],
    },
    icon: 'i-lucide-check-square',
    color: 'warning',
  },

  [ActionType.UPLOAD_LABELING_OPINION]: {
    key: ActionType.UPLOAD_LABELING_OPINION,
    titleFr: 'Mettre en ligne l\'avis de labellisation',
    descriptionFr: 'Téléverser votre avis final concernant la labellisation',
    assignedRoles: [Role.OE, Role.AUDITOR],
    defaultDurationDays: 15,
    completionCriteria: {
      customCheck: 'checkOeOpinionTransmittedEvent',
    },
    triggers: {
      onAuditStatus: [AuditStatus.PENDING_OE_OPINION],
    },
    icon: 'i-lucide-shield-check',
    color: 'success',
  },


}

