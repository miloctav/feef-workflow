/**
 * Types TypeScript pour la State Machine des audits
 *
 * Ce fichier définit toutes les interfaces nécessaires pour la gestion
 * des transitions de statuts d'audit via une state machine.
 */

import type { AuditStatusType } from '~~/shared/types/enums'
import type { ActionTypeType } from '~~/shared/types/actions'
import type { Audit } from '~~/server/database/schema'
import type { H3Event } from 'h3'

/**
 * Trigger type pour une transition
 *
 * - MANUAL: Transition déclenchée manuellement via API
 * - AUTO_DOCUMENT: Transition automatique lors d'un upload de document
 * - AUTO_CRON: Transition automatique via cron job (time-based)
 */
export type TransitionTrigger = 'MANUAL' | 'AUTO_DOCUMENT' | 'AUTO_CRON'

/**
 * Guard function - retourne true si la transition est autorisée
 *
 * Les guards sont des prédicats qui vérifient si les conditions
 * sont remplies pour effectuer une transition.
 *
 * @param audit - L'audit pour lequel vérifier les conditions
 * @param context - Contexte additionnel optionnel
 * @returns Promise<boolean> - true si la transition est autorisée
 */
export type GuardFunction = (audit: Audit, context?: any) => Promise<boolean>

/**
 * Action function - exécute un side-effect lors d'une transition
 *
 * Les actions sont des fonctions qui exécutent des effets de bord
 * (génération de documents, mise à jour de champs, etc.)
 *
 * @param audit - L'audit sur lequel exécuter l'action
 * @param event - Event H3 pour le tracking et l'authentification
 */
export type ActionFunction = (audit: Audit, event: H3Event) => Promise<void>

/**
 * Définition d'une transition
 *
 * Une transition définit comment passer d'un statut à un autre,
 * avec les conditions (guards) et les actions associées.
 */
export interface TransitionDefinition {
  /** Statut cible de la transition */
  target: AuditStatusType

  /** Conditions à vérifier (AND logic) avant d'autoriser la transition */
  guards?: string[]

  /** Type de déclenchement de la transition */
  trigger?: TransitionTrigger

  /** Types d'actions spécifiques qui déclenchent cette transition (pour AUTO_DOCUMENT) */
  triggerOnActions?: ActionTypeType[]

  /** Side-effects à exécuter pendant la transition */
  actions?: string[]

  /** Description pour documentation et debugging */
  description?: string
}

/**
 * Définition d'un état
 *
 * Un état représente un statut d'audit avec ses transitions possibles
 * et les actions à exécuter lors de l'entrée/sortie de cet état.
 */
export interface StateDefinition {
  /** Nom du statut */
  status: AuditStatusType

  /** Actions à exécuter lors de l'entrée dans cet état */
  onEnter?: {
    /** Actions utilisateur à créer (tâches assignées) */
    createActions?: ActionTypeType[]
    /** Side-effects à exécuter */
    executeActions?: string[]
  }

  /** Actions à exécuter lors de la sortie de cet état */
  onExit?: {
    /** Side-effects à exécuter */
    executeActions?: string[]
  }

  /** Transitions possibles depuis cet état (key = nom de la transition) */
  transitions: Record<string, TransitionDefinition>
}

/**
 * Configuration complète de la state machine
 *
 * Contient tous les états possibles et les registres de guards/actions.
 */
export interface StateMachineConfig {
  /** Tous les états possibles, indexés par statut */
  states: Record<AuditStatusType, StateDefinition>

  /** Registry des guards disponibles (nom → fonction) */
  guards: Record<string, GuardFunction>

  /** Registry des actions disponibles (nom → fonction) */
  actions: Record<string, ActionFunction>
}

/**
 * Résultat d'une transition
 *
 * Retourné après l'exécution d'une transition pour indiquer
 * le succès/échec et les détails de la transition.
 */
export interface TransitionResult {
  /** Indique si la transition a réussi */
  success: boolean

  /** Statut de départ */
  from: AuditStatusType

  /** Statut d'arrivée */
  to: AuditStatusType

  /** ID de l'utilisateur qui a déclenché la transition */
  triggeredBy?: number

  /** Message d'erreur si la transition a échoué */
  error?: string

  /** IDs des actions créées lors de la transition */
  actionsCreated?: number[]
}
