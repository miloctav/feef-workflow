import crypto from 'crypto'
import { eq, and, lt } from 'drizzle-orm'
import { db } from '~~/server/database'
import { trustedDevices, accounts } from '~~/server/database/schema'

export const TRUST_COOKIE_NAME = 'feef_trust_token'
const TRUST_DURATION_DAYS = 30
const TRUST_MAX_AGE_SECONDS = TRUST_DURATION_DAYS * 24 * 60 * 60

export function getTrustCookieName() {
  return TRUST_COOKIE_NAME
}

export function getTrustMaxAge() {
  return TRUST_MAX_AGE_SECONDS
}

function generateTrustToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

function hashTrustToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function createTrustedDevice(accountId: number, userAgent?: string): Promise<string> {
  const token = generateTrustToken()
  const tokenHash = hashTrustToken(token)

  const expiresAt = new Date(Date.now() + TRUST_MAX_AGE_SECONDS * 1000)

  await db.insert(trustedDevices).values({
    accountId,
    tokenHash,
    label: userAgent?.substring(0, 255) || null,
    expiresAt,
  })

  return token
}

export async function validateTrustToken(token: string): Promise<number | null> {
  const tokenHash = hashTrustToken(token)

  const device = await db.query.trustedDevices.findFirst({
    where: eq(trustedDevices.tokenHash, tokenHash),
    with: {
      account: {
        columns: {
          id: true,
          isActive: true,
          deletedAt: true,
        },
      },
    },
  })

  if (!device) return null

  // Vérifier l'expiration
  if (new Date() > device.expiresAt) {
    // Supprimer le token expiré
    await db.delete(trustedDevices).where(eq(trustedDevices.id, device.id))
    return null
  }

  // Vérifier que le compte est actif et non supprimé
  if (!device.account.isActive || device.account.deletedAt) {
    return null
  }

  // Mettre à jour lastUsedAt
  await db.update(trustedDevices)
    .set({ lastUsedAt: new Date() })
    .where(eq(trustedDevices.id, device.id))

  return device.accountId
}

export async function revokeAllTrustedDevices(accountId: number): Promise<void> {
  await db.delete(trustedDevices).where(eq(trustedDevices.accountId, accountId))
}

export async function cleanupExpiredDevices(): Promise<void> {
  await db.delete(trustedDevices).where(lt(trustedDevices.expiresAt, new Date()))
}
