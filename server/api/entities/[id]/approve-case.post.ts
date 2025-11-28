import { eq, desc, isNull } from 'drizzle-orm'
import { db } from '~~/server/database'
import { entities, audits } from '~~/server/database/schema'
import { forUpdate } from '~~/server/utils/tracking'

export default defineEventHandler(async (event) => {
  // Vérifier que l'utilisateur est connecté
  const { user: currentUser } = await requireUserSession(event)

  // Vérifier que le rôle est FEEF
  if (currentUser.role !== Role.FEEF) {
    throw createError({
      statusCode: 403,
      message: 'Seul un administrateur FEEF peut approuver un dossier',
    })
  }

  // Récupérer l'ID de l'entité depuis l'URL
  const entityId = getRouterParam(event, 'id')

  if (!entityId) {
    throw createError({
      statusCode: 400,
      message: 'ID de l\'entité manquant',
    })
  }

  const entityIdInt = parseInt(entityId)

  if (isNaN(entityIdInt)) {
    throw createError({
      statusCode: 400,
      message: 'ID de l\'entité invalide',
    })
  }

  // Vérifier que l'entité existe et n'est pas supprimée
  const entity = await db.query.entities.findFirst({
    where: eq(entities.id, entityIdInt),
  })

  if (!entity) {
    throw createError({
      statusCode: 404,
      message: 'Entité non trouvée',
    })
  }

  if (entity.deletedAt) {
    throw createError({
      statusCode: 400,
      message: 'Cette entité a été supprimée et ne peut plus être approuvée',
    })
  }

  // Récupérer le dernier audit de l'entité
  const latestAudit = await db.query.audits.findFirst({
    where: (audits, { eq, isNull, and }) => and(
      eq(audits.entityId, entityIdInt),
      isNull(audits.deletedAt)
    ),
    orderBy: (audits, { desc }) => [desc(audits.createdAt)],
  })

  if (!latestAudit) {
    throw createError({
      statusCode: 400,
      message: 'Aucun audit trouvé pour cette entité',
    })
  }

  // Vérifier que le dossier a bien été soumis
  if (!latestAudit.caseSubmittedAt) {
    throw createError({
      statusCode: 400,
      message: 'Le dossier doit être soumis avant de pouvoir être approuvé',
    })
  }

  // Vérifier que le dossier n'a pas déjà été approuvé
  if (latestAudit.caseApprovedAt) {
    throw createError({
      statusCode: 400,
      message: 'Le dossier a déjà été approuvé le ' + new Date(latestAudit.caseApprovedAt).toLocaleDateString('fr-FR'),
    })
  }

  // Mettre à jour l'audit avec les informations d'approbation
  const [updatedAudit] = await db
    .update(audits)
    .set(forUpdate(event, {
      caseApprovedAt: new Date(),
      caseApprovedBy: currentUser.id,
      status: entity.oeId ? AuditStatus.PLANNING : AuditStatus.PENDING_OE_CHOICE,
    }))
    .where(eq(audits.id, latestAudit.id))
    .returning()

  // Retourner l'audit mis à jour
  return {
    data: updatedAudit,
  }
})
