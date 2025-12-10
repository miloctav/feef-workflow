/**
 * Nitro Task - Mise à jour automatique du statut des audits
 *
 * Met à jour les audits avec status=PLANNING ou SCHEDULED vers PENDING_REPORT
 * lorsque leur actualEndDate est passée
 *
 * Planifié pour s'exécuter chaque jour à 0h UTC (1h Paris hiver / 2h Paris été)
 */
export default defineTask({
  meta: {
    name: 'audits:update-status',
    description: 'Met à jour les audits PLANNING/SCHEDULED → PENDING_REPORT quand actualEndDate est passée',
  },
  async run({ payload, context }) {
    const startTime = Date.now()
    const today = new Date().toISOString().split('T')[0] // Format YYYY-MM-DD

    console.log(`[TASK] Audit Status Update - Started at ${new Date().toISOString()}`)
    console.log(`[TASK] Looking for audits with status=PLANNING or SCHEDULED and actualEndDate < ${today}`)

    try {
      // Import dynamique de la DB et du schema
      const { db } = await import('../../database')
      const { audits } = await import('../../database/schema')
      const { AuditStatus } = await import('../../../shared/types/enums')
      const { eq, and, lt, isNull, or } = await import('drizzle-orm')

      // Trouver les audits à mettre à jour (PLANNING ou SCHEDULED avec actualEndDate passée)
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

      if (auditsToUpdate.length === 0) {
        console.log('[TASK] No audits to update')
        return { result: 'No audits to update', count: 0 }
      }

      console.log(`[TASK] Found ${auditsToUpdate.length} audits to transition`)

      // Import action creation function
      const { createActionsForAuditStatus } = await import('../../services/actions')

      // Mettre à jour chaque audit
      const updatedIds: number[] = []
      for (const audit of auditsToUpdate) {
        // Update audit status
        const [updatedAudit] = await db.update(audits)
          .set({
            status: AuditStatus.PENDING_REPORT,
            updatedAt: new Date()
          })
          .where(eq(audits.id, audit.id))
          .returning()

        // Create actions for the new status
        // Note: We don't have an H3Event in tasks, so we create a minimal mock
        const mockEvent = {
          context: {
            userId: null // System-triggered action (no user)
          }
        } as any

        await createActionsForAuditStatus(updatedAudit, AuditStatus.PENDING_REPORT, mockEvent)

        updatedIds.push(audit.id)
        console.log(`[TASK] ✓ Audit #${audit.id} (entity #${audit.entityId}) ${audit.status} → PENDING_REPORT and actions created`)
      }

      const duration = Date.now() - startTime
      console.log(`[TASK] Completed successfully in ${duration}ms`)
      console.log(`[TASK] Updated audit IDs: ${updatedIds.join(', ')}`)

      return {
        result: 'Success',
        count: updatedIds.length,
        auditIds: updatedIds,
        duration
      }

    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`[TASK] FAILED after ${duration}ms:`, error)
      throw error
    }
  },
})

