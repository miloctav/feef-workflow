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
        approve_with_oe_needs_acceptance: {
          target: AuditStatus.PENDING_OE_ACCEPTANCE,
          guards: ['has_oe_assigned', 'requires_oe_acceptance'],
          trigger: 'MANUAL',
          description: 'FEEF approuve + OE assigné + audit INITIAL/RENEWAL → acceptation requise'
        },
        approve_with_oe_monitoring: {
          target: AuditStatus.PLANNING,
          guards: ['has_oe_assigned', 'is_monitoring_audit'],
          trigger: 'MANUAL',
          description: 'FEEF approuve + OE assigné + audit MONITORING → planification directe'
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
    // État: PENDING_OE_ACCEPTANCE
    // Description: En attente de l'acceptation de l'OE
    // ============================================
    [AuditStatus.PENDING_OE_ACCEPTANCE]: {
      status: AuditStatus.PENDING_OE_ACCEPTANCE,
      onEnter: {
        createActions: [
          ActionType.OE_ACCEPT_OR_REFUSE_AUDIT
        ]
      },
      transitions: {
        oe_accepts: {
          target: AuditStatus.PLANNING,
          guards: ['oe_has_accepted'],
          trigger: 'AUTO_DOCUMENT',
          description: 'OE accepte l\'audit → planification'
        },
        oe_refuses: {
          target: AuditStatus.REFUSED_BY_OE,
          guards: ['oe_has_refused'],
          trigger: 'AUTO_DOCUMENT',
          actions: ['create_new_audit_after_refusal'],
          description: 'OE refuse l\'audit → créer nouvel audit + retirer OE'
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
        oe_assigned_needs_acceptance: {
          target: AuditStatus.PENDING_OE_ACCEPTANCE,
          guards: ['has_oe_assigned', 'requires_oe_acceptance'],
          trigger: 'MANUAL',
          description: 'OE assigné pour audit INITIAL/RENEWAL → acceptation requise'
        },
        oe_assigned_monitoring: {
          target: AuditStatus.PLANNING,
          guards: ['has_oe_assigned', 'is_monitoring_audit'],
          trigger: 'MANUAL',
          description: 'OE assigné pour audit MONITORING → planification directe'
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
        executeActions: ['check_if_action_plan_needed']
      },
      transitions: {
        to_corrective_plan: {
          target: AuditStatus.PENDING_CORRECTIVE_PLAN,
          guards: ['needs_action_plan', 'no_action_plan_uploaded'],
          trigger: 'AUTO_DOCUMENT',
          description: 'Plan d\'action requis (score < 65 ou note C/D) + pas de plan uploadé'
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
          guards: ['has_action_plan_document'],
          trigger: 'AUTO_DOCUMENT',
          triggerOnActions: [ActionType.ENTITY_UPLOAD_CORRECTIVE_PLAN],
          description: 'Plan d\'action uploadé (court ou long terme)'
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
          guards: ['action_plan_validated'],
          trigger: 'AUTO_DOCUMENT',
          triggerOnActions: [ActionType.VALIDATE_CORRECTIVE_PLAN],
          description: 'Plan d\'action validé par OE/FEEF'
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
        createActions: []
        // executeActions supprimé - génération manuelle uniquement
      },
      transitions: {} // État final, pas de transitions
    },

    // ============================================
    // État: REFUSED_BY_OE
    // Description: Audit refusé par l'OE (terminal)
    // ============================================
    [AuditStatus.REFUSED_BY_OE]: {
      status: AuditStatus.REFUSED_BY_OE,
      onEnter: {
        createActions: []
      },
      transitions: {} // État terminal, pas de transitions
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
    needs_action_plan: guards.needsActionPlan,
    no_action_plan_uploaded: guards.noActionPlanUploaded,
    has_action_plan_document: guards.hasActionPlanDocument,
    action_plan_validated: guards.actionPlanValidated,
    has_oe_opinion: guards.hasOeOpinion,
    has_feef_decision: guards.hasFeefDecision,
    requires_oe_acceptance: guards.requiresOeAcceptance,
    is_monitoring_audit: guards.isMonitoringAudit,
    oe_has_accepted: guards.oeHasAccepted,
    oe_has_refused: guards.oeHasRefused,
  },

  // ============================================
  // Registry des actions (side-effects)
  // ============================================
  actions: {
    check_if_action_plan_needed: actions.checkIfActionPlanNeeded,
    calculate_label_expiration: actions.calculateLabelExpiration,
    reset_entity_workflow: actions.resetEntityWorkflow,
    generate_attestation: actions.generateAttestation,
    create_new_audit_after_refusal: actions.createNewAuditAfterRefusal,
  }
}
