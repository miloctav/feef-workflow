/**
 * GET /api/dashboard/overview - Get dashboard overview statistics
 * Returns all dashboard metrics in a single optimized request
 */

import { db } from '~~/server/database'
import { audits as auditsTable, entities as entitiesTable, events as eventsTable } from '~~/server/database/schema'
import { and, eq, inArray, isNotNull, ne, sql } from 'drizzle-orm'
import { Role, OERole } from '#shared/types/roles'

export default defineEventHandler(async (event) => {
    // Authentication
    const { user } = await requireUserSession(event)

    // Build WHERE conditions based on user role (same logic as /api/audits/stats)
    const buildAuditWhereConditions = () => {
        const conditions: any[] = []

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

    const auditWhereConditions = buildAuditWhereConditions()
    const entityWhereConditions = buildEntityWhereConditions()

    // Execute all queries in parallel for performance
    const [
        entityCountResult,
        auditGapResult,
        processDurationResult,
        scheduledAuditsResult,
        labeledEntitiesResult,
        progressBarResult,
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

        // 6. Progress Bar Stats - Count audits by workflow stage (excluding COMPLETED)
        db
            .select({
                status: auditsTable.status,
                count: sql<number>`COUNT(*)::int`,
            })
            .from(auditsTable)
            .where(
                and(
                    ...(auditWhereConditions.length > 0 ? auditWhereConditions : []),
                    ne(auditsTable.status, 'COMPLETED'),
                ),
            )
            .groupBy(auditsTable.status),
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

    // Process progress bar data
    // Map statuses to workflow stages
    const progressBarStats = {
        depotDossier: 0, // PENDING_CASE_APPROVAL
        validationFeef: 0, // PENDING_OE_CHOICE
        planification: 0, // PLANNING + SCHEDULED
        audit: 0, // PENDING_REPORT
        finalisation: 0, // PENDING_CORRECTIVE_PLAN + PENDING_CORRECTIVE_PLAN_VALIDATION + PENDING_OE_OPINION + PENDING_FEEF_DECISION
    }

    progressBarResult.forEach((row) => {
        switch (row.status) {
            case 'PENDING_CASE_APPROVAL':
                progressBarStats.depotDossier = row.count
                break
            case 'PENDING_OE_CHOICE':
                progressBarStats.validationFeef = row.count
                break
            case 'PLANNING':
            case 'SCHEDULED':
                progressBarStats.planification += row.count
                break
            case 'PENDING_REPORT':
                progressBarStats.audit = row.count
                break
            case 'PENDING_CORRECTIVE_PLAN':
            case 'PENDING_CORRECTIVE_PLAN_VALIDATION':
            case 'PENDING_OE_OPINION':
            case 'PENDING_FEEF_DECISION':
                progressBarStats.finalisation += row.count
                break
        }
    })

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
