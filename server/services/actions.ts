/**
 * Service de gestion des actions pour le workflow de labellisation FEEF
 *
 * Ce service gère la création et la complétion automatique des actions
 * basées sur les événements du workflow (changements de statut, uploads, etc.)
 */

import { db } from '~~/server/database'
import { actions, audits, entities, documentVersions, entityFieldVersions, contracts } from '~~/server/database/schema'
import { eq, and, isNull, inArray, isNotNull, desc } from 'drizzle-orm'
import { ACTION_TYPE_REGISTRY, ActionType, type ActionTypeType } from '#shared/types/actions'
import { forInsert, forUpdate } from '~~/server/utils/tracking'
import type { H3Event } from 'h3'

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
 * Create action when document is requested
 */
export async function createActionForDocumentRequest(
  entityId: number,
  documentaryReviewId: number,
  event: H3Event,
): Promise<void> {
  console.log(`[Actions] Creating action for document request: ${documentaryReviewId}`)

  await createAction(
    ActionType.ENTITY_UPLOAD_REQUESTED_DOCUMENTS,
    entityId,
    event,
    {
      metadata: { documentaryReviewId },
    },
  )
}

/**
 * Create actions when new audit is created
 */
export async function createActionsForNewAudit(
  audit: any,
  event: H3Event,
): Promise<void> {
  console.log(`[Actions] Creating initial actions for new audit: ${audit.id}`)

  // Create "Submit case" action
  await createAction(
    ActionType.ENTITY_SUBMIT_CASE,
    audit.entityId,
    event,
    {
      auditId: audit.id,
    },
  )
}

/**
 * Create action when OE is assigned to audit
 */
export async function createActionsForOeAssignment(
  audit: any,
  event: H3Event,
): Promise<void> {
  console.log(`[Actions] Creating actions for OE assignment to audit: ${audit.id}`)

  await createAction(
    ActionType.ACCEPT_AUDIT,
    audit.entityId,
    event,
    {
      auditId: audit.id,
    },
  )
}

/**
 * Create action when auditor is assigned
 */
export async function createActionsForAuditorAssignment(
  audit: any,
  event: H3Event,
): Promise<void> {
  console.log(`[Actions] Creating actions for auditor assignment to audit: ${audit.id}`)

  // Auditor assignment usually means planning can start
  await createAction(
    ActionType.UPLOAD_AUDIT_PLAN,
    audit.entityId,
    event,
    {
      auditId: audit.id,
    },
  )
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

    if (definition?.completionCriteria.auditStatus === newStatus) {
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
 * Custom completion check: Audit accepted by OE
 */
export async function checkAuditAccepted(
  action: any,
): Promise<boolean> {
  if (!action.auditId) return false

  const audit = await db.query.audits.findFirst({
    where: eq(audits.id, action.auditId),
    columns: {
      status: true,
    },
  })

  // Consider accepted if audit moved past PLANNING status
  return audit?.status !== 'PLANNING' && audit?.status !== 'PENDING_OE_CHOICE'
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
