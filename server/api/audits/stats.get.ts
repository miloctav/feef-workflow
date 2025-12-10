/**
 * GET /api/audits/stats - Get audit statistics for current user
 */

import { db } from '~~/server/database'
import { audits as auditsTable, entities, contracts as contractsTable, actions as actionsTable } from '~~/server/database/schema'
import { and, eq, inArray, isNull, ne, or, sql } from 'drizzle-orm'
import { Role, OERole } from '#shared/types/roles'
import { getEntitiesCurrentAuditTypes } from '~~/server/utils/audit'
import { ActionType } from '~~/shared/types/actions'

export default defineEventHandler(async (event) => {
  // Authentication
  const { user } = await requireUserSession(event)

  // Build WHERE conditions based on user role
  const whereConditions: any[] = [
    ne(auditsTable.status, 'COMPLETED'), // Exclude completed audits
  ]

  // Add role-specific filters (same logic as /api/audits endpoint)
  if (user.role === Role.OE) {
    whereConditions.push(eq(auditsTable.oeId, user.oeId))

    // If ACCOUNT_MANAGER, filter by accountManagerId via entities
    if (user.oeRole === OERole.ACCOUNT_MANAGER) {
      const myEntities = await db.query.entities.findMany({
        where: eq(entities.accountManagerId, user.id),
        columns: { id: true },
      })
      const entityIds = myEntities.map((e) => e.id)

      if (entityIds.length > 0) {
        whereConditions.push(inArray(auditsTable.entityId, entityIds))
      }
      else {
        whereConditions.push(sql`false`) // No entities, no audits
      }
    }
  }

  if (user.role === Role.ENTITY) {
    if (user.currentEntityId) {
      whereConditions.push(eq(auditsTable.entityId, user.currentEntityId))
    }
    else {
      whereConditions.push(sql`false`) // No current entity, no audits
    }
  }

  if (user.role === Role.AUDITOR) {
    whereConditions.push(eq(auditsTable.auditorId, user.id))
  }

  const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined

  // Count by status (excluding COMPLETED)
  const stats = await db
    .select({
      status: auditsTable.status,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(auditsTable)
    .where(whereClause)
    .groupBy(auditsTable.status)

  // Count by status and type for badges
  const typesByStatus = await db
    .select({
      status: auditsTable.status,
      type: auditsTable.type,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(auditsTable)
    .where(whereClause)
    .groupBy(auditsTable.status, auditsTable.type)

  // Count total non-completed audits
  const totalCount = stats.reduce((sum, stat) => sum + stat.count, 0)

  // Query contracts pending entity signature with FEEF (oeId null)
  const contractWhereConditions: any[] = [
    eq(contractsTable.signatureStatus, 'PENDING_ENTITY'),
    isNull(contractsTable.oeId), // Only FEEF contracts
  ]

  // Apply same role-based filtering for contracts
  if (user.role === Role.OE) {
    // OE users should not see FEEF contracts (oeId is null)
    contractWhereConditions.push(sql`false`)
  }

  if (user.role === Role.ENTITY) {
    if (user.currentEntityId) {
      contractWhereConditions.push(eq(contractsTable.entityId, user.currentEntityId))
    }
    else {
      contractWhereConditions.push(sql`false`)
    }
  }

  if (user.role === Role.AUDITOR) {
    // Auditors should not see contracts
    contractWhereConditions.push(sql`false`)
  }

  const contractWhereClause = contractWhereConditions.length > 0 ? and(...contractWhereConditions) : undefined

  const pendingContracts = await db.query.contracts.findMany({
    where: contractWhereClause,
    columns: {
      id: true,
      entityId: true,
    },
  })

  // Get audit types for all entities in one query (optimized)
  const contractEntityIds = pendingContracts.map(c => c.entityId)
  const entityAuditTypes = await getEntitiesCurrentAuditTypes(contractEntityIds)

  // Count by audit type
  const contractTypeCount: Record<string, number> = {
    INITIAL: 0,
    RENEWAL: 0,
    MONITORING: 0,
  }

  for (const contract of pendingContracts) {
    const auditType = entityAuditTypes.get(contract.entityId) || 'INITIAL'
    contractTypeCount[auditType]++
  }

  // Convert to array format
  const contractsPendingSignature = Object.entries(contractTypeCount)
    .filter(([_, count]) => count > 0)
    .map(([type, count]) => ({
      type,
      count,
    }))

  // Query entities with ENTITY_SUBMIT_CASE actions (PENDING or OVERDUE)
  const caseSubmissionWhereConditions: any[] = [
    eq(actionsTable.type, ActionType.ENTITY_SUBMIT_CASE),
    or(
      eq(actionsTable.status, 'PENDING'),
      eq(actionsTable.status, 'OVERDUE')
    ),
  ]

  // Apply role-based filtering for actions
  if (user.role === Role.OE) {
    // OE users should not see entity case submission actions
    caseSubmissionWhereConditions.push(sql`false`)
  }

  if (user.role === Role.ENTITY) {
    if (user.currentEntityId) {
      caseSubmissionWhereConditions.push(eq(actionsTable.entityId, user.currentEntityId))
    }
    else {
      caseSubmissionWhereConditions.push(sql`false`)
    }
  }

  if (user.role === Role.AUDITOR) {
    // Auditors should not see entity case submission actions
    caseSubmissionWhereConditions.push(sql`false`)
  }

  const caseSubmissionWhereClause = caseSubmissionWhereConditions.length > 0 ? and(...caseSubmissionWhereConditions) : undefined

  const caseSubmissionActions = await db.query.actions.findMany({
    where: caseSubmissionWhereClause,
    columns: {
      id: true,
      entityId: true,
      status: true,
      deadline: true,
    },
  })

  // Get unique entity IDs and fetch audit types in one query (optimized)
  const uniqueEntityIds = [...new Set(caseSubmissionActions.map(a => a.entityId))]
  const caseSubmissionEntityAuditTypes = await getEntitiesCurrentAuditTypes(uniqueEntityIds)

  // Group by entity and determine audit type + alert status
  const entityCaseSubmissionMap = new Map<number, {
    auditType: string
    hasOverdue: boolean
    hasUpcoming: boolean
  }>()

  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  for (const action of caseSubmissionActions) {
    if (!entityCaseSubmissionMap.has(action.entityId)) {
      const auditType = caseSubmissionEntityAuditTypes.get(action.entityId) || 'INITIAL'
      entityCaseSubmissionMap.set(action.entityId, {
        auditType,
        hasOverdue: false,
        hasUpcoming: false,
      })
    }

    const entityData = entityCaseSubmissionMap.get(action.entityId)!

    if (action.status === 'OVERDUE') {
      entityData.hasOverdue = true
    } else if (action.status === 'PENDING' && action.deadline) {
      const deadline = new Date(action.deadline)
      if (deadline <= sevenDaysFromNow) {
        entityData.hasUpcoming = true
      }
    }
  }

  // Aggregate data
  const caseSubmissionTypeCount: Record<string, number> = {
    INITIAL: 0,
    RENEWAL: 0,
    MONITORING: 0,
  }
  let caseSubmissionOverdueCount = 0
  let caseSubmissionUpcomingCount = 0

  for (const [_, entityData] of entityCaseSubmissionMap) {
    caseSubmissionTypeCount[entityData.auditType]++
    if (entityData.hasOverdue) caseSubmissionOverdueCount++
    if (entityData.hasUpcoming) caseSubmissionUpcomingCount++
  }

  const caseSubmissionCount = entityCaseSubmissionMap.size

  const entitiesCaseSubmission = Object.entries(caseSubmissionTypeCount)
    .filter(([_, count]) => count > 0)
    .map(([type, count]) => ({
      type,
      count,
    }))

  return {
    data: {
      byStatus: stats,
      typesByStatus,
      totalNonCompleted: totalCount,
      contractsPendingSignature,
      entitiesCaseSubmission: {
        count: caseSubmissionCount,
        types: entitiesCaseSubmission,
        overdueCount: caseSubmissionOverdueCount,
        upcomingCount: caseSubmissionUpcomingCount,
      },
    },
  }
})
