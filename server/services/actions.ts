/**
 * Service de gestion des actions pour le workflow de labellisation FEEF
 *
 * Ce service gère la création et la complétion automatique des actions
 * basées sur les événements du workflow (changements de statut, uploads, etc.)
 */

import { db } from '~~/server/database'
import { actions, audits, entities, documentVersions, entityFieldVersions, contracts, documentaryReviews } from '~~/server/database/schema'
import { eq, and, isNull, inArray, isNotNull, desc } from 'drizzle-orm'
import { ACTION_TYPE_REGISTRY, ActionType, type ActionTypeType } from '#shared/types/actions'
import { forInsert, forUpdate } from '~~/server/utils/tracking'
import type { H3Event } from 'h3'

/**
 * Check if a status matches the completion criteria (supports single status or array)
 */
function matchesAuditStatus(currentStatus: string, criteriaStatus: string | string[] | undefined): boolean {
  if (!criteriaStatus) return false
  if (Array.isArray(criteriaStatus)) {
    return criteriaStatus.includes(currentStatus)
  }
  return currentStatus === criteriaStatus
}

/**
 * Calculate deadline from current time and duration
 */
function calculateDeadline(durationDays: number): Date {
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + durationDays)
  deadline.setHours(23, 59, 59, 999) // End of day
  return deadline
}

/**
 * Check if an action already exists (to avoid duplicates)
 */
async function actionExists(
  type: ActionTypeType,
  entityId: number,
  auditId: number | null,
): Promise<boolean> {
  const existing = await db.query.actions.findFirst({
    where: and(
      eq(actions.type, type),
      eq(actions.entityId, entityId),
      auditId ? eq(actions.auditId, auditId) : isNull(actions.auditId),
      isNull(actions.deletedAt),
      eq(actions.status, 'PENDING'),
    ),
  })

  return !!existing
}

/**
 * Create a new action
 */
export async function createAction(
  type: ActionTypeType,
  entityId: number,
  event: H3Event,
  options: {
    auditId?: number
    metadata?: any
    customDuration?: number
  } = {},
): Promise<any> {
  const definition = ACTION_TYPE_REGISTRY[type]

  if (!definition) {
    throw new Error(`Unknown action type: ${type}`)
  }

  // Check if action already exists
  if (await actionExists(type, entityId, options.auditId || null)) {
    console.log(`[Actions] Action ${type} already exists for entity ${entityId}, audit ${options.auditId}`)
    return null
  }




  const duration = options.customDuration || definition.defaultDurationDays
  const deadline = calculateDeadline(duration)

  // Nouvelle logique : on insère assignedRoles (array)
  const [newAction] = await db.insert(actions).values(forInsert(event, {
    type,
    entityId,
    auditId: options.auditId || null,
    assignedRoles: definition.assignedRoles,
    status: 'PENDING',
    durationDays: duration,
    deadline,
    metadata: options.metadata || null,
  })).returning()

  console.log(`[Actions] Created action ${type} (ID: ${newAction.id}) for entity ${entityId}`)

  return newAction
}

/**
 * Create actions when audit status changes
 */
export async function createActionsForAuditStatus(
  audit: any,
  newStatus: string,
  event: H3Event,
): Promise<void> {
  console.log(`[Actions] Checking for actions to create for audit status: ${newStatus}`)

  // Find all action types that should be created for this status
  for (const [actionType, definition] of Object.entries(ACTION_TYPE_REGISTRY)) {
    if (definition.triggers.onAuditStatus?.includes(newStatus as any)) {
      // Cas spécial : ENTITY_UPLOAD_CORRECTIVE_PLAN doit utiliser audit.actionPlanDeadline
      let customDuration: number | undefined
      let customMetadata: any = {}

      if (actionType === 'ENTITY_UPLOAD_CORRECTIVE_PLAN' && audit.actionPlanDeadline) {
        const now = new Date()
        const deadline = new Date(audit.actionPlanDeadline)
        const diffInDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        customDuration = diffInDays > 0 ? diffInDays : 1

        customMetadata = {
          actionPlanType: audit.actionPlanType,
          originalDeadline: audit.actionPlanDeadline.toISOString()
        }

        console.log(`[Actions] 📅 Durée personnalisée pour ${actionType}: ${customDuration} jours (deadline: ${audit.actionPlanDeadline}, type: ${audit.actionPlanType})`)
      }

      await createAction(
        actionType as ActionTypeType,
        audit.entityId,
        event,
        {
          auditId: audit.id,
          customDuration,
          metadata: customMetadata,
        },
      )
    }
  }
}

/**
 * Create actions when contract status changes
 */
export async function createActionsForContractStatus(
  contractOrId: any | number,
  newStatus: string,
  event: H3Event,
): Promise<void> {
  console.log(`[Actions] Checking for actions to create for contract status: ${newStatus}`)

  // Si on reçoit un ID, récupérer le contrat avec ses relations
  let contract = contractOrId
  if (typeof contractOrId === 'number') {
    contract = await db.query.contracts.findFirst({
      where: and(
        eq(contracts.id, contractOrId),
        isNull(contracts.deletedAt)
      ),
      with: {
        entity: true,
      },
    })

    if (!contract) {
      console.error(`[Actions] Contract ${contractOrId} not found`)
      return
    }
  }

  // Chercher toutes les actions qui doivent être créées pour ce statut
  for (const [actionType, definition] of Object.entries(ACTION_TYPE_REGISTRY)) {
    if (definition.triggers.onContractStatus?.includes(newStatus)) {
      console.log(`[Actions] Creating action ${actionType} for contract ${contract.id} (status: ${newStatus})`)

      await createAction(
        actionType as ActionTypeType,
        contract.entityId,
        event,
        {
          metadata: { contractId: contract.id },
        },
      )
    }
  }
}




/**
 * Complete an action
 */
export async function completeAction(
  actionId: number,
  completedBy: number,
  event: H3Event,
): Promise<void> {
  const action = await db.query.actions.findFirst({
    where: eq(actions.id, actionId),
  })

  if (!action) {
    console.warn(`[Actions] Action ${actionId} not found`)
    return
  }

  if (action.status === 'COMPLETED') {
    console.log(`[Actions] Action ${actionId} already completed`)
    return
  }

  await db.update(actions)
    .set(forUpdate(event, {
      status: 'COMPLETED',
      completedAt: new Date(),
      completedBy,
    }))
    .where(eq(actions.id, actionId))

  console.log(`[Actions] Completed action ${actionId} (${action.type}) by user ${completedBy}`)


}



/**
 * Detect and complete actions based on audit field changes
 */
export async function detectAndCompleteActionsForAuditField(
  audit: any,
  fieldName: string,
  completedBy: number,
  event: H3Event,
): Promise<void> {
  console.log(`[Actions] Detecting actions to complete for audit field: ${fieldName}`)

  // Find actions where completion criteria matches this field
  const pendingActions = await db.query.actions.findMany({
    where: and(
      eq(actions.entityId, audit.entityId),
      audit.id ? eq(actions.auditId, audit.id) : isNull(actions.auditId),
      isNull(actions.deletedAt),
      eq(actions.status, 'PENDING'),
    ),
  })

  for (const action of pendingActions) {
    const definition = ACTION_TYPE_REGISTRY[action.type as ActionTypeType]

    if (definition?.completionCriteria.field === fieldName) {
      await completeAction(action.id, completedBy, event)
    }
  }
}

/**
 * Check and complete ALL pending actions for an audit
 * This is a comprehensive check that evaluates all completion criteria
 */
export async function checkAndCompleteAllPendingActions(
  audit: any,
  completedBy: number,
  event: H3Event,
): Promise<void> {
  console.log(`[Actions] Checking all pending actions for audit ${audit.id} (entity ${audit.entityId})`)

  // Get entity data for entity-level field checks
  const entity = await db.query.entities.findFirst({
    where: eq(entities.id, audit.entityId),
  })

  if (!entity) {
    console.error(`[Actions] Entity ${audit.entityId} not found`)
    return
  }

  // Find all pending actions for this audit/entity
  const pendingActions = await db.query.actions.findMany({
    where: and(
      eq(actions.entityId, audit.entityId),
      audit.id ? eq(actions.auditId, audit.id) : isNull(actions.auditId),
      isNull(actions.deletedAt),
      eq(actions.status, 'PENDING'),
    ),
  })

  console.log(`[Actions] Found ${pendingActions.length} pending actions to check`)

  for (const action of pendingActions) {
    const definition = ACTION_TYPE_REGISTRY[action.type as ActionTypeType]

    if (!definition) {
      console.warn(`[Actions] No definition found for action type: ${action.type}`)
      continue
    }

    let shouldComplete = false

    // Check field-based completion (check both audit and entity fields)
    if (definition.completionCriteria.field) {
      // Check audit field first
      let fieldValue = audit[definition.completionCriteria.field]

      // If not found in audit, check entity field
      if (fieldValue === null || fieldValue === undefined) {
        fieldValue = entity[definition.completionCriteria.field]
      }

      if (fieldValue !== null && fieldValue !== undefined) {
        console.log(`[Actions] Action ${action.type} (${action.id}): Field ${definition.completionCriteria.field} is set`)
        shouldComplete = true
      }
    }

    // Check status-based completion
    if (matchesAuditStatus(audit.status, definition.completionCriteria.auditStatus)) {
      console.log(`[Actions] Action ${action.type} (${action.id}): Status matches ${audit.status}`)
      shouldComplete = true
    }

    // Check document-based completion
    if (definition.completionCriteria.documentType) {
      const document = await db.query.documentVersions.findFirst({
        where: and(
          eq(documentVersions.auditId, audit.id),
          eq(documentVersions.auditDocumentType, definition.completionCriteria.documentType as any),
          isNotNull(documentVersions.s3Key),
        ),
      })

      if (document) {
        console.log(`[Actions] Action ${action.type} (${action.id}): Document ${definition.completionCriteria.documentType} exists`)
        shouldComplete = true
      }
    }

    // Check custom completion criteria
    if (definition.completionCriteria.customCheck) {
      const customCheckResult = await evaluateCustomCheck(definition.completionCriteria.customCheck, action)
      if (customCheckResult) {
        console.log(`[Actions] Action ${action.type} (${action.id}): Custom check ${definition.completionCriteria.customCheck} passed`)
        shouldComplete = true
      }
    }

    // Complete the action if criteria met
    if (shouldComplete) {
      await completeAction(action.id, completedBy, event)

      // Recharger l'audit depuis la base de données pour avoir le statut le plus récent
      // (car une transition pourrait avoir déjà eu lieu)
      const freshAudit = await db.query.audits.findFirst({
        where: eq(audits.id, audit.id)
      })

      if (!freshAudit) {
        console.warn(`[Actions] Audit ${audit.id} not found after action completion`)
        continue
      }

      // Vérifier si la complétion de cette action déclenche une auto-transition
      const { auditStateMachine } = await import('~~/server/state-machine')
      await auditStateMachine.checkAutoTransition(freshAudit, event, action.type)
    }
  }
}

/**
 * Evaluate custom completion check
 */
async function evaluateCustomCheck(checkName: string, action: any): Promise<boolean> {
  switch (checkName) {
    case 'checkDocumentVersionUploaded':
      return await checkDocumentVersionUploaded(action)
    case 'checkEntityFieldUpdated':
      return await checkEntityFieldUpdated(action)
    case 'checkContractEntitySigned':
      return await checkContractEntitySigned(action)
    case 'checkContractFeefSigned':
      return await checkContractFeefSigned(action)
    case 'checkAuditDatesSet':
      return await checkAuditDatesSet(action)
    case 'checkAllDocumentRequestsCompleted':
      return await checkAllDocumentRequestsCompleted(action)
    case 'checkCaseApprovedEvent':
      return await checkCaseApprovedEvent(action)
    case 'checkFeefDecisionEvent':
      return await checkFeefDecisionEvent(action)
    case 'checkCaseSubmittedEvent':
      return await checkCaseSubmittedEvent(action)
    case 'checkDocumentaryReviewReadyEvent':
      return await checkDocumentaryReviewReadyEvent(action)
    case 'checkOeResponseEvent':
      return await checkOeResponseEvent(action)
    case 'checkCorrectivePlanValidatedEvent':
      return await checkCorrectivePlanValidatedEvent(action)
    case 'checkOeOpinionTransmittedEvent':
      return await checkOeOpinionTransmittedEvent(action)
    case 'checkComplementaryAuditDatesSet':
      return await checkComplementaryAuditDatesSet(action)
    case 'checkComplementaryReportUploaded':
      return await checkComplementaryReportUploaded(action)
    default:
      console.warn(`[Actions] Unknown custom check: ${checkName}`)
      return false
  }
}

/**
 * Detect and complete actions based on audit status change
 */
export async function detectAndCompleteActionsForAuditStatus(
  audit: any,
  newStatus: string,
  completedBy: number,
  event: H3Event,
): Promise<void> {
  console.log(`[Actions] Detecting actions to complete for audit status: ${newStatus}`)

  const pendingActions = await db.query.actions.findMany({
    where: and(
      eq(actions.entityId, audit.entityId),
      audit.id ? eq(actions.auditId, audit.id) : isNull(actions.auditId),
      isNull(actions.deletedAt),
      eq(actions.status, 'PENDING'),
    ),
  })

  for (const action of pendingActions) {
    const definition = ACTION_TYPE_REGISTRY[action.type as ActionTypeType]

    if (matchesAuditStatus(newStatus, definition?.completionCriteria.auditStatus)) {
      await completeAction(action.id, completedBy, event)
    }
  }
}

/**
 * Detect and complete actions for document uploads
 */
export async function detectAndCompleteActionsForDocumentUpload(
  audit: any,
  documentType: string,
  completedBy: number,
  event: H3Event,
): Promise<void> {
  console.log(`[Actions] Detecting actions to complete for document upload: ${documentType}`)

  const pendingActions = await db.query.actions.findMany({
    where: and(
      eq(actions.entityId, audit.entityId),
      audit.id ? eq(actions.auditId, audit.id) : isNull(actions.auditId),
      isNull(actions.deletedAt),
      eq(actions.status, 'PENDING'),
    ),
  })

  for (const action of pendingActions) {
    const definition = ACTION_TYPE_REGISTRY[action.type as ActionTypeType]

    if (definition?.completionCriteria.documentType === documentType) {
      await completeAction(action.id, completedBy, event)
    }
  }
}

/**
 * Detect and complete actions for entity field changes
 */
export async function detectAndCompleteActionsForEntityField(
  entity: any,
  fieldName: string,
  completedBy: number,
  event: H3Event,
): Promise<void> {
  console.log(`[Actions] Detecting actions to complete for entity field: ${fieldName}`)

  const pendingActions = await db.query.actions.findMany({
    where: and(
      eq(actions.entityId, entity.id),
      isNull(actions.auditId), // Entity-level actions only
      isNull(actions.deletedAt),
      eq(actions.status, 'PENDING'),
    ),
  })

  for (const action of pendingActions) {
    const definition = ACTION_TYPE_REGISTRY[action.type as ActionTypeType]

    if (definition?.completionCriteria.field === fieldName) {
      await completeAction(action.id, completedBy, event)
    }
  }
}

/**
 * Check and complete ALL pending actions for an entity
 * This checks all entity-level actions (without auditId)
 */
export async function checkAndCompleteAllPendingActionsForEntity(
  entity: any,
  completedBy: number,
  event: H3Event,
): Promise<void> {
  console.log(`[Actions] Checking all pending actions for entity ${entity.id}`)

  // Find all pending entity-level actions (no auditId)
  const pendingActions = await db.query.actions.findMany({
    where: and(
      eq(actions.entityId, entity.id),
      isNull(actions.auditId), // Entity-level actions only
      isNull(actions.deletedAt),
      eq(actions.status, 'PENDING'),
    ),
  })

  console.log(`[Actions] Found ${pendingActions.length} pending entity-level actions to check`)

  for (const action of pendingActions) {
    const definition = ACTION_TYPE_REGISTRY[action.type as ActionTypeType]

    if (!definition) {
      console.warn(`[Actions] No definition found for action type: ${action.type}`)
      continue
    }

    let shouldComplete = false

    // Check field-based completion (entity fields only)
    if (definition.completionCriteria.field) {
      const fieldValue = entity[definition.completionCriteria.field]

      if (fieldValue !== null && fieldValue !== undefined) {
        console.log(`[Actions] Action ${action.type} (${action.id}): Entity field ${definition.completionCriteria.field} is set`)
        shouldComplete = true
      }
    }

    // Check custom completion criteria
    if (definition.completionCriteria.customCheck) {
      const customCheckResult = await evaluateCustomCheck(definition.completionCriteria.customCheck, action)
      if (customCheckResult) {
        console.log(`[Actions] Action ${action.type} (${action.id}): Custom check ${definition.completionCriteria.customCheck} passed`)
        shouldComplete = true
      }
    }

    // Complete the action if criteria met
    if (shouldComplete) {
      await completeAction(action.id, completedBy, event)
    }
  }
}

/**
 * Detect and complete actions for contract signing
 */
export async function detectAndCompleteActionsForContractSign(
  contract: any,
  completedBy: number,
  event: H3Event,
): Promise<void> {
  console.log(`[Actions] Detecting actions to complete for contract signing (status: ${contract.signatureStatus})`)

  const pendingActions = await db.query.actions.findMany({
    where: and(
      eq(actions.entityId, contract.entityId),
      isNull(actions.auditId),
      isNull(actions.deletedAt),
      eq(actions.status, 'PENDING'),
    ),
  })

  for (const action of pendingActions) {
    // Check if action metadata contains this contract ID
    if (action.metadata?.contractId === contract.id) {
      const definition = ACTION_TYPE_REGISTRY[action.type as ActionTypeType]

      // Vérifier les custom checks pour compléter l'action
      if (definition?.completionCriteria.customCheck) {
        const shouldComplete = await evaluateCustomCheck(definition.completionCriteria.customCheck, action)
        if (shouldComplete) {
          console.log(`[Actions] Completing action ${action.type} (${action.id}) after contract signing`)
          await completeAction(action.id, completedBy, event)
        }
      }
    }
  }
}

/**
 * Custom completion check: Document version uploaded
 */
export async function checkDocumentVersionUploaded(
  action: any,
): Promise<boolean> {
  const documentaryReviewId = action.metadata?.documentaryReviewId

  if (!documentaryReviewId) return false

  // Check if a document version exists for this documentary review
  const version = await db.query.documentVersions.findFirst({
    where: and(
      eq(documentVersions.documentaryReviewId, documentaryReviewId),
      isNotNull(documentVersions.s3Key),
    ),
  })

  return !!version
}

/**
 * Custom completion check: Entity field updated
 */
export async function checkEntityFieldUpdated(
  action: any,
): Promise<boolean> {
  const requiredFields = action.metadata?.requiredFields

  if (!requiredFields || !Array.isArray(requiredFields)) return false

  // Check if entity field versions exist for all required fields
  for (const fieldKey of requiredFields) {
    const version = await db.query.entityFieldVersions.findFirst({
      where: and(
        eq(entityFieldVersions.entityId, action.entityId),
        eq(entityFieldVersions.fieldKey, fieldKey),
      ),
      orderBy: [desc(entityFieldVersions.createdAt)],
    })

    if (!version) return false
  }

  return true
}

/**
 * Custom completion check: Contract entity signed
 * Vérifie que le contrat n'est plus en PENDING_ENTITY (soit PENDING_FEEF soit COMPLETED)
 */
export async function checkContractEntitySigned(
  action: any,
): Promise<boolean> {
  const contractId = action.metadata?.contractId

  if (!contractId) return false

  const contract = await db.query.contracts.findFirst({
    where: eq(contracts.id, contractId),
    columns: {
      signatureStatus: true,
    },
  })

  // L'entité a signé si le contrat est passé à PENDING_FEEF ou COMPLETED
  return !!(contract && contract.signatureStatus !== 'PENDING_ENTITY' && contract.signatureStatus !== 'DRAFT')
}

/**
 * Custom completion check: Contract FEEF signed
 * Vérifie que le contrat est COMPLETED
 */
export async function checkContractFeefSigned(
  action: any,
): Promise<boolean> {
  const contractId = action.metadata?.contractId

  if (!contractId) return false

  const contract = await db.query.contracts.findFirst({
    where: eq(contracts.id, contractId),
    columns: {
      signatureStatus: true,
    },
  })

  // La FEEF a signé si le contrat est COMPLETED
  return contract?.signatureStatus === 'COMPLETED'
}

/**
 * Custom completion check: Audit dates set
 */
export async function checkAuditDatesSet(
  action: any,
): Promise<boolean> {
  if (!action.auditId) return false

  const audit = await db.query.audits.findFirst({
    where: eq(audits.id, action.auditId),
    columns: {
      actualStartDate: true,
      actualEndDate: true,
    },
  })

  // Both dates must be set
  return !!(audit?.actualStartDate && audit?.actualEndDate)
}

/**
 * Custom completion check: All document update requests completed
 * Vérifie que tous les documentVersions avec askedBy != null ont un s3Key != null
 */
export async function checkAllDocumentRequestsCompleted(
  action: any,
): Promise<boolean> {
  // Récupérer toutes les documentaryReviews de l'entité
  const documentaryReviewsList = await db.query.documentaryReviews.findMany({
    where: and(
      eq(documentaryReviews.entityId, action.entityId),
      isNull(documentaryReviews.deletedAt)
    ),
  })

  const documentaryReviewIds = documentaryReviewsList.map(dr => dr.id)

  if (documentaryReviewIds.length === 0) {
    return true // Pas de documents, action complétée
  }

  // Récupérer toutes les versions de documents avec demande de MAJ
  const pendingRequests = await db.query.documentVersions.findMany({
    where: and(
      inArray(documentVersions.documentaryReviewId, documentaryReviewIds),
      isNotNull(documentVersions.askedBy),
    ),
  })

  // Vérifier que toutes les demandes ont un s3Key (document uploadé)
  const allCompleted = pendingRequests.every(version => version.s3Key !== null)

  return allCompleted
}

/**
 * Vérifie si le dossier a été approuvé via l'événement AUDIT_CASE_APPROVED
 */
async function checkCaseApprovedEvent(action: any): Promise<boolean> {
  if (!action.auditId) {
    console.warn('[Actions] checkCaseApprovedEvent: Missing auditId')
    return false
  }

  const { hasEventOccurred } = await import('~~/server/services/events')
  return await hasEventOccurred('AUDIT_CASE_APPROVED', {
    auditId: action.auditId
  })
}

/**
 * Vérifie si la décision FEEF a été prise (acceptée OU rejetée)
 */
async function checkFeefDecisionEvent(action: any): Promise<boolean> {
  if (!action.auditId) {
    console.warn('[Actions] checkFeefDecisionEvent: Missing auditId')
    return false
  }

  const { hasEventOccurred } = await import('~~/server/services/events')
  const accepted = await hasEventOccurred('AUDIT_FEEF_DECISION_ACCEPTED', {
    auditId: action.auditId
  })
  const rejected = await hasEventOccurred('AUDIT_FEEF_DECISION_REJECTED', {
    auditId: action.auditId
  })
  return accepted || rejected
}

/**
 * Vérifie si le dossier a été soumis via l'événement AUDIT_CASE_SUBMITTED
 */
async function checkCaseSubmittedEvent(action: any): Promise<boolean> {
  if (!action.auditId) {
    console.warn('[Actions] checkCaseSubmittedEvent: Missing auditId')
    return false
  }

  const { hasEventOccurred } = await import('~~/server/services/events')
  return await hasEventOccurred('AUDIT_CASE_SUBMITTED', {
    auditId: action.auditId
  })
}

/**
 * Vérifie si la revue documentaire est prête via l'événement ENTITY_DOCUMENTARY_REVIEW_READY
 */
async function checkDocumentaryReviewReadyEvent(action: any): Promise<boolean> {
  if (!action.entityId) {
    console.warn('[Actions] checkDocumentaryReviewReadyEvent: Missing entityId')
    return false
  }

  const { hasEventOccurred } = await import('~~/server/services/events')
  return await hasEventOccurred('ENTITY_DOCUMENTARY_REVIEW_READY', {
    entityId: action.entityId
  })
}

/**
 * Vérifie si l'OE a répondu (accepté OU refusé) via les événements
 */
async function checkOeResponseEvent(action: any): Promise<boolean> {
  if (!action.auditId) {
    console.warn('[Actions] checkOeResponseEvent: Missing auditId')
    return false
  }

  const { hasEventOccurred } = await import('~~/server/services/events')
  const accepted = await hasEventOccurred('AUDIT_OE_ACCEPTED', {
    auditId: action.auditId
  })
  const refused = await hasEventOccurred('AUDIT_OE_REFUSED', {
    auditId: action.auditId
  })
  return accepted || refused
}

/**
 * Vérifie si le plan correctif a été validé via l'événement AUDIT_CORRECTIVE_PLAN_VALIDATED
 */
async function checkCorrectivePlanValidatedEvent(action: any): Promise<boolean> {
  if (!action.auditId) {
    console.warn('[Actions] checkCorrectivePlanValidatedEvent: Missing auditId')
    return false
  }

  const { hasEventOccurred } = await import('~~/server/services/events')
  return await hasEventOccurred('AUDIT_CORRECTIVE_PLAN_VALIDATED', {
    auditId: action.auditId
  })
}

/**
 * Vérifie si l'avis de l'OE a été transmis via l'événement AUDIT_OE_OPINION_TRANSMITTED
 */
async function checkOeOpinionTransmittedEvent(action: any): Promise<boolean> {
  if (!action.auditId) {
    console.warn('[Actions] checkOeOpinionTransmittedEvent: Missing auditId')
    return false
  }

  const { hasEventOccurred } = await import('~~/server/services/events')
  return await hasEventOccurred('AUDIT_OE_OPINION_TRANSMITTED', {
    auditId: action.auditId
  })
}

/**
 * Cancel all pending actions for an audit
 */
export async function cancelActionsForAudit(
  auditId: number,
  event: H3Event,
): Promise<void> {
  await db.update(actions)
    .set(forUpdate(event, {
      status: 'CANCELLED',
    }))
    .where(
      and(
        eq(actions.auditId, auditId),
        eq(actions.status, 'PENDING'),
        isNull(actions.deletedAt),
      ),
    )

  console.log(`[Actions] Cancelled all actions for audit ${auditId}`)
}

/**
 * Vérifie si les dates de l'audit complémentaire sont définies
 */
async function checkComplementaryAuditDatesSet(action: any): Promise<boolean> {
  if (!action.auditId) {
    console.warn('[Actions] checkComplementaryAuditDatesSet: Missing auditId')
    return false
  }

  const audit = await db.query.audits.findFirst({
    where: eq(audits.id, action.auditId),
    columns: {
      complementaryStartDate: true,
      complementaryEndDate: true,
    },
  })

  // Both dates must be set
  return !!(audit?.complementaryStartDate && audit?.complementaryEndDate)
}

/**
 * Vérifie si le rapport de l'audit complémentaire a été uploadé
 * (vérifie via l'événement AUDIT_COMPLEMENTARY_REPORT_UPLOADED)
 */
async function checkComplementaryReportUploaded(action: any): Promise<boolean> {
  if (!action.auditId) {
    console.warn('[Actions] checkComplementaryReportUploaded: Missing auditId')
    return false
  }

  // Vérifier via l'événement et le score complémentaire
  const { hasEventOccurred } = await import('~~/server/services/events')
  const eventOccurred = await hasEventOccurred('AUDIT_COMPLEMENTARY_REPORT_UPLOADED', {
    auditId: action.auditId
  })

  if (eventOccurred) return true

  // Fallback : vérifier si le score complémentaire est défini
  const audit = await db.query.audits.findFirst({
    where: eq(audits.id, action.auditId),
    columns: {
      complementaryGlobalScore: true,
    },
  })

  return audit?.complementaryGlobalScore !== null && audit?.complementaryGlobalScore !== undefined
}
