/**
 * Service de gestion des événements (audit trail) pour le workflow FEEF
 *
 * Ce service gère l'enregistrement et la récupération des événements
 * qui se produisent dans le système (actions utilisateur, changements d'état, etc.)
 */

import { db } from '~~/server/database'
import { events, type NewEvent, type Event } from '~~/server/database/schema'
import { eq, and, desc, inArray, isNull } from 'drizzle-orm'
import type { H3Event } from 'h3'

/**
 * Event type definitions with their required context and category
 */
export type EventTypeDefinition = {
  type: string
  category: 'AUDIT' | 'ENTITY' | 'CONTRACT' | 'SYSTEM'
  requiredReferences: ('auditId' | 'entityId' | 'contractId')[]
}

/**
 * Registry of event types for validation
 */
export const EVENT_TYPE_REGISTRY: Record<string, EventTypeDefinition> = {
  // Audit workflow events
  AUDIT_CASE_SUBMITTED: {
    type: 'AUDIT_CASE_SUBMITTED',
    category: 'AUDIT',
    requiredReferences: ['auditId', 'entityId'],
  },
  AUDIT_CASE_APPROVED: {
    type: 'AUDIT_CASE_APPROVED',
    category: 'AUDIT',
    requiredReferences: ['auditId', 'entityId'],
  },
  AUDIT_OE_ASSIGNED: {
    type: 'AUDIT_OE_ASSIGNED',
    category: 'AUDIT',
    requiredReferences: ['auditId', 'entityId'],
  },
  AUDIT_OE_ACCEPTED: {
    type: 'AUDIT_OE_ACCEPTED',
    category: 'AUDIT',
    requiredReferences: ['auditId', 'entityId'],
  },
  AUDIT_OE_REFUSED: {
    type: 'AUDIT_OE_REFUSED',
    category: 'AUDIT',
    requiredReferences: ['auditId', 'entityId'],
  },
  AUDIT_DATES_SET: {
    type: 'AUDIT_DATES_SET',
    category: 'AUDIT',
    requiredReferences: ['auditId', 'entityId'],
  },
  AUDIT_PLAN_UPLOADED: {
    type: 'AUDIT_PLAN_UPLOADED',
    category: 'AUDIT',
    requiredReferences: ['auditId', 'entityId'],
  },
  AUDIT_REPORT_UPLOADED: {
    type: 'AUDIT_REPORT_UPLOADED',
    category: 'AUDIT',
    requiredReferences: ['auditId', 'entityId'],
  },
  AUDIT_CORRECTIVE_PLAN_UPLOADED: {
    type: 'AUDIT_CORRECTIVE_PLAN_UPLOADED',
    category: 'AUDIT',
    requiredReferences: ['auditId', 'entityId'],
  },
  AUDIT_CORRECTIVE_PLAN_VALIDATED: {
    type: 'AUDIT_CORRECTIVE_PLAN_VALIDATED',
    category: 'AUDIT',
    requiredReferences: ['auditId', 'entityId'],
  },
  AUDIT_OE_OPINION_TRANSMITTED: {
    type: 'AUDIT_OE_OPINION_TRANSMITTED',
    category: 'AUDIT',
    requiredReferences: ['auditId', 'entityId'],
  },
  AUDIT_FEEF_DECISION_ACCEPTED: {
    type: 'AUDIT_FEEF_DECISION_ACCEPTED',
    category: 'AUDIT',
    requiredReferences: ['auditId', 'entityId'],
  },
  AUDIT_FEEF_DECISION_REJECTED: {
    type: 'AUDIT_FEEF_DECISION_REJECTED',
    category: 'AUDIT',
    requiredReferences: ['auditId', 'entityId'],
  },
  AUDIT_ATTESTATION_GENERATED: {
    type: 'AUDIT_ATTESTATION_GENERATED',
    category: 'AUDIT',
    requiredReferences: ['auditId', 'entityId'],
  },
  AUDIT_STATUS_CHANGED: {
    type: 'AUDIT_STATUS_CHANGED',
    category: 'AUDIT',
    requiredReferences: ['auditId', 'entityId'],
  },

  // Entity events
  ENTITY_DOCUMENTARY_REVIEW_READY: {
    type: 'ENTITY_DOCUMENTARY_REVIEW_READY',
    category: 'ENTITY',
    requiredReferences: ['entityId'],
  },
  ENTITY_OE_ASSIGNED: {
    type: 'ENTITY_OE_ASSIGNED',
    category: 'ENTITY',
    requiredReferences: ['entityId'],
  },

  // Contract events
  CONTRACT_ENTITY_SIGNED: {
    type: 'CONTRACT_ENTITY_SIGNED',
    category: 'CONTRACT',
    requiredReferences: ['contractId', 'entityId'],
  },
  CONTRACT_FEEF_SIGNED: {
    type: 'CONTRACT_FEEF_SIGNED',
    category: 'CONTRACT',
    requiredReferences: ['contractId', 'entityId'],
  },
}

/**
 * Record an event in the audit trail
 *
 * @param h3Event - The H3 event context (for auth)
 * @param params - Event parameters
 * @returns The created event
 */
export async function recordEvent(
  h3Event: H3Event,
  params: {
    type: string
    auditId?: number
    entityId?: number
    contractId?: number
    metadata?: any
  }
): Promise<Event> {
  const session = await getUserSession(h3Event)

  if (!session?.user?.id) {
    throw createError({
      statusCode: 401,
      message: 'User not authenticated',
    })
  }

  // Validate event type
  const definition = EVENT_TYPE_REGISTRY[params.type]
  if (!definition) {
    throw createError({
      statusCode: 400,
      message: `Unknown event type: ${params.type}`,
    })
  }

  // Validate required references
  for (const ref of definition.requiredReferences) {
    if (!params[ref]) {
      throw createError({
        statusCode: 400,
        message: `Event ${params.type} requires ${ref}`,
      })
    }
  }

  // Create event record
  const [event] = await db.insert(events).values({
    type: params.type as any,
    category: definition.category as any,
    auditId: params.auditId || null,
    entityId: params.entityId || null,
    contractId: params.contractId || null,
    performedBy: session.user.id,
    performedAt: new Date(),
    metadata: params.metadata || null,
  }).returning()

  console.log(`[Events] Recorded event ${params.type} (ID: ${event.id})`)

  return event
}

/**
 * Get the latest event of a specific type
 *
 * @param type - Event type to search for
 * @param params - Filter parameters
 * @returns The latest event or undefined
 */
export async function getLatestEvent(
  type: string,
  params: {
    auditId?: number
    entityId?: number
    contractId?: number
  }
): Promise<Event | undefined> {
  return await db.query.events.findFirst({
    where: and(
      eq(events.type, type as any),
      params.auditId ? eq(events.auditId, params.auditId) : undefined,
      params.entityId ? eq(events.entityId, params.entityId) : undefined,
      params.contractId ? eq(events.contractId, params.contractId) : undefined,
    ),
    orderBy: [desc(events.performedAt)],
    with: {
      performedByAccount: {
        columns: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          role: true,
        },
      },
    },
  })
}

/**
 * Check if an event has occurred (for validation/guards)
 *
 * @param type - Event type to check
 * @param params - Filter parameters
 * @returns True if the event occurred, false otherwise
 */
export async function hasEventOccurred(
  type: string,
  params: {
    auditId?: number
    entityId?: number
    contractId?: number
  }
): Promise<boolean> {
  const event = await getLatestEvent(type, params)
  return !!event
}

/**
 * Get event timestamp (replaces *At field queries)
 *
 * @param type - Event type
 * @param params - Filter parameters
 * @returns The event timestamp or null
 */
export async function getEventTimestamp(
  type: string,
  params: {
    auditId?: number
    entityId?: number
    contractId?: number
  }
): Promise<Date | null> {
  const event = await getLatestEvent(type, params)
  return event?.performedAt || null
}

/**
 * Get event performer (replaces *By field queries)
 *
 * @param type - Event type
 * @param params - Filter parameters
 * @returns The performer account ID or null
 */
export async function getEventPerformer(
  type: string,
  params: {
    auditId?: number
    entityId?: number
    contractId?: number
  }
): Promise<number | null> {
  const event = await getLatestEvent(type, params)
  return event?.performedBy || null
}

/**
 * Get all events for an audit
 *
 * @param auditId - The audit ID
 * @param options - Query options
 * @returns List of events
 */
export async function getAuditEvents(
  auditId: number,
  options?: {
    types?: string[]
    limit?: number
    offset?: number
  }
): Promise<Event[]> {
  return await db.query.events.findMany({
    where: and(
      eq(events.auditId, auditId),
      options?.types ? inArray(events.type, options.types as any[]) : undefined,
    ),
    orderBy: [desc(events.performedAt)],
    limit: options?.limit,
    offset: options?.offset,
    with: {
      performedByAccount: {
        columns: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          role: true,
        },
      },
    },
  })
}

/**
 * Get entity timeline (all events for an entity)
 *
 * @param entityId - The entity ID
 * @param options - Query options
 * @returns List of events
 */
export async function getEntityTimeline(
  entityId: number,
  options?: {
    categories?: string[]
    limit?: number
  }
): Promise<Event[]> {
  return await db.query.events.findMany({
    where: and(
      eq(events.entityId, entityId),
      options?.categories ? inArray(events.category, options.categories as any[]) : undefined,
    ),
    orderBy: [desc(events.performedAt)],
    limit: options?.limit || 50,
    with: {
      performedByAccount: {
        columns: {
          id: true,
          firstname: true,
          lastname: true,
          role: true,
        },
      },
      audit: {
        columns: {
          id: true,
          type: true,
          status: true,
        },
      },
    },
  })
}
