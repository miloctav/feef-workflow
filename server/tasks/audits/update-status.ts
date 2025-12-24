/**
 * Nitro Task - Mise à jour automatique du statut des audits
 *
 * Met à jour les audits avec status=PLANNING ou SCHEDULED vers PENDING_REPORT
 * lorsque leur actualEndDate est passée
 *
 * Planifié pour s'exécuter chaque jour à 0h UTC (1h Paris hiver / 2h Paris été)
 */
import { createCronLogger } from '~~/server/utils/logger/cron-logger'

export default defineTask({
  meta: {
    name: 'audits:update-status',
    description: 'Met à jour les audits PLANNING/SCHEDULED → PENDING_REPORT quand actualEndDate est passée',
  },
  async run({ payload, context }) {
    const logger = createCronLogger('audits:update-status')
    const today = new Date().toISOString().split('T')[0] // Format YYYY-MM-DD

    logger.start('Starting audit status update task')
    logger.info('Searching for audits to update', { date: today })

    try {
      // Import dynamique de la DB et du schema
      const { db } = await import('../../database')
      const { audits } = await import('../../database/schema')
      const { AuditStatus } = await import('../../../shared/types/enums')
      const { eq, and, lt, isNull, or } = await import('drizzle-orm')

      // Trouver les audits à mettre à jour (PLANNING ou SCHEDULED avec actualEndDate passée)
      logger.step('Query audits from database')
      const auditsToUpdate = await db.query.audits.findMany({
        where: and(
          or(
            eq(audits.status, AuditStatus.PLANNING),
            eq(audits.status, AuditStatus.SCHEDULED)
          ),
          lt(audits.actualEndDate, today),
          isNull(audits.deletedAt)
        ),
        columns: {
          id: true,
          entityId: true,
          status: true,
          actualEndDate: true
        }
      })
      logger.stepComplete('Query audits from database', { count: auditsToUpdate.length })

      if (auditsToUpdate.length === 0) {
        logger.complete({ count: 0 }, 'No audits to update')
        return { result: 'No audits to update', count: 0 }
      }

      logger.info(`Found ${auditsToUpdate.length} audits to transition`)

      // Import state machine
      const { auditStateMachine } = await import('../../state-machine')

      // Mettre à jour chaque audit
      logger.step('Process audit transitions')
      const updatedIds: number[] = []
      const failedIds: number[] = []

      for (const audit of auditsToUpdate) {
        // Create a minimal mock event (no actual user for cron jobs)
        const mockEvent = {
          context: {
            userId: null // System-triggered action (no user)
          }
        } as any

        // Use state machine for transition
        try {
          await auditStateMachine.transition(audit, AuditStatus.PENDING_REPORT, mockEvent)
          updatedIds.push(audit.id)
          logger.info('Successfully transitioned audit', {
            auditId: audit.id,
            entityId: audit.entityId,
            fromStatus: audit.status,
            toStatus: 'PENDING_REPORT'
          })
        } catch (error) {
          failedIds.push(audit.id)
          logger.warn('Failed to transition audit', {
            auditId: audit.id,
            error: error instanceof Error ? error.message : String(error)
          })
          // Continue with next audit
        }
      }
      logger.stepComplete('Process audit transitions')

      const result = {
        result: 'Success',
        count: updatedIds.length,
        failedCount: failedIds.length,
        auditIds: updatedIds,
        failedAuditIds: failedIds
      }

      logger.complete(result, `Updated ${updatedIds.length} audits successfully, ${failedIds.length} failed`)

      return result

    } catch (error) {
      logger.error(error as Error)
      throw error
    }
  },
})

