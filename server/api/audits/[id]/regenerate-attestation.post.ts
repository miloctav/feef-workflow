import { Role } from '#shared/types/roles'
import { AuditStatus } from '#shared/types/enums'
import { audits } from '~~/server/database/schema'
import { eq } from 'drizzle-orm'

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

  try {
    const { AttestationGenerator } = await import('~~/server/services/documentGeneration/AttestationGenerator')
    const generator = new AttestationGenerator()

    await generator.generate(
      { event, data: { auditId: audit.id } },
      {
        auditId: audit.id,
        auditDocumentType: 'ATTESTATION',
        entityId: audit.entityId,
      }
    )

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
