/**
 * PUT /api/actions/[id]/complete - Complete action manually (FEEF only)
 *
 * Allows FEEF administrators to manually mark actions as completed,
 * bypassing automatic completion checks. This is intended for exceptional
 * cases like synchronization issues or special circumstances.
 */

import { db } from '~~/server/database'
import { actions, audits } from '~~/server/database/schema'
import { eq } from 'drizzle-orm'
import { forUpdate } from '~~/server/utils/tracking'
import { auditStateMachine } from '~~/server/state-machine'

export default defineEventHandler(async (event) => {
  // 1. Authentication & Authorization
  const { user } = await requireUserSession(event)

  if (user.role !== Role.FEEF) {
    throw createError({
      statusCode: 403,
      message: 'Seuls les administrateurs FEEF peuvent compléter manuellement une action',
    })
  }

  // 2. Get action ID from route
  const actionId = Number(getRouterParam(event, 'id'))

  if (isNaN(actionId)) {
    throw createError({
      statusCode: 400,
      message: 'ID d\'action invalide',
    })
  }

  // 3. Fetch action with relations (entity, audit)
  const action = await db.query.actions.findFirst({
    where: eq(actions.id, actionId),
    with: {
      entity: true,
      audit: true,
    },
  })

  // 4. Validate action exists and is not deleted
  if (!action || action.deletedAt) {
    throw createError({
      statusCode: 404,
      message: 'Action non trouvée',
    })
  }

  // 5. Validate action is in PENDING status
  if (action.status === 'COMPLETED') {
    throw createError({
      statusCode: 409,
      message: 'Cette action est déjà complétée',
    })
  }

  if (action.status === 'CANCELLED') {
    throw createError({
      statusCode: 409,
      message: 'Cette action est annulée et ne peut pas être complétée',
    })
  }

  // 6. Update action - mark as completed
  await db.update(actions)
    .set(forUpdate(event, {
      status: 'COMPLETED',
      completedAt: new Date(),
      completedBy: user.id,
    }))
    .where(eq(actions.id, actionId))

  console.log(`[Actions] Manual completion by FEEF user ${user.id} for action ${actionId} (${action.type})`)

  // 7. Check for state machine auto-transitions
  let transitioned = false
  let newStatus = null

  if (action.audit) {
    const statusBefore = action.audit.status

    try {
      // Reload audit to ensure fresh state for state machine check
      const auditForTransition = await db.query.audits.findFirst({
        where: eq(audits.id, action.audit.id),
      })

      if (auditForTransition) {
        await auditStateMachine.checkAutoTransition(auditForTransition, event)

        // Fetch audit again to check if status changed
        const auditAfter = await db.query.audits.findFirst({
          where: eq(audits.id, action.audit.id),
        })

        if (auditAfter && auditAfter.status !== statusBefore) {
          transitioned = true
          newStatus = auditAfter.status
          console.log(`[Actions] Manual completion triggered audit transition: ${statusBefore} → ${newStatus}`)
        }
      }
    } catch (error) {
      // Log error but don't fail the request - action was successfully completed
      console.error('[Actions] Error during state machine auto-transition after manual completion:', error)
    }
  }

  // 8. Fetch updated action with all relations for response
  const updatedAction = await db.query.actions.findFirst({
    where: eq(actions.id, actionId),
    with: {
      entity: true,
      audit: {
        with: {
          oe: true,
          auditor: {
            columns: {
              id: true,
              firstname: true,
              lastname: true,
            },
          },
        },
      },
      completedByAccount: {
        columns: {
          id: true,
          firstname: true,
          lastname: true,
        },
      },
    },
  })

  return {
    data: {
      action: updatedAction,
      transitioned,
      newStatus,
    },
  }
})
