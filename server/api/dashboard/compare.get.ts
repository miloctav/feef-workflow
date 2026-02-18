/**
 * GET /api/dashboard/compare - Get dashboard statistics grouped by OE for comparison mode
 * FEEF role only
 */

import { db } from '~~/server/database'
import { audits as auditsTable, entities as entitiesTable, events as eventsTable, actions as actionsTable, oes as oesTable } from '~~/server/database/schema'
import { and, eq, isNull, isNotNull, ne, sql } from 'drizzle-orm'
import { Role } from '#shared/types/roles'

export default defineEventHandler(async (event) => {
  // Authentication & authorization — FEEF only
  const { user } = await requireUserSession(event)
  if (user.role !== Role.FEEF) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  // Common soft-delete conditions
  const auditNotDeleted = isNull(auditsTable.deletedAt)
  const entityNotDeleted = isNull(entitiesTable.deletedAt)
  const actionNotDeleted = isNull(actionsTable.deletedAt)

  const [
    oesList,
    auditsByStatusByOe,
    actionAlertsByOe,
    entityCountByOe,
    auditGapByOe,
    processDurationByOe,
    scheduledAuditsByMonthByOe,
    labeledByYearByOe,
    progressBarByOe,
  ] = await Promise.all([

    // 1. List all active OEs
    db.select({ id: oesTable.id, name: oesTable.name })
      .from(oesTable)
      .where(isNull(oesTable.deletedAt)),

    // 2. Audit counts by status by OE (NULL oeId = pre-OE statuses)
    db.select({
      oeId: auditsTable.oeId,
      status: auditsTable.status,
      count: sql<number>`COUNT(*)::int`,
    })
      .from(auditsTable)
      .where(
        and(
          auditNotDeleted,
          ne(auditsTable.status, 'REFUSED_BY_OE'),
          ne(auditsTable.status, 'REFUSED_PLAN'),
        ),
      )
      .groupBy(auditsTable.oeId, auditsTable.status),

    // 3. Action alerts by OE (overdue / upcoming), joined via audits
    db.select({
      oeId: auditsTable.oeId,
      auditStatus: auditsTable.status,
      overdueCount: sql<number>`COUNT(*) FILTER (WHERE ${actionsTable.status} = 'PENDING' AND ${actionsTable.deadline} < NOW())::int`,
      upcomingCount: sql<number>`COUNT(*) FILTER (WHERE ${actionsTable.status} = 'PENDING' AND ${actionsTable.deadline} >= NOW() AND ${actionsTable.deadline} < NOW() + INTERVAL '7 days')::int`,
    })
      .from(actionsTable)
      .leftJoin(auditsTable, eq(actionsTable.auditId, auditsTable.id))
      .where(actionNotDeleted)
      .groupBy(auditsTable.oeId, auditsTable.status),

    // 4a. Entity count by OE
    db.select({
      oeId: entitiesTable.oeId,
      count: sql<number>`COUNT(*)::int`,
    })
      .from(entitiesTable)
      .where(entityNotDeleted)
      .groupBy(entitiesTable.oeId),

    // 4b. Average audit gap (days) by OE
    db.select({
      oeId: auditsTable.oeId,
      avgGapDays: sql<number>`AVG(EXTRACT(DAY FROM (${auditsTable.actualStartDate}::timestamp - ${auditsTable.plannedDate}::timestamp)))`,
    })
      .from(auditsTable)
      .where(
        and(
          auditNotDeleted,
          isNotNull(auditsTable.plannedDate),
          isNotNull(auditsTable.actualStartDate),
        ),
      )
      .groupBy(auditsTable.oeId),

    // 4c. Average process duration (days) by OE
    db.select({
      oeId: auditsTable.oeId,
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
          auditNotDeleted,
          eq(auditsTable.status, 'COMPLETED'),
          sql`EXISTS (
            SELECT 1 FROM ${eventsTable} e
            WHERE e.audit_id = ${auditsTable.id}
              AND e.type IN ('AUDIT_FEEF_DECISION_ACCEPTED', 'AUDIT_FEEF_DECISION_REJECTED')
          )`,
        ),
      )
      .groupBy(auditsTable.oeId),

    // 5. Scheduled audits by month by OE (next 12 months)
    db.select({
      oeId: auditsTable.oeId,
      month: sql<string>`TO_CHAR(${auditsTable.plannedDate}, 'YYYY-MM')`,
      count: sql<number>`COUNT(*)::int`,
    })
      .from(auditsTable)
      .where(
        and(
          auditNotDeleted,
          isNotNull(auditsTable.plannedDate),
          sql`${auditsTable.plannedDate} >= DATE_TRUNC('month', CURRENT_DATE)`,
          sql`${auditsTable.plannedDate} < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '12 months'`,
        ),
      )
      .groupBy(auditsTable.oeId, sql`TO_CHAR(${auditsTable.plannedDate}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${auditsTable.plannedDate}, 'YYYY-MM')`),

    // 6. Labeled entities by year by OE (last 5 years)
    db.select({
      oeId: auditsTable.oeId,
      year: sql<number>`
        EXTRACT(YEAR FROM (
          SELECT e.performed_at FROM ${eventsTable} e
          WHERE e.audit_id = ${auditsTable.id}
            AND e.type = 'AUDIT_FEEF_DECISION_ACCEPTED'
          ORDER BY e.performed_at DESC
          LIMIT 1
        ))::int
      `,
      count: sql<number>`COUNT(*)::int`,
    })
      .from(auditsTable)
      .where(
        and(
          auditNotDeleted,
          eq(auditsTable.status, 'COMPLETED'),
          eq(auditsTable.feefDecision, 'ACCEPTED'),
          sql`EXISTS (
            SELECT 1 FROM ${eventsTable} e
            WHERE e.audit_id = ${auditsTable.id}
              AND e.type = 'AUDIT_FEEF_DECISION_ACCEPTED'
          )`,
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
        auditsTable.oeId,
        sql`
          EXTRACT(YEAR FROM (
            SELECT e.performed_at FROM ${eventsTable} e
            WHERE e.audit_id = ${auditsTable.id}
              AND e.type = 'AUDIT_FEEF_DECISION_ACCEPTED'
            ORDER BY e.performed_at DESC
            LIMIT 1
          ))
        `,
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
        `,
      ),

    // 7. Progress bar: audits by status by OE (excluding terminal refusals)
    db.select({
      oeId: auditsTable.oeId,
      status: auditsTable.status,
      count: sql<number>`COUNT(*)::int`,
    })
      .from(auditsTable)
      .where(
        and(
          auditNotDeleted,
          ne(auditsTable.status, 'REFUSED_BY_OE'),
          ne(auditsTable.status, 'REFUSED_PLAN'),
        ),
      )
      .groupBy(auditsTable.oeId, auditsTable.status),
  ])

  // Build all 12 month labels from current month
  const now = new Date()
  const monthLabels: string[] = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    monthLabels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  // Build last 5 year labels
  const currentYear = now.getFullYear()
  const yearLabels: number[] = []
  for (let i = 4; i >= 0; i--) yearLabels.push(currentYear - i)

  return {
    data: {
      oes: oesList,
      auditsByStatusByOe,
      actionAlertsByOe,
      entityCountByOe,
      auditGapByOe,
      processDurationByOe,
      scheduledAuditsByMonthByOe,
      labeledByYearByOe,
      progressBarByOe,
      // Axis labels for charts (shared across OEs)
      monthLabels,
      yearLabels,
    },
  }
})
