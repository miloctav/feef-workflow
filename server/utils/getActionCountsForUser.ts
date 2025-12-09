/**
 * Utility to count pending actions for a user on specific audits or entities
 * Reusable for both audit lists and entity lists
 */

import { db } from '~~/server/database'
import { actions, accountsToEntities, auditorsToOE, audits } from '~~/server/database/schema'
import { eq, and, isNull, inArray, sql, type SQL } from 'drizzle-orm'
import { Role } from '#shared/types/roles'
import type { Account } from '~~/server/database/schema'

interface ActionCountOptions {
    auditIds?: number[]
    entityIds?: number[]
}

type ActionCountResult = Record<number, number>

/**
 * Get pending action counts for a user on specific audits or entities
 * Returns a map of { id: count } where id is auditId or entityId
 */
export async function getActionCountsForUser(
    user: { id: number; role: string; oeId?: number | null; currentEntityId?: number | null },
    options: ActionCountOptions,
): Promise<ActionCountResult> {
    const { auditIds, entityIds } = options

    // If no IDs provided, return empty result
    if ((!auditIds || auditIds.length === 0) && (!entityIds || entityIds.length === 0)) {
        return {}
    }

    // Build base conditions
    const conditions: SQL[] = [
        isNull(actions.deletedAt),
        eq(actions.status, 'PENDING'),
    ]

    // Add audit or entity filter
    if (auditIds && auditIds.length > 0) {
        conditions.push(inArray(actions.auditId, auditIds))
    }
    if (entityIds && entityIds.length > 0) {
        conditions.push(inArray(actions.entityId, entityIds))
    }

    // Add role-based filtering
    const roleConditions = await buildRoleConditions(user)
    conditions.push(...roleConditions)

    // Build the aggregation query
    const groupByField = auditIds && auditIds.length > 0 ? actions.auditId : actions.entityId

    const result = await db
        .select({
            id: groupByField,
            count: sql<number>`count(*)::int`,
        })
        .from(actions)
        .where(and(...conditions))
        .groupBy(groupByField)

    // Convert to map
    const countMap: ActionCountResult = {}
    for (const row of result) {
        if (row.id !== null) {
            countMap[row.id] = row.count
        }
    }

    return countMap
}

/**
 * Build role-specific WHERE conditions for action visibility
 * Similar to buildActionsWhereForUser but returns conditions only
 */
async function buildRoleConditions(
    user: { id: number; role: string; oeId?: number | null; currentEntityId?: number | null },
): Promise<SQL[]> {
    const conditions: SQL[] = []

    if (user.role === Role.FEEF) {
        // FEEF sees all actions - no additional filtering
        return conditions
    }

    if (user.role === Role.ENTITY) {
        // ENTITY sees actions for their entities only
        if (!user.currentEntityId) {
            // No entity selected: return impossible condition
            conditions.push(sql`1 = 0`)
            return conditions
        }

        // Get all entity IDs this user has access to
        const entityAccess = await db.query.accountsToEntities.findMany({
            where: eq(accountsToEntities.accountId, user.id),
            columns: { entityId: true },
        })

        const entityIds = entityAccess.map(e => e.entityId)

        if (entityIds.length === 0) {
            conditions.push(sql`1 = 0`)
        } else {
            conditions.push(inArray(actions.entityId, entityIds))
            conditions.push(sql`'ENTITY' = ANY(${actions.assignedRoles})`)
        }

        return conditions
    }

    if (user.role === Role.OE) {
        // OE sees actions assigned to their OE via audit.oeId
        if (!user.oeId) {
            conditions.push(sql`1 = 0`)
            return conditions
        }

        // Get all audits assigned to this OE
        const oeAudits = await db.query.audits.findMany({
            where: and(
                eq(audits.oeId, user.oeId),
                isNull(audits.deletedAt),
            ),
            columns: { id: true },
        })

        const auditIds = oeAudits.map(a => a.id)

        if (auditIds.length === 0) {
            conditions.push(sql`1 = 0`)
        } else {
            conditions.push(
                and(
                    sql`'OE' = ANY(${actions.assignedRoles})`,
                    inArray(actions.auditId, auditIds),
                )!,
            )
        }

        return conditions
    }

    if (user.role === Role.AUDITOR) {
        // AUDITOR sees:
        // 1. Actions assigned to AUDITOR role for their audits
        // 2. Actions assigned to OE role for audits of their affiliated OEs
        if (!user.id) {
            conditions.push(sql`1 = 0`)
            return conditions
        }

        // Audits where this auditor is assigned
        const auditorAudits = await db.query.audits.findMany({
            where: and(
                eq(audits.auditorId, user.id),
                isNull(audits.deletedAt),
            ),
            columns: { id: true },
        })

        const auditorAuditIds = auditorAudits.map(a => a.id)

        // Affiliated OEs
        const oeAffiliations = await db.query.auditorsToOE.findMany({
            where: eq(auditorsToOE.auditorId, user.id),
            columns: { oeId: true },
        })

        const oeIds = oeAffiliations.map(a => a.oeId)

        // Audits of affiliated OEs
        let oeAuditIds: number[] = []
        if (oeIds.length > 0) {
            const oeAudits = await db.query.audits.findMany({
                where: and(
                    inArray(audits.oeId, oeIds),
                    isNull(audits.deletedAt),
                ),
                columns: { id: true },
            })
            oeAuditIds = oeAudits.map(a => a.id)
        }

        const auditorConditions: SQL[] = []

        // Actions AUDITOR for their audits
        if (auditorAuditIds.length > 0) {
            auditorConditions.push(
                and(
                    sql`'AUDITOR' = ANY(${actions.assignedRoles})`,
                    inArray(actions.auditId, auditorAuditIds),
                )!,
            )
        }

        // Actions OE for audits of affiliated OEs
        if (oeAuditIds.length > 0) {
            auditorConditions.push(
                and(
                    sql`'OE' = ANY(${actions.assignedRoles})`,
                    inArray(actions.auditId, oeAuditIds),
                )!,
            )
        }

        if (auditorConditions.length === 0) {
            conditions.push(sql`1 = 0`)
        } else {
            // Use OR for auditor conditions
            conditions.push(sql`(${sql.join(auditorConditions, sql` OR `)})`)
        }

        return conditions
    }

    // Unknown role: no access
    conditions.push(sql`1 = 0`)
    return conditions
}
