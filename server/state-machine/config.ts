/**
 * Configuration complète de la State Machine des audits
 *
 * Ce fichier centralise toute la logique de transition entre statuts d'audit.
 * Il définit pour chaque statut :
 * - Les actions à créer lors de l'entrée dans le statut
 * - Les transitions possibles vers d'autres statuts
 * - Les guards (conditions) pour autoriser chaque transition
 * - Les side-effects à exécuter lors des transitions
 *
 * Pour ajouter un nouveau statut, il suffit de l'ajouter ici avec ses transitions.
 */

import { AuditStatus } from '~~/shared/types/enums'
import { ActionType } from '~~/shared/types/actions'
import type { StateMachineConfig } from './types'
import * as guards from './guards'
import * as actions from './actions'

/**
 * Configuration complète de la state machine
 */
export const auditStateMachineConfig: StateMachineConfig = {
  states: {
    // ============================================
    // État: PENDING_CASE_APPROVAL
    // Description: En attente d'approbation du dossier par FEEF
    // ============================================
    [AuditStatus.PENDING_CASE_APPROVAL]: {
      status: AuditStatus.PENDING_CASE_APPROVAL,
      onEnter: {
        createActions: [
          ActionType.FEEF_VALIDATE_CASE_SUBMISSION
        ]
      },
      transitions: {
        approve_with_oe: {
          target: AuditStatus.PLANNING,
          guards: ['has_oe_assigned'],
          trigger: 'MANUAL',
          description: 'FEEF approuve le dossier avec OE déjà assigné'
        },
        approve_without_oe: {
          target: AuditStatus.PENDING_OE_CHOICE,
          guards: ['no_oe_assigned'],
          trigger: 'MANUAL',
          description: 'FEEF approuve le dossier sans OE assigné'
        }
      }
    },

    // ============================================
    // État: PENDING_OE_CHOICE
    // Description: En attente du choix de l'OE par l'entité
    // ============================================
    [AuditStatus.PENDING_OE_CHOICE]: {
      status: AuditStatus.PENDING_OE_CHOICE,
      onEnter: {
        createActions: [
          ActionType.ENTITY_CHOOSE_OE
        ]
      },
      transitions: {
        oe_assigned: {
          target: AuditStatus.PLANNING,
          guards: ['has_oe_assigned'],
          trigger: 'MANUAL',
          description: 'Entité a choisi un OE'
        }
      }
    },

    // ============================================
    // État: PLANNING
    // Description: Planification de l'audit (dates, plan, préparation)
    // ============================================
    [AuditStatus.PLANNING]: {
      status: AuditStatus.PLANNING,
      onEnter: {
        createActions: [
          ActionType.SET_AUDIT_DATES,
          ActionType.UPLOAD_AUDIT_PLAN
        ]
      },
      transitions: {
        to_scheduled: {
          target: AuditStatus.SCHEDULED,
          guards: ['has_audit_plan', 'has_actual_dates', 'end_date_is_future'],
          trigger: 'AUTO_DOCUMENT',
          triggerOnActions: [ActionType.UPLOAD_AUDIT_PLAN, ActionType.SET_AUDIT_DATES],
          description: 'Plan uploadé + dates définies + date future'
        },
        to_pending_report_auto: {
          target: AuditStatus.PENDING_REPORT,
          guards: ['has_audit_plan', 'actual_end_date_passed'],
          trigger: 'AUTO_DOCUMENT',
          triggerOnActions: [ActionType.UPLOAD_AUDIT_PLAN, ActionType.SET_AUDIT_DATES],
          description: 'Plan uploadé + date de fin passée (transition immédiate)'
        },
        to_pending_report_cron: {
          target: AuditStatus.PENDING_REPORT,
          guards: ['actual_end_date_passed'],
          trigger: 'AUTO_CRON',
          description: 'Date de fin passée (cron job)'
        }
      }
    },

    // ============================================
    // État: SCHEDULED
    // Description: Audit planifié, en attente de réalisation
    // ============================================
    [AuditStatus.SCHEDULED]: {
      status: AuditStatus.SCHEDULED,
      onEnter: {
        createActions: [
          ActionType.ENTITY_MARK_DOCUMENTARY_REVIEW_READY
        ]
      },
      transitions: {
        to_pending_report_auto: {
          target: AuditStatus.PENDING_REPORT,
          guards: ['actual_end_date_passed'],
          trigger: 'AUTO_DOCUMENT',
          triggerOnActions: [ActionType.SET_AUDIT_DATES],
          description: 'Date de fin passée (transition immédiate lors du changement de dates)'
        },
        to_pending_report_cron: {
          target: AuditStatus.PENDING_REPORT,
          guards: ['actual_end_date_passed'],
          trigger: 'AUTO_CRON',
          description: 'Date de fin passée (cron job)'
        }
      }
    },

    // ============================================
    // État: PENDING_REPORT
    // Description: En attente du rapport d'audit et du score
    // ============================================
    [AuditStatus.PENDING_REPORT]: {
      status: AuditStatus.PENDING_REPORT,
      onEnter: {
        createActions: [
          ActionType.UPLOAD_AUDIT_REPORT
        ]
      },
      transitions: {
        to_pending_opinion: {
          target: AuditStatus.PENDING_OE_OPINION,
          guards: ['has_report_document', 'has_global_score'],
          trigger: 'AUTO_DOCUMENT',
          triggerOnActions: [ActionType.UPLOAD_AUDIT_REPORT],
          description: 'Rapport uploadé + score défini'
        }
      }
    },

    // ============================================
    // État: PENDING_OE_OPINION
    // Description: En attente de l'avis de l'Organisme Évaluateur
    // ============================================
    [AuditStatus.PENDING_OE_OPINION]: {
      status: AuditStatus.PENDING_OE_OPINION,
      onEnter: {
        createActions: [
          ActionType.UPLOAD_LABELING_OPINION
        ],
        executeActions: ['check_if_corrective_plan_needed']
      },
      transitions: {
        to_corrective_plan: {
          target: AuditStatus.PENDING_CORRECTIVE_PLAN,
          guards: ['needs_corrective_plan', 'no_corrective_plan_uploaded'],
          trigger: 'AUTO_DOCUMENT',
          description: 'Score < 65 ou mauvaise notation + pas de plan'
        },
        to_feef_decision: {
          target: AuditStatus.PENDING_FEEF_DECISION,
          guards: ['has_oe_opinion'],
          trigger: 'AUTO_DOCUMENT',
          triggerOnActions: [ActionType.UPLOAD_LABELING_OPINION],
          description: 'Avis OE transmis'
        }
      }
    },

    // ============================================
    // État: PENDING_CORRECTIVE_PLAN
    // Description: En attente du plan correctif de l'entité
    // ============================================
    [AuditStatus.PENDING_CORRECTIVE_PLAN]: {
      status: AuditStatus.PENDING_CORRECTIVE_PLAN,
      onEnter: {
        createActions: [
          ActionType.ENTITY_UPLOAD_CORRECTIVE_PLAN
        ]
      },
      transitions: {
        to_validation: {
          target: AuditStatus.PENDING_CORRECTIVE_PLAN_VALIDATION,
          guards: ['has_corrective_plan_document'],
          trigger: 'AUTO_DOCUMENT',
          triggerOnActions: [ActionType.ENTITY_UPLOAD_CORRECTIVE_PLAN],
          description: 'Plan correctif uploadé'
        }
      }
    },

    // ============================================
    // État: PENDING_CORRECTIVE_PLAN_VALIDATION
    // Description: En attente de validation du plan correctif par l'OE
    // ============================================
    [AuditStatus.PENDING_CORRECTIVE_PLAN_VALIDATION]: {
      status: AuditStatus.PENDING_CORRECTIVE_PLAN_VALIDATION,
      onEnter: {
        createActions: [
          ActionType.VALIDATE_CORRECTIVE_PLAN
        ]
      },
      transitions: {
        to_pending_opinion: {
          target: AuditStatus.PENDING_OE_OPINION,
          guards: ['corrective_plan_validated'],
          trigger: 'AUTO_DOCUMENT',
          triggerOnActions: [ActionType.VALIDATE_CORRECTIVE_PLAN],
          description: 'Plan validé par OE'
        }
      }
    },

    // ============================================
    // État: PENDING_FEEF_DECISION
    // Description: En attente de la décision finale de FEEF
    // ============================================
    [AuditStatus.PENDING_FEEF_DECISION]: {
      status: AuditStatus.PENDING_FEEF_DECISION,
      onEnter: {
        createActions: [
          ActionType.FEEF_VALIDATE_LABELING_DECISION
        ]
      },
      transitions: {
        to_completed: {
          target: AuditStatus.COMPLETED,
          guards: ['has_feef_decision'],
          trigger: 'MANUAL',
          actions: ['calculate_label_expiration', 'reset_entity_workflow'],
          description: 'Décision FEEF prise'
        }
      }
    },

    // ============================================
    // État: COMPLETED
    // Description: Audit terminé, certificat de labellisation émis
    // ============================================
    [AuditStatus.COMPLETED]: {
      status: AuditStatus.COMPLETED,
      onEnter: {
        createActions: [],
        executeActions: ['generate_attestation']
      },
      transitions: {} // État final, pas de transitions
    }
  },

  // ============================================
  // Registry des guards (prédicats de validation)
  // ============================================
  guards: {
    has_oe_assigned: guards.hasOeAssigned,
    no_oe_assigned: guards.noOeAssigned,
    has_audit_plan: guards.hasAuditPlan,
    has_actual_dates: guards.hasActualDates,
    end_date_is_future: guards.endDateIsFuture,
    actual_end_date_passed: guards.actualEndDatePassed,
    has_report_document: guards.hasReportDocument,
    has_global_score: guards.hasGlobalScore,
    needs_corrective_plan: guards.needsCorrectivePlan,
    no_corrective_plan_uploaded: guards.noCorrectivePlanUploaded,
    has_corrective_plan_document: guards.hasCorrectivePlanDocument,
    corrective_plan_validated: guards.correctivePlanValidated,
    has_oe_opinion: guards.hasOeOpinion,
    has_feef_decision: guards.hasFeefDecision,
  },

  // ============================================
  // Registry des actions (side-effects)
  // ============================================
  actions: {
    check_if_corrective_plan_needed: actions.checkIfCorrectivePlanNeeded,
    calculate_label_expiration: actions.calculateLabelExpiration,
    reset_entity_workflow: actions.resetEntityWorkflow,
    generate_attestation: actions.generateAttestation,
  }
}
