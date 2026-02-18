/**
 * GET /api/dashboard/overview - Get dashboard overview statistics
 * Returns all dashboard metrics in a single optimized request
 */

import { db } from '~~/server/database'
import { audits as auditsTable, entities as entitiesTable, events as eventsTable, contracts as contractsTable, actions as actionsTable } from '~~/server/database/schema'
import { and, eq, inArray, isNotNull, isNull, ne, sql } from 'drizzle-orm'
import { Role, OERole } from '#shared/types/roles'
import { ActionType } from '~~/shared/types/actions'

export default defineEventHandler(async (event) => {
    // Authentication
    const { user } = await requireUserSession(event)

    // Extract optional oeId filter (FEEF only)
    const query = getQuery(event)
    const oeId = query.oeId ? Number(query.oeId) : undefined

    // Build WHERE conditions based on user role (same logic as /api/audits/stats)
    const buildAuditWhereConditions = () => {
        const conditions: any[] = []

        // FEEF can filter by OE
        if (user.role === Role.FEEF && oeId) {
            conditions.push(eq(auditsTable.oeId, oeId))
        }

        if (user.role === Role.OE) {
            conditions.push(eq(auditsTable.oeId, user.oeId))

            // If ACCOUNT_MANAGER, filter by accountManagerId via entities
            if (user.oeRole === OERole.ACCOUNT_MANAGER) {
                // We'll handle this with a subquery
                return conditions
            }
        }

        if (user.role === Role.ENTITY) {
            if (user.currentEntityId) {
                conditions.push(eq(auditsTable.entityId, user.currentEntityId))
            }
            else {
                conditions.push(sql`false`) // No current entity, no audits
            }
        }

        if (user.role === Role.AUDITOR) {
            conditions.push(eq(auditsTable.auditorId, user.id))
        }

        return conditions
    }

    const buildEntityWhereConditions = () => {
        const conditions: any[] = []

        // FEEF can filter by OE
        if (user.role === Role.FEEF && oeId) {
            conditions.push(eq(entitiesTable.oeId, oeId))
        }

        if (user.role === Role.OE) {
            conditions.push(eq(entitiesTable.oeId, user.oeId))

            if (user.oeRole === OERole.ACCOUNT_MANAGER) {
                conditions.push(eq(entitiesTable.accountManagerId, user.id))
            }
        }

        if (user.role === Role.ENTITY) {
            if (user.currentEntityId) {
                conditions.push(eq(entitiesTable.id, user.currentEntityId))
            }
            else {
                conditions.push(sql`false`)
            }
        }

        if (user.role === Role.AUDITOR) {
            // Auditors don't have direct entity access, return no entities
            conditions.push(sql`false`)
        }

        return conditions
    }

    const buildCaseSubmissionWhereConditions = () => {
        const conditions: any[] = [
            eq(actionsTable.type, ActionType.ENTITY_SUBMIT_CASE),
            eq(actionsTable.status, 'PENDING'),
        ]
        if (user.role === Role.OE) {
            conditions.push(sql`false`)
        }
        if (user.role === Role.ENTITY) {
            if (user.currentEntityId) {
                conditions.push(eq(actionsTable.entityId, user.currentEntityId))
            }
            else {
                conditions.push(sql`false`)
            }
        }
        if (user.role === Role.AUDITOR) {
            conditions.push(sql`false`)
        }
        return conditions
    }

    const buildContractWhereConditions = () => {
        const conditions: any[] = [
            eq(contractsTable.signatureStatus, 'PENDING_ENTITY'),
            isNull(contractsTable.oeId),
        ]
        if (user.role === Role.OE) {
            conditions.push(sql`false`)
        }
        if (user.role === Role.ENTITY) {
            if (user.currentEntityId) {
                conditions.push(eq(contractsTable.entityId, user.currentEntityId))
            }
            else {
                conditions.push(sql`false`)
            }
        }
        if (user.role === Role.AUDITOR) {
            conditions.push(sql`false`)
        }
        return conditions
    }

    const auditWhereConditions = buildAuditWhereConditions()
    const entityWhereConditions = buildEntityWhereConditions()

    // Execute all queries in parallel for performance
    const caseSubmissionWhereConditions = buildCaseSubmissionWhereConditions()
    const contractProgressWhereConditions = buildContractWhereConditions()

    const [
        entityCountResult,
        auditGapResult,
        processDurationResult,
        scheduledAuditsResult,
        labeledEntitiesResult,
        progressBarAuditResult,
        caseSubmissionResult,
        contractProgressResult,
    ] = await Promise.all([
        // 1. Entity Count - Total count of all entities
        db
            .select({
                count: sql<number>`COUNT(*)::int`,
            })
            .from(entitiesTable)
            .where(entityWhereConditions.length > 0 ? and(...entityWhereConditions) : undefined),

        // 2. Average Audit Gap - Difference between plannedDate and actualStartDate (in days)
        db
            .select({
                avgGapDays: sql<number>`AVG(EXTRACT(DAY FROM (${auditsTable.actualStartDate}::timestamp - ${auditsTable.plannedDate}::timestamp)))`,
            })
            .from(auditsTable)
            .where(
                and(
                    ...(auditWhereConditions.length > 0 ? auditWhereConditions : []),
                    isNotNull(auditsTable.plannedDate),
                    isNotNull(auditsTable.actualStartDate),
                ),
            ),

        // 3. Average Process Duration - Between createdAt and feefDecisionAt (in days)
        // Using events table instead of feefDecisionAt field
        db
            .select({
                avgDurationDays: sql<number>`
                    AVG(
                        EXTRACT(DAY FROM (
                            (SELECT e.performed_at FROM ${eventsTable} e
                             WHERE e.audit_id = ${auditsTable.id}
                               AND e.type IN ('AUDIT_FEEF_DECISION_ACCEPTED', 'AUDIT_FEEF_DECISION_REJECTED')
                             ORDER BY e.performed_at DESC
                             LIMIT 1)
                            - ${auditsTable.createdAt}
                        ))
                    )
                `,
            })
            .from(auditsTable)
            .where(
                and(
                    ...(auditWhereConditions.length > 0 ? auditWhereConditions : []),
                    eq(auditsTable.status, 'COMPLETED'),
                    // Check that a FEEF decision event exists
                    sql`EXISTS (
                        SELECT 1 FROM ${eventsTable} e
                        WHERE e.audit_id = ${auditsTable.id}
                          AND e.type IN ('AUDIT_FEEF_DECISION_ACCEPTED', 'AUDIT_FEEF_DECISION_REJECTED')
                    )`,
                ),
            ),

        // 4. Scheduled Audits by Month - Next 12 months from current month
        db
            .select({
                month: sql<string>`TO_CHAR(${auditsTable.plannedDate}, 'YYYY-MM')`,
                type: auditsTable.type,
                count: sql<number>`COUNT(*)::int`,
            })
            .from(auditsTable)
            .where(
                and(
                    ...(auditWhereConditions.length > 0 ? auditWhereConditions : []),
                    isNotNull(auditsTable.plannedDate),
                    // Next 12 months from start of current month
                    sql`${auditsTable.plannedDate} >= DATE_TRUNC('month', CURRENT_DATE)`,
                    sql`${auditsTable.plannedDate} < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '12 months'`,
                ),
            )
            .groupBy(sql`TO_CHAR(${auditsTable.plannedDate}, 'YYYY-MM')`, auditsTable.type)
            .orderBy(sql`TO_CHAR(${auditsTable.plannedDate}, 'YYYY-MM')`),

        // 5. Labeled Entities by Year - Last 5 years
        // Using events table instead of feefDecisionAt field
        db
            .select({
                year: sql<number>`
                    EXTRACT(YEAR FROM (
                        SELECT e.performed_at FROM ${eventsTable} e
                        WHERE e.audit_id = ${auditsTable.id}
                          AND e.type = 'AUDIT_FEEF_DECISION_ACCEPTED'
                        ORDER BY e.performed_at DESC
                        LIMIT 1
                    ))::int
                `,
                type: auditsTable.type,
                count: sql<number>`COUNT(*)::int`,
            })
            .from(auditsTable)
            .where(
                and(
                    ...(auditWhereConditions.length > 0 ? auditWhereConditions : []),
                    eq(auditsTable.status, 'COMPLETED'),
                    eq(auditsTable.feefDecision, 'ACCEPTED'),
                    // Check that an ACCEPTED decision event exists
                    sql`EXISTS (
                        SELECT 1 FROM ${eventsTable} e
                        WHERE e.audit_id = ${auditsTable.id}
                          AND e.type = 'AUDIT_FEEF_DECISION_ACCEPTED'
                    )`,
                    // Last 5 years
                    sql`
                        EXTRACT(YEAR FROM (
                            SELECT e.performed_at FROM ${eventsTable} e
                            WHERE e.audit_id = ${auditsTable.id}
                              AND e.type = 'AUDIT_FEEF_DECISION_ACCEPTED'
                            ORDER BY e.performed_at DESC
                            LIMIT 1
                        )) >= EXTRACT(YEAR FROM CURRENT_DATE) - 4
                    `,
                ),
            )
            .groupBy(
                sql`
                    EXTRACT(YEAR FROM (
                        SELECT e.performed_at FROM ${eventsTable} e
                        WHERE e.audit_id = ${auditsTable.id}
                          AND e.type = 'AUDIT_FEEF_DECISION_ACCEPTED'
                        ORDER BY e.performed_at DESC
                        LIMIT 1
                    ))
                `,
                auditsTable.type
            )
            .orderBy(
                sql`
                    EXTRACT(YEAR FROM (
                        SELECT e.performed_at FROM ${eventsTable} e
                        WHERE e.audit_id = ${auditsTable.id}
                          AND e.type = 'AUDIT_FEEF_DECISION_ACCEPTED'
                        ORDER BY e.performed_at DESC
                        LIMIT 1
                    ))
                `
            ),

        // 6a. Progress Bar Stats - Count audits by status (excluding error terminals)
        db
            .select({
                status: auditsTable.status,
                count: sql<number>`COUNT(*)::int`,
            })
            .from(auditsTable)
            .where(
                and(
                    ...(auditWhereConditions.length > 0 ? auditWhereConditions : []),
                    ne(auditsTable.status, 'REFUSED_BY_OE'),
                    ne(auditsTable.status, 'REFUSED_PLAN'),
                ),
            )
            .groupBy(auditsTable.status),

        // 6b. Candidature - Count distinct entities with ENTITY_SUBMIT_CASE action pending
        db
            .select({
                count: sql<number>`COUNT(DISTINCT ${actionsTable.entityId})::int`,
            })
            .from(actionsTable)
            .where(
                caseSubmissionWhereConditions.length > 0 ? and(...caseSubmissionWhereConditions) : undefined,
            ),

        // 6c. Candidature - Count FEEF contracts pending entity signature
        db
            .select({
                count: sql<number>`COUNT(*)::int`,
            })
            .from(contractsTable)
            .where(
                contractProgressWhereConditions.length > 0 ? and(...contractProgressWhereConditions) : undefined,
            ),
    ])

    // Process results
    const entityCount = entityCountResult[0]?.count || 0

    // Convert average gap from days to months (rounded to 1 decimal)
    const avgGapDays = auditGapResult[0]?.avgGapDays
    const avgGapMonths = avgGapDays !== null && avgGapDays !== undefined
        ? Math.round((avgGapDays / 30.44) * 10) / 10 // 30.44 = average days per month
        : null

    // Convert average duration from days to months (rounded to 1 decimal)
    const avgDurationDays = processDurationResult[0]?.avgDurationDays
    const avgDurationMonths = avgDurationDays !== null && avgDurationDays !== undefined
        ? Math.round((avgDurationDays / 30.44) * 10) / 10
        : null

    // Format scheduled audits by month
    // Create a map of all 12 months from current month
    const now = new Date()
    const scheduledAuditsByMonth: Record<string, { initial: number, renewal: number, monitoring: number }> = {}

    for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        scheduledAuditsByMonth[monthKey] = { initial: 0, renewal: 0, monitoring: 0 }
    }

    // Fill in actual data
    scheduledAuditsResult.forEach((row) => {
        if (scheduledAuditsByMonth[row.month]) {
            if (row.type === 'INITIAL') scheduledAuditsByMonth[row.month].initial = row.count
            else if (row.type === 'RENEWAL') scheduledAuditsByMonth[row.month].renewal = row.count
            else if (row.type === 'MONITORING') scheduledAuditsByMonth[row.month].monitoring = row.count
        }
    })

    // Format labeled entities by year
    // Get last 5 years
    const currentYear = now.getFullYear()
    const labeledEntitiesByYear: Record<number, { initial: number, renewal: number, monitoring: number }> = {}

    for (let i = 4; i >= 0; i--) {
        const year = currentYear - i
        labeledEntitiesByYear[year] = { initial: 0, renewal: 0, monitoring: 0 }
    }

    // Fill in actual data
    labeledEntitiesResult.forEach((row) => {
        if (labeledEntitiesByYear[row.year]) {
            if (row.type === 'INITIAL') labeledEntitiesByYear[row.year].initial = row.count
            else if (row.type === 'RENEWAL') labeledEntitiesByYear[row.year].renewal = row.count
            else if (row.type === 'MONITORING') labeledEntitiesByYear[row.year].monitoring = row.count
        }
    })

    // Process progress bar data - 5 business phases
    const auditsByStatus: Record<string, number> = {}
    progressBarAuditResult.forEach((row) => {
        auditsByStatus[row.status] = row.count
    })

    const caseSubmissionCount = caseSubmissionResult[0]?.count || 0
    const contractProgressCount = contractProgressResult[0]?.count || 0

    const progressBarStats = {
        candidature: {
            total: (auditsByStatus['PENDING_CASE_APPROVAL'] || 0) + contractProgressCount + caseSubmissionCount,
            detail: {
                CASE_SUBMISSION_IN_PROGRESS: caseSubmissionCount,
                PENDING_FEEF_CONTRACT_SIGNATURE: contractProgressCount,
                PENDING_CASE_APPROVAL: auditsByStatus['PENDING_CASE_APPROVAL'] || 0,
            },
        },
        engagement: {
            total: (auditsByStatus['PENDING_OE_CHOICE'] || 0) + (auditsByStatus['PENDING_OE_ACCEPTANCE'] || 0),
            detail: {
                PENDING_OE_CHOICE: auditsByStatus['PENDING_OE_CHOICE'] || 0,
                PENDING_OE_ACCEPTANCE: auditsByStatus['PENDING_OE_ACCEPTANCE'] || 0,
            },
        },
        audit: {
            total: (auditsByStatus['PLANNING'] || 0) + (auditsByStatus['SCHEDULED'] || 0) + (auditsByStatus['PENDING_REPORT'] || 0) + (auditsByStatus['PENDING_COMPLEMENTARY_AUDIT'] || 0),
            detail: {
                PLANNING: auditsByStatus['PLANNING'] || 0,
                SCHEDULED: auditsByStatus['SCHEDULED'] || 0,
                PENDING_REPORT: auditsByStatus['PENDING_REPORT'] || 0,
                PENDING_COMPLEMENTARY_AUDIT: auditsByStatus['PENDING_COMPLEMENTARY_AUDIT'] || 0,
            },
        },
        decision: {
            total: (auditsByStatus['PENDING_OE_OPINION'] || 0) + (auditsByStatus['PENDING_CORRECTIVE_PLAN'] || 0) + (auditsByStatus['PENDING_CORRECTIVE_PLAN_VALIDATION'] || 0) + (auditsByStatus['PENDING_FEEF_DECISION'] || 0),
            detail: {
                PENDING_OE_OPINION: auditsByStatus['PENDING_OE_OPINION'] || 0,
                PENDING_CORRECTIVE_PLAN: auditsByStatus['PENDING_CORRECTIVE_PLAN'] || 0,
                PENDING_CORRECTIVE_PLAN_VALIDATION: auditsByStatus['PENDING_CORRECTIVE_PLAN_VALIDATION'] || 0,
                PENDING_FEEF_DECISION: auditsByStatus['PENDING_FEEF_DECISION'] || 0,
            },
        },
        labellise: {
            total: auditsByStatus['COMPLETED'] || 0,
            detail: {
                COMPLETED: auditsByStatus['COMPLETED'] || 0,
            },
        },
    }

    return {
        data: {
            entityCount,
            avgAuditGapMonths: avgGapMonths,
            avgProcessDurationMonths: avgDurationMonths,
            scheduledAuditsByMonth,
            labeledEntitiesByYear,
            progressBarStats,
        },
    }
})
