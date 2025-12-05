/**
 * Query utilities for actions with role-based filtering
 */

import { db } from '~~/server/database'
import { actions, accountsToEntities, auditorsToOE, audits } from '~~/server/database/schema'
import { eq, and, isNull, inArray, or, type SQL, sql } from 'drizzle-orm'
import { Role } from '#shared/types/roles'
import type { Account } from '~~/server/database/schema'
import type { PaginationConfig } from '~~/server/utils/pagination'

/**
 * Build WHERE conditions for actions based on user's role and context
 */
export async function buildActionsWhereForUser(
  user: Account,
  additionalConditions: SQL[] = [],
): Promise<SQL[]> {
  const conditions: SQL[] = [
    isNull(actions.deletedAt),
    ...additionalConditions,
  ]

  if (user.role === Role.FEEF) {
    // FEEF sees all actions
    // No additional filtering
  }
  else if (user.role === Role.ENTITY) {
    // ENTITY sees actions for their entities only
    if (!user.currentEntityId) {
      // No entity selected: return empty result
      conditions.push(sql`1 = 0`)
    }
    else {
      // Get all entity IDs this user has access to
      const entityAccess = await db.query.accountsToEntities.findMany({
        where: eq(accountsToEntities.accountId, user.id),
        columns: { entityId: true },
      })

      const entityIds = entityAccess.map(e => e.entityId)

      if (entityIds.length === 0) {
        conditions.push(sql`1 = 0`)
      }
      else {
        conditions.push(inArray(actions.entityId, entityIds))
        conditions.push(sql`'ENTITY' = ANY(${actions.assignedRoles})`)
      }
    }
  }
  else if (user.role === Role.OE) {
    // OE sees actions assigned to their OE
    if (!user.oeId) {
      conditions.push(sql`1 = 0`)
    }
    else {
      conditions.push(
        and(
          sql`'OE' = ANY(${actions.assignedRoles})`,
          eq(actions.assignedOeId, user.oeId),
        )!,
      )
    }
  }
  else if (user.role === Role.AUDITOR) {
    // AUDITOR sees:
    // 1. Actions assigned to AUDITOR role for their audits
    // 2. Actions assigned to their affiliated OEs
    if (!user.id) {
      conditions.push(sql`1 = 0`)
    }
    else {
      // Get audits where this auditor is assigned
      const auditorAudits = await db.query.audits.findMany({
        where: and(
          eq(audits.auditorId, user.id),
          isNull(audits.deletedAt),
        ),
        columns: { id: true },
      })

      const auditIds = auditorAudits.map(a => a.id)

      // Get OEs this auditor is affiliated with
      const oeAffiliations = await db.query.auditorsToOE.findMany({
        where: eq(auditorsToOE.auditorId, user.id),
        columns: { oeId: true },
      })

      const oeIds = oeAffiliations.map(a => a.oeId)

      const auditorConditions: SQL[] = []

      // Actions assigned to AUDITOR for their audits
      if (auditIds.length > 0) {
        auditorConditions.push(
          and(
            sql`'AUDITOR' = ANY(${actions.assignedRoles})`,
            inArray(actions.auditId, auditIds),
          )!,
        )
      }

      // Actions assigned to OE for their affiliated OEs
      if (oeIds.length > 0) {
        auditorConditions.push(
          and(
            sql`'OE' = ANY(${actions.assignedRoles})`,
            inArray(actions.assignedOeId, oeIds),
          )!,
        )
      }

      if (auditorConditions.length === 0) {
        conditions.push(sql`1 = 0`)
      }
      else {
        conditions.push(or(...auditorConditions)!)
      }
    }
  }
  else {
    // Unknown role: no access
    conditions.push(sql`1 = 0`)
  }

  return conditions
}

/**
 * Pagination configuration for actions
 */
export const actionsPaginationConfig: PaginationConfig<typeof actions> = {
  table: actions,
  searchFields: [], // Actions don't need search (metadata is JSON)
  allowedFilters: {
    local: ['type', 'status', 'assignedRoles', 'entityId', 'auditId'],
  },
  allowedSorts: {
    local: ['createdAt', 'deadline', 'completedAt'],
  },
  defaultSort: 'deadline:asc',
  defaultLimit: 25,
  maxLimit: 100,
}
