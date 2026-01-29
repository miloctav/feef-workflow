/**
 * Moteur d'exécution de la State Machine des audits
 *
 * Ce fichier contient la classe AuditStateMachine qui orchestre
 * toutes les transitions de statuts d'audit selon la configuration
 * définie dans config.ts.
 *
 * Le moteur vérifie les guards, exécute les actions (side-effects),
 * crée les actions utilisateur, et gère les auto-transitions.
 */

import { db } from '~~/server/database'
import { audits, actions } from '~~/server/database/schema'
import { eq } from 'drizzle-orm'
import { forUpdate } from '~~/server/utils/tracking'
import { auditStateMachineConfig } from './config'
import { ACTION_TYPE_REGISTRY } from '~~/shared/types/actions'
import { createAction } from '~~/server/services/actions'
import type { AuditStatusType } from '~~/shared/types/enums'
import type { Audit } from '~~/server/database/schema'
import type { H3Event } from 'h3'
import type { TransitionResult, TransitionDefinition, StateDefinition } from './types'

/**
 * Moteur d'exécution de la state machine
 *
 * Cette classe gère l'exécution des transitions de statuts d'audit
 * en suivant la configuration définie dans auditStateMachineConfig.
 */
export class AuditStateMachine {
  /**
   * Exécute une transition vers un nouveau statut
   *
   * Cette méthode orchestre toute la logique de transition :
   * 1. Vérifie que la transition est autorisée
   * 2. Vérifie tous les guards
   * 3. Exécute les actions onExit de l'état actuel
   * 4. Met à jour le statut en base de données
   * 5. Exécute les actions de la transition
   * 6. Exécute les actions onEnter du nouvel état
   * 7. Crée les actions utilisateur pour le nouvel état
   *
   * @param audit - Audit à faire transiter
   * @param targetStatus - Statut cible
   * @param event - Event H3 pour le tracking
   * @param transitionName - Nom de la transition (optionnel, auto-détecté sinon)
   * @returns Résultat de la transition
   * @throws Error si la transition n'est pas autorisée ou si les guards échouent
   */
  async transition(
    audit: Audit,
    targetStatus: AuditStatusType,
    event: H3Event,
    transitionName?: string
  ): Promise<TransitionResult> {
    const { user } = await requireUserSession(event)
    const currentStatus = audit.status

    console.log(`[State Machine] 🔄 Tentative de transition: ${currentStatus} → ${targetStatus}`)

    // Vérifier que le statut a changé
    if (currentStatus === targetStatus) {
      console.log(`[State Machine] ℹ️  Statut inchangé (${targetStatus}), aucune action à exécuter`)
      return {
        success: true,
        from: currentStatus,
        to: targetStatus,
        triggeredBy: user.id
      }
    }

    // Récupérer la définition de l'état actuel
    const currentState = auditStateMachineConfig.states[currentStatus]
    if (!currentState) {
      throw new Error(`État non trouvé: ${currentStatus}`)
    }

    // Trouver la transition
    const transition = transitionName
      ? currentState.transitions[transitionName]
      : this.findTransitionByTarget(currentState, targetStatus)

    if (!transition) {
      throw new Error(`Transition non autorisée: ${currentStatus} → ${targetStatus}`)
    }

    console.log(`[State Machine] 📋 Transition trouvée: ${transition.description || 'N/A'}`)

    // Vérifier les guards
    await this.checkGuards(audit, transition)

    // Exécuter les actions onExit de l'état actuel
    if (currentState.onExit?.executeActions) {
      console.log(`[State Machine] 🚪 Exécution des actions onExit de ${currentStatus}`)
      await this.executeActions(audit, event, currentState.onExit.executeActions)
    }

    // Mettre à jour le statut dans la base de données
    console.log(`[State Machine] 💾 Mise à jour du statut en base de données`)
    await db.update(audits)
      .set(forUpdate(event, { status: targetStatus }))
      .where(eq(audits.id, audit.id))

    // Récupérer l'audit mis à jour
    const updatedAudit = await db.query.audits.findFirst({
      where: eq(audits.id, audit.id)
    })

    if (!updatedAudit) {
      throw new Error(`Audit ${audit.id} introuvable après mise à jour`)
    }

    // Exécuter les actions de la transition
    if (transition.actions) {
      console.log(`[State Machine] ⚙️  Exécution des actions de transition`)
      await this.executeActions(updatedAudit, event, transition.actions)
    }

    // Récupérer la définition du nouvel état
    const newState = auditStateMachineConfig.states[targetStatus]

    // Exécuter les actions onEnter du nouvel état
    if (newState.onEnter?.executeActions) {
      console.log(`[State Machine] 🚪 Exécution des actions onEnter de ${targetStatus}`)
      await this.executeActions(updatedAudit, event, newState.onEnter.executeActions)
    }

    // Créer les actions pour le nouvel état
    const createdActionIds = await this.createActionsForState(updatedAudit, newState, event)

    console.log(`[State Machine] ✅ Transition réussie: ${currentStatus} → ${targetStatus}`)
    if (createdActionIds.length > 0) {
      console.log(`[State Machine] 📝 ${createdActionIds.length} action(s) créée(s): ${createdActionIds.join(', ')}`)
    }

    return {
      success: true,
      from: currentStatus,
      to: targetStatus,
      triggeredBy: user.id,
      actionsCreated: createdActionIds
    }
  }

  /**
   * Trouve une transition par son statut cible
   *
   * Parcourt toutes les transitions de l'état actuel pour trouver
   * celle qui mène au statut cible.
   *
   * @param state - Définition de l'état actuel
   * @param targetStatus - Statut cible recherché
   * @returns La transition trouvée ou null
   */
  private findTransitionByTarget(
    state: StateDefinition,
    targetStatus: AuditStatusType
  ): TransitionDefinition | null {
    for (const transitionDef of Object.values(state.transitions)) {
      if ((transitionDef as TransitionDefinition).target === targetStatus) {
        return transitionDef as TransitionDefinition
      }
    }
    return null
  }

  /**
   * Vérifie tous les guards d'une transition
   *
   * Exécute tous les guards de la transition en séquence (AND logic).
   * Si un guard échoue, la transition est rejetée.
   *
   * @param audit - L'audit pour lequel vérifier les guards
   * @param transition - La transition avec ses guards
   * @throws Error si un guard échoue
   */
  private async checkGuards(audit: Audit, transition: TransitionDefinition): Promise<void> {
    if (!transition.guards || transition.guards.length === 0) {
      return // Pas de guards à vérifier
    }

    console.log(`[State Machine] 🔐 Vérification de ${transition.guards.length} guard(s)`)

    for (const guardName of transition.guards) {
      const guardFn = auditStateMachineConfig.guards[guardName]

      if (!guardFn) {
        throw new Error(`Guard non trouvé: ${guardName}`)
      }

      const result = await guardFn(audit)

      if (!result) {
        console.log(`[State Machine] ❌ Guard échoué: ${guardName}`)
        throw new Error(`Guard échoué: ${guardName}`)
      }

      console.log(`[State Machine] ✅ Guard passé: ${guardName}`)
    }
  }

  /**
   * Exécute une liste d'actions (side-effects)
   *
   * Exécute les actions en séquence. Si une action échoue, l'erreur
   * est loggée mais l'exécution continue (non-blocking).
   *
   * @param audit - L'audit sur lequel exécuter les actions
   * @param event - Event H3 pour le tracking
   * @param actionNames - Noms des actions à exécuter
   */
  private async executeActions(
    audit: Audit,
    event: H3Event,
    actionNames: string[]
  ): Promise<void> {
    for (const actionName of actionNames) {
      const actionFn = auditStateMachineConfig.actions[actionName]

      if (!actionFn) {
        console.warn(`[State Machine] ⚠️  Action non trouvée: ${actionName}`)
        continue
      }

      try {
        await actionFn(audit, event)
      } catch (error) {
        console.error(`[State Machine] ❌ Erreur lors de l'exécution de l'action ${actionName}:`, error)
        // Non-blocking: continuer même si une action échoue
      }
    }
  }

  /**
   * Crée les actions utilisateur pour un nouvel état
   *
   * Utilise la couche de service pour garantir la déduplication.
   * Ces actions sont des tâches assignées aux utilisateurs.
   *
   * @param audit - L'audit pour lequel créer les actions
   * @param state - Définition de l'état avec les actions à créer
   * @param event - Event H3 pour le tracking
   * @returns IDs des actions créées
   */
  private async createActionsForState(
    audit: Audit,
    state: StateDefinition,
    event: H3Event
  ): Promise<number[]> {
    if (!state.onEnter?.createActions || state.onEnter.createActions.length === 0) {
      return []
    }

    console.log(`[State Machine] 📝 Création de ${state.onEnter.createActions.length} action(s) utilisateur`)

    const createdIds: number[] = []

    for (const actionType of state.onEnter.createActions) {
      const actionDef = ACTION_TYPE_REGISTRY[actionType]

      if (!actionDef) {
        console.warn(`[State Machine] ⚠️  Type d'action non trouvé: ${actionType}`)
        continue
      }

      // Cas spécial : ENTITY_MARK_DOCUMENTARY_REVIEW_READY doit avoir une deadline 7 jours avant actualStartDate
      let customDuration: number | undefined
      let customMetadata: any = {}

      if (actionType === 'ENTITY_MARK_DOCUMENTARY_REVIEW_READY' && audit.actualStartDate) {
        const auditStartDate = new Date(audit.actualStartDate)
        const deadline = new Date(auditStartDate)
        deadline.setDate(deadline.getDate() - 7) // 7 jours avant (pas 14)
        deadline.setHours(23, 59, 59, 999)

        const now = new Date()
        const diffInDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        // Si la deadline est dans le passé, utiliser 1 jour minimum
        customDuration = diffInDays > 0 ? diffInDays : 1

        console.log(`[State Machine] 📅 Durée personnalisée pour ${actionType}: ${customDuration} jours (deadline: 7 jours avant le ${audit.actualStartDate})`)
      }

      // Cas spécial : ENTITY_UPLOAD_CORRECTIVE_PLAN doit utiliser audit.actionPlanDeadline
      if (actionType === 'ENTITY_UPLOAD_CORRECTIVE_PLAN' && audit.actionPlanDeadline) {
        // Calculer la durée en jours entre maintenant et actionPlanDeadline
        const now = new Date()
        const deadline = new Date(audit.actionPlanDeadline)
        const diffInDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        customDuration = diffInDays > 0 ? diffInDays : 1 // Minimum 1 jour

        // Ajouter le type de plan dans les métadonnées pour affichage dynamique
        customMetadata = {
          actionPlanType: audit.actionPlanType, // 'SHORT' ou 'LONG'
          originalDeadline: audit.actionPlanDeadline.toISOString()
        }

        console.log(`[State Machine] 📅 Durée personnalisée pour ${actionType}: ${customDuration} jours (deadline: ${audit.actionPlanDeadline}, type: ${audit.actionPlanType})`)
      }

      // Utiliser la couche de service pour créer l'action (avec déduplication intégrée)
      const createdAction = await createAction(
        actionType,
        audit.entityId,
        event,
        {
          auditId: audit.id,
          customDuration,
          metadata: customMetadata,
        }
      )

      // createAction retourne null si l'action existe déjà (déduplication)
      if (createdAction) {
        createdIds.push(createdAction.id)
        console.log(`[State Machine] ✅ Action créée: ${actionType} (ID: ${createdAction.id})`)
      } else {
        console.log(`[State Machine] ℹ️  Action ${actionType} déjà existante, création ignorée`)
      }
    }

    return createdIds
  }

  /**
   * Vérifie si une transition automatique peut être déclenchée
   *
   * Cette méthode est utilisée par le système d'actions pour détecter
   * et exécuter les transitions automatiques après la complétion d'une action.
   *
   * Elle parcourt toutes les transitions AUTO_DOCUMENT de l'état actuel
   * et vérifie si les guards sont satisfaits. Si oui, elle exécute la transition.
   *
   * @param audit - L'audit à vérifier
   * @param event - Event H3 pour le tracking
   * @param completedActionType - Type de l'action qui vient d'être complétée (optionnel)
   * @returns true si une transition a été exécutée, false sinon
   */
  async checkAutoTransition(
    audit: Audit,
    event: H3Event,
    completedActionType?: string
  ): Promise<boolean> {
    const currentState = auditStateMachineConfig.states[audit.status]
    if (!currentState) return false

    console.log(`[State Machine] 🔍 Vérification des auto-transitions pour ${audit.status}`)

    // Parcourir toutes les transitions de l'état actuel
    for (const [name, transition] of Object.entries(currentState.transitions)) {
      // Vérifier si c'est une transition automatique
      if (transition.trigger !== 'AUTO_DOCUMENT') continue

      // Si on a un actionType, vérifier si cette action déclenche cette transition
      if (completedActionType && transition.triggerOnActions) {
        if (!transition.triggerOnActions.includes(completedActionType as any)) {
          continue
        }
      }

      // Vérifier si tous les guards sont satisfaits
      try {
        await this.checkGuards(audit, transition)

        // Tous les guards passent → exécuter la transition
        console.log(`[State Machine] 🎯 Auto-transition détectée: ${name}`)
        await this.transition(audit, transition.target, event, name)
        return true
      } catch (error) {
        // Guards non satisfaits, continuer vers la prochaine transition
        console.log(`[State Machine] ℹ️  Auto-transition ${name} non applicable: ${error instanceof Error ? error.message : 'guards non satisfaits'}`)
        continue
      }
    }

    console.log(`[State Machine] ℹ️  Aucune auto-transition applicable`)
    return false
  }
}

/**
 * Instance singleton de la state machine
 *
 * Utilisez cette instance dans tout le code pour exécuter des transitions.
 */
export const auditStateMachine = new AuditStateMachine()
