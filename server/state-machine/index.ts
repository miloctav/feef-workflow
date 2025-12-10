/**
 * Point d'entrée public de la State Machine des audits
 *
 * Ce fichier exporte les éléments publics de la state machine
 * pour utilisation dans le reste de l'application.
 *
 * Usage:
 * ```typescript
 * import { auditStateMachine } from '~/server/state-machine'
 *
 * // Exécuter une transition manuelle
 * await auditStateMachine.transition(audit, AuditStatus.SCHEDULED, event)
 *
 * // Vérifier les auto-transitions
 * await auditStateMachine.checkAutoTransition(audit, event, actionType)
 * ```
 */

// Export de l'instance singleton de la state machine
export { auditStateMachine } from './engine'

// Export de la configuration (utile pour debugging/introspection)
export { auditStateMachineConfig } from './config'

// Export des types publics
export type { TransitionResult } from './types'
