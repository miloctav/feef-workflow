/**
 * Nitro Task - Check anniversary dates and create audit actions
 *
 * Runs daily to check MASTER entities with an upcoming anniversary date
 * and either:
 * - Chemin A (INITIAL/RENEWAL): creates ENTITY_SUBMIT_CASE action 120 days before
 * - Chemin B (MONITORING): creates the MONITORING audit directly 45 days before
 *
 * Scheduled for 2:40 AM UTC
 */
import { createCronLogger } from '~~/server/utils/logger/cron-logger'

const TERMINAL_STATUSES = ['COMPLETED', 'REFUSED_BY_OE', 'REFUSED_PLAN'] as const
const DAYS_BEFORE_SUBMIT_CASE = 120 // Chemin A: INITIAL or RENEWAL
const DAYS_BEFORE_MONITORING = 45 // Chemin B: MONITORING

/**
 * Calcule la prochaine occurrence de la date anniversaire
 * Si la date anniversaire de cette année est déjà passée, on prend l'année suivante
 */
function getNextAnniversaryDate(anniversaryDate: Date, today: Date): Date {
  const next = new Date(anniversaryDate)
  next.setFullYear(today.getFullYear())
  next.setHours(0, 0, 0, 0)

  if (next < today) {
    next.setFullYear(today.getFullYear() + 1)
  }

  return next
}

/**
 * Calcule le nombre de jours entre aujourd'hui et une date cible
 */
function daysUntil(target: Date, today: Date): number {
  const diff = target.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default defineTask({
  meta: {
    name: 'actions:check-anniversary',
    description: "Check anniversary dates and create audit actions for MASTER entities",
  },
  async run({ payload, context }) {
    const logger = createCronLogger('actions:check-anniversary')
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    logger.start('Starting anniversary check', {
      today: today.toISOString().split('T')[0],
      thresholdA: `${DAYS_BEFORE_SUBMIT_CASE} days (INITIAL/RENEWAL)`,
      thresholdB: `${DAYS_BEFORE_MONITORING} days (MONITORING)`,
    })

    try {
      // Dynamic imports
      const { db } = await import('../../database')
      const { entities, audits } = await import('../../database/schema')
      const { ActionType } = await import('../../../shared/types/actions')
      const { AuditType, AuditStatus } = await import('../../../shared/types/enums')
      const { eq, and, isNull, desc } = await import('drizzle-orm')
      const { getEntityFieldValue } = await import('../../utils/entity-fields')
      const { createAction, createActionsForAuditStatus } = await import('../../services/actions')
      const { createAuditForEntity } = await import('../../utils/audit')

      // Mock event for system-triggered operations (same pattern as update-status.ts)
      const mockEvent = { context: { userId: null } } as any

      // Step 1: Find all MASTER entities
      logger.step('Find MASTER entities')
      const masterEntities = await db.query.entities.findMany({
        where: and(
          eq(entities.mode, 'MASTER'),
          isNull(entities.deletedAt),
        ),
        columns: {
          id: true,
          name: true,
        },
      })
      logger.stepComplete('Find MASTER entities', { count: masterEntities.length })

      if (masterEntities.length === 0) {
        logger.complete({ count: 0 }, 'No MASTER entities found')
        return { result: 'No MASTER entities', count: 0 }
      }

      const actionsCreated: Array<{ entityId: number; entityName: string; path: string; daysUntilAnniversary: number }> = []
      const auditsCreated: Array<{ entityId: number; entityName: string; auditId: number }> = []
      const entitiesSkipped: Array<{ entityId: number; reason: string }> = []

      // Step 2: Process each entity
      logger.step('Process entities for anniversary')
      for (const entity of masterEntities) {
        // 2a. Fetch anniversaryDate
        const rawAnniversaryDate = await getEntityFieldValue(entity.id, 'anniversaryDate')

        if (!rawAnniversaryDate) {
          entitiesSkipped.push({ entityId: entity.id, reason: 'No anniversaryDate' })
          continue
        }

        const anniversaryDate = new Date(rawAnniversaryDate as string)
        const nextAnniversary = getNextAnniversaryDate(anniversaryDate, today)
        const daysLeft = daysUntil(nextAnniversary, today)
        const nextAnniversaryStr = nextAnniversary.toISOString().split('T')[0]

        // 2b. Fetch last audit for this entity
        const lastAudit = await db.query.audits.findFirst({
          where: and(
            eq(audits.entityId, entity.id),
            isNull(audits.deletedAt),
          ),
          orderBy: [desc(audits.createdAt)],
          columns: {
            id: true,
            type: true,
            status: true,
          },
        })

        // 2c. Skip if an audit is currently in progress (not terminal)
        if (lastAudit && !TERMINAL_STATUSES.includes(lastAudit.status as any)) {
          entitiesSkipped.push({
            entityId: entity.id,
            reason: `Active audit in progress (ID: ${lastAudit.id}, status: ${lastAudit.status})`,
          })
          continue
        }

        // 2d. Determine the type of the next audit
        let nextAuditType: 'INITIAL' | 'RENEWAL' | 'MONITORING'

        if (!lastAudit) {
          nextAuditType = 'INITIAL'
        } else if (lastAudit.type === AuditType.INITIAL || lastAudit.type === AuditType.RENEWAL) {
          nextAuditType = 'MONITORING'
        } else {
          // lastAudit.type === MONITORING
          nextAuditType = 'RENEWAL'
        }

        // 2e. Chemin A — INITIAL or RENEWAL: create ENTITY_SUBMIT_CASE 120 days before
        if (nextAuditType === 'INITIAL' || nextAuditType === 'RENEWAL') {
          if (daysLeft > DAYS_BEFORE_SUBMIT_CASE) {
            entitiesSkipped.push({
              entityId: entity.id,
              reason: `Next anniversary on ${nextAnniversaryStr} (${daysLeft} days, threshold: ${DAYS_BEFORE_SUBMIT_CASE})`,
            })
            continue
          }

          logger.info(`Chemin A: creating ENTITY_SUBMIT_CASE for entity ${entity.id} (${entity.name})`, {
            nextAuditType,
            nextAnniversaryStr,
            daysLeft,
          })

          await createAction(ActionType.ENTITY_SUBMIT_CASE, entity.id, mockEvent, {
            metadata: {
              reason: 'anniversary',
              nextAnniversaryDate: nextAnniversaryStr,
            },
          })

          actionsCreated.push({
            entityId: entity.id,
            entityName: entity.name,
            path: 'A',
            daysUntilAnniversary: daysLeft,
          })
          continue
        }

        // 2f. Chemin B — MONITORING: create audit directly 45 days before
        if (daysLeft > DAYS_BEFORE_MONITORING) {
          entitiesSkipped.push({
            entityId: entity.id,
            reason: `Next anniversary on ${nextAnniversaryStr} (${daysLeft} days, threshold: ${DAYS_BEFORE_MONITORING})`,
          })
          continue
        }

        // Dedup: check if a MONITORING audit already exists in a non-terminal status
        const pendingMonitoringAudit = await db.query.audits.findFirst({
          where: and(
            eq(audits.entityId, entity.id),
            eq(audits.type, AuditType.MONITORING),
            isNull(audits.deletedAt),
          ),
          orderBy: [desc(audits.createdAt)],
          columns: {
            id: true,
            status: true,
          },
        })

        if (pendingMonitoringAudit && !TERMINAL_STATUSES.includes(pendingMonitoringAudit.status as any)) {
          entitiesSkipped.push({
            entityId: entity.id,
            reason: `MONITORING audit already exists (ID: ${pendingMonitoringAudit.id}, status: ${pendingMonitoringAudit.status})`,
          })
          continue
        }

        logger.info(`Chemin B: creating MONITORING audit for entity ${entity.id} (${entity.name})`, {
          nextAnniversaryStr,
          daysLeft,
        })

        // Create the MONITORING audit (starts at PLANNING status)
        const newAudit = await createAuditForEntity(entity.id, mockEvent)

        // Create standard PLANNING actions (SET_AUDIT_DATES, UPLOAD_AUDIT_PLAN)
        await createActionsForAuditStatus(newAudit, newAudit.status!, mockEvent)

        // Ask entity to update their case information
        await createAction(ActionType.ENTITY_UPDATE_CASE_INFORMATION, entity.id, mockEvent, {
          auditId: newAudit.id,
        })

        auditsCreated.push({
          entityId: entity.id,
          entityName: entity.name,
          auditId: newAudit.id,
        })
      }
      logger.stepComplete('Process entities for anniversary')

      const result = {
        result: 'Success',
        masterEntitiesCount: masterEntities.length,
        actionsCreated: actionsCreated.length,
        auditsCreated: auditsCreated.length,
        entitiesSkipped: entitiesSkipped.length,
        details: {
          actionsCreated,
          auditsCreated,
          entitiesSkipped,
        },
      }

      logger.complete(
        result,
        `Path A: ${actionsCreated.length} actions, Path B: ${auditsCreated.length} audits, skipped: ${entitiesSkipped.length}`,
      )

      return result
    }
    catch (error) {
      logger.error(error as Error)
      throw error
    }
  },
})
