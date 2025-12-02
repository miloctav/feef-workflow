import { eq, and } from 'drizzle-orm'
import { db } from '~~/server/database'
import { accounts, oes, auditorsToOE } from '~~/server/database/schema'
import { forCreate } from '~~/server/utils/tracking'

interface CreateAuditorToOEBody {
  auditorId: number
  oeId: number
}

/**
 * POST /api/auditors-to-oe
 *
 * Crée une association entre un auditeur et un organisme évaluateur
 *
 * Body:
 * - auditorId: ID du compte auditeur (requis)
 * - oeId: ID de l'organisme évaluateur (requis)
 */
export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur connecté est FEEF
  const { user } = await requireUserSession(event)

  if (user.role !== Role.FEEF) {
    throw createError({
      statusCode: 403,
      message: 'Seul un administrateur FEEF peut créer des associations auditeur-OE',
    })
  }

  // Récupérer les données du corps de la requête
  const body = await readBody<CreateAuditorToOEBody>(event)
  const { auditorId, oeId } = body

  // Validation des champs requis
  if (!auditorId || !oeId) {
    throw createError({
      statusCode: 400,
      message: 'auditorId et oeId sont requis',
    })
  }

  // Vérifier que le compte existe et a le rôle AUDITOR
  const account = await db.query.accounts.findFirst({
    where: eq(accounts.id, auditorId),
  })

  if (!account) {
    throw createError({
      statusCode: 404,
      message: 'Compte auditeur introuvable',
    })
  }

  if (account.role !== Role.AUDITOR) {
    throw createError({
      statusCode: 400,
      message: 'Le compte doit avoir le rôle AUDITOR',
    })
  }

  // Vérifier que l'OE existe
  const oe = await db.query.oes.findFirst({
    where: eq(oes.id, oeId),
  })

  if (!oe) {
    throw createError({
      statusCode: 404,
      message: 'Organisme évaluateur introuvable',
    })
  }

  // Vérifier que l'association n'existe pas déjà
  const existingAssociation = await db
    .select()
    .from(auditorsToOE)
    .where(
      and(
        eq(auditorsToOE.auditorId, auditorId),
        eq(auditorsToOE.oeId, oeId)
      )
    )
    .limit(1)

  if (existingAssociation.length > 0) {
    throw createError({
      statusCode: 409,
      message: 'Cette association auditeur-OE existe déjà',
    })
  }

  // Créer l'association
  const [newAssociation] = await db
    .insert(auditorsToOE)
    .values({
      auditorId,
      oeId,
    })
    .returning()

  console.log('[Auditors-to-OE API] Association créée:', newAssociation)

  return {
    data: {
      success: true,
      association: newAssociation,
    },
  }
})
