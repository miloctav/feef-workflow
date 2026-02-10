/**
 * Service d'orchestration des notifications
 *
 * Crée les notifications en BDD pour chaque destinataire
 * et envoie les emails si l'utilisateur a opt-in.
 */

import { db } from '~~/server/database'
import { notifications, entities } from '~~/server/database/schema'
import { eq } from 'drizzle-orm'
import { findActionRecipients, type RecipientAccount } from './notification-recipients'
import { sendActionCreatedEmail } from './mail'
import { ACTION_TYPE_REGISTRY, type ActionTypeType } from '#shared/types/actions'

interface NotifyActionCreatedParams {
  actionType: ActionTypeType
  entityId: number
  auditId: number | null
  actionId: number
  deadline: Date
  origin: string
}

/**
 * Construit l'URL d'action adaptée au rôle du destinataire
 */
function buildActionUrl(role: string, origin: string, entityId: number, auditId: number | null): string {
  const base = origin.replace(/\/$/, '')

  if (auditId) {
    switch (role) {
      case 'FEEF':
        return `${base}/feef/audits/${auditId}`
      case 'OE':
        return `${base}/oe/audits/${auditId}`
      case 'AUDITOR':
        return `${base}/auditor/audits/${auditId}`
      case 'ENTITY':
        return `${base}/entity/audits/${auditId}`
    }
  }

  // Fallback vers la page entité
  switch (role) {
    case 'FEEF':
      return `${base}/feef/entities/${entityId}`
    case 'OE':
      return `${base}/oe/entities/${entityId}`
    case 'ENTITY':
      return `${base}/entity`
    default:
      return base
  }
}

/**
 * Formate une date en format FR lisible
 */
function formatDateFR(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

/**
 * Notifie tous les destinataires concernés par la création d'une action.
 * - Crée toujours une notification en BDD (même si l'email est désactivé)
 * - Envoie un email seulement si emailNotificationsEnabled=true et que le mode le permet
 */
export async function notifyActionCreated(params: NotifyActionCreatedParams): Promise<void> {
  const { actionType, entityId, auditId, actionId, deadline, origin } = params

  try {
    const definition = ACTION_TYPE_REGISTRY[actionType]
    if (!definition) {
      console.warn(`[Notifications] Unknown action type: ${actionType}`)
      return
    }

    // Récupérer le nom de l'entité
    const entity = await db.query.entities.findFirst({
      where: eq(entities.id, entityId),
      columns: { name: true },
    })
    const entityName = entity?.name || `Entité #${entityId}`

    // Trouver les destinataires
    const recipients = await findActionRecipients({
      assignedRoles: definition.assignedRoles,
      entityId,
      auditId,
    })

    if (recipients.length === 0) {
      console.log(`[Notifications] No recipients found for action ${actionType}`)
      return
    }

    console.log(`[Notifications] Notifying ${recipients.length} recipients for action ${actionType}`)

    // Runtime config pour vérifier le dev mode
    const runtimeConfig = useRuntimeConfig()
    const devMode = runtimeConfig.devMode
    const devMailOverride = runtimeConfig.devMailOverride

    // Créer les notifications et envoyer les emails en parallèle
    const promises = recipients.map(async (recipient) => {
      // Toujours créer la notification en BDD
      const shouldSendEmail = recipient.emailNotificationsEnabled && (!devMode || devMailOverride)

      const [notif] = await db.insert(notifications).values({
        accountId: recipient.id,
        type: 'action_created',
        title: definition.titleFr,
        description: definition.descriptionFr,
        entityId,
        auditId,
        actionId,
        emailSent: false,
        metadata: { actionType },
      }).returning()

      // Envoyer l'email si autorisé
      if (shouldSendEmail) {
        try {
          const actionUrl = buildActionUrl(recipient.role, origin, entityId, auditId)

          const result = await sendActionCreatedEmail({
            email: recipient.email,
            firstName: recipient.firstname,
            lastName: recipient.lastname,
            actionTitle: definition.titleFr,
            actionDescription: definition.descriptionFr,
            entityName,
            deadline: formatDateFR(deadline),
            actionUrl,
          })

          if (result.success) {
            await db.update(notifications)
              .set({ emailSent: true })
              .where(eq(notifications.id, notif.id))
          }
        } catch (emailErr) {
          console.error(`[Notifications] Failed to send email to ${recipient.email}:`, emailErr)
        }
      }
    })

    await Promise.allSettled(promises)

    console.log(`[Notifications] Done notifying for action ${actionType}`)
  } catch (err) {
    console.error(`[Notifications] Error in notifyActionCreated:`, err)
  }
}
