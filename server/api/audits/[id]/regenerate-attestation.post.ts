import { Role } from '#shared/types/roles'
import { AuditStatus } from '#shared/types/enums'
import { audits } from '~~/server/database/schema'
import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (user.role !== Role.FEEF) {
    throw createError({ statusCode: 403, message: 'Accès réservé à la FEEF' })
  }

  const auditId = getRouterParam(event, 'id')
  const audit = await db.query.audits.findFirst({
    where: eq(audits.id, parseInt(auditId!))
  })

  if (!audit) {
    throw createError({ statusCode: 404, message: 'Audit non trouvé' })
  }

  if (audit.status !== AuditStatus.COMPLETED) {
    throw createError({
      statusCode: 400,
      message: 'L\'audit doit être au statut COMPLETED'
    })
  }

  if (audit.feefDecision !== 'ACCEPTED') {
    throw createError({
      statusCode: 400,
      message: 'La décision FEEF doit être ACCEPTED'
    })
  }

  // Récupérer les données personnalisées du body ou fallback sur attestationMetadata
  const body = await readBody(event)
  const customData = {
    ...(audit.attestationMetadata || {}),
    ...(body || {}),
  }
  const { customScope, customExclusions, customCompanies } = customData

  try {
    const { AttestationGenerator } = await import('~~/server/services/documentGeneration/AttestationGenerator')
    const generator = new AttestationGenerator()

    // Utiliser generateWithCustomData pour passer les données personnalisées
    await generator.generateWithCustomData(
      { event, data: { auditId: audit.id } },
      {
        auditId: audit.id,
        auditDocumentType: 'ATTESTATION',
        entityId: audit.entityId,
      },
      // Passer les données personnalisées (avec fallback sur les données sauvegardées)
      {
        customScope,
        customExclusions,
        customCompanies,
      }
    )

    // Sauvegarder les métadonnées dans la base de données
    await db.update(audits)
      .set({
        attestationMetadata: {
          customScope,
          customExclusions,
          customCompanies,
        },
        updatedAt: new Date(),
        updatedBy: user.id,
      })
      .where(eq(audits.id, audit.id))

    return { data: { success: true, message: 'Attestation générée avec succès' } }
  } catch (error: any) {
    console.error('[Regenerate Attestation] Erreur:', error)
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la génération',
      data: { error: error.message }
    })
  }
})
