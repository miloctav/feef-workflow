/**
 * Nitro Task - Check label expiration and create renewal actions
 *
 * Runs daily to check MASTER entities with labels expiring within 40 days
 * and creates ENTITY_SUBMIT_CASE actions for renewal
 *
 * Scheduled for 2:40 AM UTC
 */
import { createCronLogger } from '~~/server/utils/logger/cron-logger'

export default defineTask({
    meta: {
        name: 'actions:check-label-expiration',
        description: 'Check label expiration dates and create renewal actions for MASTER entities',
    },
    async run({ payload, context }) {
        const logger = createCronLogger('actions:check-label-expiration')
        const now = new Date()

        // Calculate the threshold date (40 days from now)
        const thresholdDate = new Date()
        thresholdDate.setDate(thresholdDate.getDate() + 40)
        const thresholdDateStr = thresholdDate.toISOString().split('T')[0] // Format YYYY-MM-DD

        logger.start('Starting label expiration check', {
            thresholdDate: thresholdDateStr,
        })

        try {
            // Dynamic imports
            const { db } = await import('../../database')
            const { entities, audits, actions } = await import('../../database/schema')
            const { ActionType } = await import('../../../shared/types/actions')
            const { eq, and, isNull, isNotNull, lte, desc, inArray, or } = await import('drizzle-orm')

            // Step 1: Find all MASTER entities
            logger.step('Find MASTER entities')
            const masterEntities = await db.query.entities.findMany({
                where: and(
                    eq(entities.mode, 'MASTER'),
                    isNull(entities.deletedAt)
                ),
                columns: {
                    id: true,
                    name: true,
                }
            })
            logger.stepComplete('Find MASTER entities', { count: masterEntities.length })

            if (masterEntities.length === 0) {
                logger.complete({ count: 0 }, 'No MASTER entities found')
                return { result: 'No MASTER entities', count: 0 }
            }

            logger.info(`Found ${masterEntities.length} MASTER entities to process`)

            const actionsCreated: Array<{ entityId: number, entityName: string, expirationDate: string }> = []
            const entitiesSkipped: Array<{ entityId: number, reason: string }> = []

            // Step 2: Process each MASTER entity
            logger.step('Process entities for expiration')
            for (const entity of masterEntities) {
                // Find the latest audit with labelExpirationDate not null
                const latestAudit = await db.query.audits.findFirst({
                    where: and(
                        eq(audits.entityId, entity.id),
                        isNull(audits.deletedAt),
                        isNotNull(audits.labelExpirationDate) // labelExpirationDate IS NOT NULL
                    ),
                    orderBy: [desc(audits.createdAt)],
                    columns: {
                        id: true,
                        labelExpirationDate: true,
                    }
                })

                // Skip if no audit with labelExpirationDate found
                if (!latestAudit || !latestAudit.labelExpirationDate) {
                    entitiesSkipped.push({
                        entityId: entity.id,
                        reason: 'No audit with labelExpirationDate'
                    })
                    continue
                }

                // Check if label is expiring within 40 days
                const expirationDate = new Date(latestAudit.labelExpirationDate)
                if (expirationDate > thresholdDate) {
                    entitiesSkipped.push({
                        entityId: entity.id,
                        reason: `Label expires on ${latestAudit.labelExpirationDate} (more than 40 days)`
                    })
                    continue
                }

                // Check if an ENTITY_SUBMIT_CASE action already exists (PENDING or OVERDUE)
                const existingAction = await db.query.actions.findFirst({
                    where: and(
                        eq(actions.entityId, entity.id),
                        eq(actions.type, ActionType.ENTITY_SUBMIT_CASE),
                        or(
                            eq(actions.status, 'PENDING'),
                            eq(actions.status, 'OVERDUE')
                        ),
                        isNull(actions.deletedAt)
                    ),
                    columns: {
                        id: true,
                        status: true,
                    }
                })

                // Skip if action already exists
                if (existingAction) {
                    entitiesSkipped.push({
                        entityId: entity.id,
                        reason: `Action already exists (ID: ${existingAction.id}, status: ${existingAction.status})`
                    })
                    continue
                }

                // Create the action
                const deadline = new Date()
                deadline.setDate(deadline.getDate() + 30) // 30 days from now

                await db.insert(actions).values({
                    type: ActionType.ENTITY_SUBMIT_CASE,
                    entityId: entity.id,
                    auditId: null, // Not linked to a specific audit (for creating a new one)
                    assignedRoles: ['ENTITY'],
                    status: 'PENDING',
                    durationDays: 30,
                    deadline,
                    metadata: {
                        reason: 'label_expiration',
                        expirationDate: latestAudit.labelExpirationDate,
                    },
                    createdBy: null, // System-triggered
                    createdAt: now,
                })

                actionsCreated.push({
                    entityId: entity.id,
                    entityName: entity.name,
                    expirationDate: latestAudit.labelExpirationDate,
                })

                logger.info('Created renewal action', {
                    entityId: entity.id,
                    entityName: entity.name,
                    expirationDate: latestAudit.labelExpirationDate,
                })
            }
            logger.stepComplete('Process entities for expiration')

            const result = {
                result: 'Success',
                masterEntitiesCount: masterEntities.length,
                actionsCreated: actionsCreated.length,
                entitiesSkipped: entitiesSkipped.length,
                details: {
                    actionsCreated,
                    entitiesSkipped,
                },
            }

            logger.complete(result, `Created ${actionsCreated.length} renewal actions, skipped ${entitiesSkipped.length} entities`)

            return result

        } catch (error) {
            logger.error(error as Error)
            throw error
        }
    },
})
