/**
 * Service de résolution des destinataires de notifications
 *
 * Détermine quels comptes doivent recevoir une notification
 * en fonction des rôles assignés et du contexte (entité, audit).
 */

import { db } from '~~/server/database'
import { accounts, accountsToEntities, audits } from '~~/server/database/schema'
import { eq, and, isNull, inArray } from 'drizzle-orm'

export interface RecipientAccount {
  id: number
  email: string
  firstname: string
  lastname: string
  role: string
  emailNotificationsEnabled: boolean
}

interface FindRecipientsParams {
  assignedRoles: string[]
  entityId: number
  auditId?: number | null
}

/**
 * Résout les comptes destinataires d'une notification
 * Ne filtre PAS par emailNotificationsEnabled — tous les comptes actifs reçoivent une notif en BDD.
 * Le filtre email se fait au moment de l'envoi.
 */
export async function findActionRecipients(params: FindRecipientsParams): Promise<RecipientAccount[]> {
  const { assignedRoles, entityId, auditId } = params
  const recipientsMap = new Map<number, RecipientAccount>()

  for (const role of assignedRoles) {
    let roleRecipients: RecipientAccount[] = []

    switch (role) {
      case 'FEEF':
        roleRecipients = await findFeefRecipients()
        break
      case 'ENTITY':
        roleRecipients = await findEntityRecipients(entityId)
        break
      case 'OE':
        roleRecipients = await findOeRecipients(auditId)
        break
      case 'AUDITOR':
        roleRecipients = await findAuditorRecipients(auditId)
        break
    }

    for (const recipient of roleRecipients) {
      recipientsMap.set(recipient.id, recipient)
    }
  }

  return Array.from(recipientsMap.values())
}

/**
 * Comptes FEEF actifs
 */
async function findFeefRecipients(): Promise<RecipientAccount[]> {
  const result = await db.query.accounts.findMany({
    where: and(
      eq(accounts.role, 'FEEF'),
      eq(accounts.isActive, true),
      isNull(accounts.deletedAt),
    ),
    columns: {
      id: true,
      email: true,
      firstname: true,
      lastname: true,
      role: true,
      emailNotificationsEnabled: true,
    },
  })
  return result
}

/**
 * Comptes liés à l'entité via accountsToEntities
 */
async function findEntityRecipients(entityId: number): Promise<RecipientAccount[]> {
  const links = await db.query.accountsToEntities.findMany({
    where: eq(accountsToEntities.entityId, entityId),
    columns: { accountId: true },
  })

  if (links.length === 0) return []

  const accountIds = links.map(l => l.accountId)
  const result = await db.query.accounts.findMany({
    where: and(
      inArray(accounts.id, accountIds),
      eq(accounts.isActive, true),
      isNull(accounts.deletedAt),
    ),
    columns: {
      id: true,
      email: true,
      firstname: true,
      lastname: true,
      role: true,
      emailNotificationsEnabled: true,
    },
  })

  return result
}

/**
 * Comptes OE liés à l'audit
 */
async function findOeRecipients(auditId?: number | null): Promise<RecipientAccount[]> {
  if (!auditId) return []

  const audit = await db.query.audits.findFirst({
    where: eq(audits.id, auditId),
    columns: { oeId: true },
  })

  if (!audit?.oeId) return []

  const result = await db.query.accounts.findMany({
    where: and(
      eq(accounts.role, 'OE'),
      eq(accounts.oeId, audit.oeId),
      eq(accounts.isActive, true),
      isNull(accounts.deletedAt),
    ),
    columns: {
      id: true,
      email: true,
      firstname: true,
      lastname: true,
      role: true,
      emailNotificationsEnabled: true,
    },
  })

  return result
}

/**
 * Auditeur assigné à l'audit
 */
async function findAuditorRecipients(auditId?: number | null): Promise<RecipientAccount[]> {
  if (!auditId) return []

  const audit = await db.query.audits.findFirst({
    where: eq(audits.id, auditId),
    columns: { auditorId: true },
  })

  if (!audit?.auditorId) return []

  const auditor = await db.query.accounts.findFirst({
    where: and(
      eq(accounts.id, audit.auditorId),
      eq(accounts.isActive, true),
      isNull(accounts.deletedAt),
    ),
    columns: {
      id: true,
      email: true,
      firstname: true,
      lastname: true,
      role: true,
      emailNotificationsEnabled: true,
    },
  })

  return auditor ? [auditor] : []
}
