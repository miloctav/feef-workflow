/**
 * Nitro Task - Mark actions as overdue
 *
 * Runs daily to mark PENDING actions with deadline < now as OVERDUE
 * Scheduled for 2:00 AM UTC
 */
export default defineTask({
  meta: {
    name: 'actions:mark-overdue',
    description: 'Mark pending actions with passed deadlines as OVERDUE',
  },
  async run({ payload, context }) {
    const startTime = Date.now()
    const now = new Date()

    console.log(`[TASK] Mark Overdue Actions - Started at ${now.toISOString()}`)

    try {
      const { db } = await import('../../database')
      const { actions } = await import('../../database/schema')
      const { eq, and, lt, isNull } = await import('drizzle-orm')

      // Find PENDING actions with deadline < now
      const overdueActions = await db.query.actions.findMany({
        where: and(
          eq(actions.status, 'PENDING'),
          lt(actions.deadline, now),
          isNull(actions.deletedAt),
        ),
        columns: {
          id: true,
          type: true,
          deadline: true,
        },
      })

      if (overdueActions.length === 0) {
        console.log('[TASK] No overdue actions found')
        return { result: 'No overdue actions', count: 0 }
      }

      console.log(`[TASK] Found ${overdueActions.length} overdue actions`)

      // Mark as OVERDUE
      const updatedIds: number[] = []
      for (const action of overdueActions) {
        await db.update(actions)
          .set({
            status: 'OVERDUE',
            updatedAt: now,
          })
          .where(eq(actions.id, action.id))

        updatedIds.push(action.id)
        console.log(`[TASK] Marked action #${action.id} (${action.type}) as OVERDUE`)
      }

      const duration = Date.now() - startTime
      console.log(`[TASK] Completed successfully in ${duration}ms`)
      console.log(`[TASK] Updated action IDs: ${updatedIds.join(', ')}`)

      return {
        result: 'Success',
        count: updatedIds.length,
        actionIds: updatedIds,
        duration,
      }
    }
    catch (error) {
      const duration = Date.now() - startTime
      console.error(`[TASK] FAILED after ${duration}ms:`, error)
      throw error
    }
  },
})
