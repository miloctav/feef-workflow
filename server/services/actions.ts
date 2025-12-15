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
      await createAction(
        actionType as ActionTypeType,
        audit.entityId,
        event,
        {
          auditId: audit.id,
        },
      )
    }
  }
}

/**
 * Create actions when contract status changes
 */
export async function createActionsForContractStatus(
  contract: any,
  newStatus: string,
  event: H3Event,
): Promise<void> {
  console.log(`[Actions] Checking for actions to create for contract status: ${newStatus}`)

  for (const [actionType, definition] of Object.entries(ACTION_TYPE_REGISTRY)) {
    if (definition.triggers.onContractStatus?.includes(newStatus)) {
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
 * Create or update ENTITY_UPDATE_DOCUMENT action
 * Une seule action par entité, mise à jour si elle existe déjà
 */
export async function createOrUpdateDocumentUpdateAction(
  entityId: number,
  event: H3Event,
): Promise<void> {
  console.log(`[Actions] Creating or updating ENTITY_UPDATE_DOCUMENT action for entity ${entityId}`)

  // Vérifier si l'action existe déjà
  const existingAction = await db.query.actions.findFirst({
    where: and(
      eq(actions.type, ActionType.ENTITY_UPDATE_DOCUMENT),
      eq(actions.entityId, entityId),
      isNull(actions.auditId),
      isNull(actions.deletedAt),
      eq(actions.status, 'PENDING'),
    ),
  })

  if (existingAction) {
    console.log(`[Actions] ENTITY_UPDATE_DOCUMENT action already exists (ID: ${existingAction.id}), no need to create a new one`)
    return
  }

  // Calculer la deadline : 15 jours avant la date de début de l'audit en cours
  let deadline: Date | null = null

  // Récupérer le dernier audit non complété de l'entité
  const currentAudit = await db.query.audits.findFirst({
    where: and(
      eq(audits.entityId, entityId),
      isNull(audits.deletedAt),
    ),
    orderBy: [desc(audits.createdAt)],
  })

  if (currentAudit && currentAudit.status !== 'COMPLETED' && currentAudit.actualStartDate) {
    // Calculer 15 jours avant la date de début
    const auditStartDate = new Date(currentAudit.actualStartDate)
    deadline = new Date(auditStartDate)
    deadline.setDate(deadline.getDate() - 15)
    deadline.setHours(23, 59, 59, 999)
  }

  // Créer l'action
  const definition = ACTION_TYPE_REGISTRY[ActionType.ENTITY_UPDATE_DOCUMENT]
  const duration = definition.defaultDurationDays

  const [newAction] = await db.insert(actions).values(forInsert(event, {
    type: ActionType.ENTITY_UPDATE_DOCUMENT,
    entityId,
    auditId: null, // Action entity-level
    assignedRoles: definition.assignedRoles,
    status: 'PENDING',
    durationDays: duration,
    deadline: deadline || calculateDeadline(duration), // Utiliser deadline calculée ou durée par défaut
    metadata: null,
  })).returning()

  console.log(`[Actions] Created ENTITY_UPDATE_DOCUMENT action (ID: ${newAction.id}) for entity ${entityId}`)
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
    case 'checkAuditDatesSet':
      return await checkAuditDatesSet(action)
    case 'checkAllDocumentRequestsCompleted':
      return await checkAllDocumentRequestsCompleted(action)
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
  console.log(`[Actions] Detecting actions to complete for contract signing`)

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

      if (definition?.completionCriteria.customCheck === 'checkContractEntitySigned') {
        if (contract.entitySignedAt) {
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
 */
export async function checkContractEntitySigned(
  action: any,
): Promise<boolean> {
  const contractId = action.metadata?.contractId

  if (!contractId) return false

  const contract = await db.query.contracts.findFirst({
    where: eq(contracts.id, contractId),
    columns: {
      entitySignedAt: true,
    },
  })

  return !!contract?.entitySignedAt
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
