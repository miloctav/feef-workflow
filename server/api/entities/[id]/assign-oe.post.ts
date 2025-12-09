import { eq, and, isNull, desc, ne } from 'drizzle-orm'
import { db } from '~~/server/database'
import { entities, oes, audits } from '~~/server/database/schema'
import { forUpdate } from '~~/server/utils/tracking'
import { AuditStatus, AuditStatusType, AuditType } from '~~/shared/types/enums'

interface AssignOeBody {
  oeId: number | null
  allowOeDocumentsAccess?: boolean
}

export default defineEventHandler(async (event) => {
  // Récupérer l'utilisateur connecté
  const { user: currentUser } = await requireUserSession(event)

  // Récupérer l'ID de l'entité
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

  // Vérifications d'autorisation selon le rôle
  if (currentUser.role === Role.ENTITY) {
    // Une entité ne peut modifier que sa propre assignation OE
    if (currentUser.currentEntityId !== entityIdInt) {
      throw createError({
        statusCode: 403,
        message: 'Vous ne pouvez modifier que l\'OE de votre propre entité',
      })
    }
  } else if (currentUser.role === Role.FEEF) {
    // FEEF peut modifier n'importe quelle entité
    // Pas de restriction supplémentaire
  } else {
    // Autres rôles (OE, AUDITOR) ne peuvent pas assigner d'OE
    throw createError({
      statusCode: 403,
      message: 'Vous n\'avez pas l\'autorisation d\'assigner un OE à une entité',
    })
  }

  // Vérifier que l'entité existe
  const existingEntity = await db.query.entities.findFirst({
    where: eq(entities.id, entityIdInt),
    columns: {
      id: true,
      name: true,
      oeId: true,
    }
  })

  if (!existingEntity) {
    throw createError({
      statusCode: 404,
      message: 'Entité non trouvée',
    })
  }

  // Vérifier que l'entité peut changer d'OE :
  // - Pas d'OE assigné (peut en choisir un), OU
  // - Pas d'audits, OU
  // - Dernier audit COMPLETED et de type MONITORING
  if (existingEntity.oeId) {
    const lastAudit = await db.query.audits.findFirst({
      where: and(
        eq(audits.entityId, entityIdInt),
        isNull(audits.deletedAt)
      ),
      orderBy: desc(audits.createdAt),
      columns: {
        id: true,
        status: true,
        type: true,
      }
    })

    if (lastAudit) {
      const canChangeOe =
        lastAudit.type === AuditType.MONITORING
          ? lastAudit.status === AuditStatus.COMPLETED
          : lastAudit.status === AuditStatus.PENDING_OE_CHOICE || lastAudit.status === AuditStatus.PENDING_CASE_APPROVAL
      if (!canChangeOe) {
        throw createError({
          statusCode: 400,
          message: 'Impossible de changer d\'OE : un audit est en cours ou le dernier audit n\'est pas un suivi terminé',
        })
      }
    }
  }

  // Récupérer les données du corps de la requête
  const body = await readBody<AssignOeBody>(event)

  const { oeId, allowOeDocumentsAccess } = body

  // Valider que oeId est soit null soit un nombre
  if (oeId !== null && typeof oeId !== 'number') {
    throw createError({
      statusCode: 400,
      message: 'L\'ID de l\'OE doit être un nombre ou null',
    })
  }


  // Chercher si l'entité a un audit en cours (le plus récent non terminé)
  let ongoingAudit = await db.query.audits.findFirst({
    where: and(
      eq(audits.entityId, entityIdInt),
      ne(audits.status, AuditStatus.COMPLETED),
      isNull(audits.deletedAt)
    ),
    orderBy: desc(audits.createdAt),
    columns: {
      id: true,
      status: true,
      type: true,
      entityId: true,
      oeId: true,
      auditorId: true,
    }
  })

  // Mode appel d'offre : désassigner l'OE (oeId = null)
  if (oeId === null) {
    // Vérifier que l'entité a un OE assigné
    if (!existingEntity.oeId) {
      throw createError({
        statusCode: 400,
        message: 'Cette entité n\'a pas d\'OE assigné',
      })
    }

    console.log(`Passage en mode appel d'offre pour l'entité ID ${entityIdInt} par l'utilisateur ID ${currentUser.id}`)

    // Mettre à jour l'entité pour retirer l'OE et désactiver le partage documentaire
    await db
      .update(entities)
      .set(forUpdate(event, {
        oeId: null,
        allowOeDocumentsAccess: false // Force à false en mode appel d'offre
      }))
      .where(eq(entities.id, entityIdInt))

    // Si un audit en cours existe, retirer l'OE
    if (ongoingAudit) {
      console.log(`Retrait de l'OE de l'audit en cours ID ${ongoingAudit.id}`)

      await db
        .update(audits)
        .set(forUpdate(event, {
          oeId: null
        }))
        .where(eq(audits.id, ongoingAudit.id))
    }

    // Retourner l'entité mise à jour
    const entityWithRelations = await db.query.entities.findFirst({
      where: eq(entities.id, entityIdInt),
      with: {
        oe: {
          columns: {
            id: true,
            name: true,
          }
        },
        accountManager: {
          columns: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          }
        }
      }
    })

    const auditMessage = ongoingAudit
      ? ' (audit en cours également affecté)'
      : ''

    return {
      data: entityWithRelations,
      message: `L'entité ${existingEntity.name} est maintenant en mode appel d'offre${auditMessage}`,
    }
  }

  console.log(`Assignation de l'OE ID ${oeId} à l'entité ID ${entityIdInt} par l'utilisateur ID ${currentUser.id}`)

  // Vérifier que l'OE existe et est actif
  const targetOe = await db.query.oes.findFirst({
    where: and(
      eq(oes.id, oeId),
      isNull(oes.deletedAt) // Vérifier que l'OE n'est pas supprimé
    )
  })

  console.log(`Vérification de l'existence de l'OE ID ${oeId}`)
  console.log('OE trouvée:', targetOe)

  if (!targetOe) {
    throw createError({
      statusCode: 404,
      message: 'Organisme évaluateur non trouvé ou inactif',
    })
  }

  // Vérifier si l'OE est déjà assigné à cette entité
  if (existingEntity.oeId === oeId) {
    throw createError({
      statusCode: 400,
      message: `Cette entité est déjà assignée à l'OE ${targetOe.name}`,
    })
  }


  // Mettre à jour l'entité avec le nouvel OE et le paramètre de partage documentaire
  const [updatedEntity] = await db
    .update(entities)
    .set(forUpdate(event, {
      oeId: oeId,
      allowOeDocumentsAccess: allowOeDocumentsAccess ?? false // Utilise la valeur fournie ou false par défaut
    }))
    .where(eq(entities.id, entityIdInt))
    .returning()


  // Gérer l'assignation OE à l'audit en cours
  if (ongoingAudit) {
    console.log(`Assignation de l'OE ID ${oeId} à l'audit en cours ID ${ongoingAudit.id}`)
    // Déterminer les champs à mettre à jour pour l'audit en cours
    const auditUpdate: { oeId: number | null; status?: AuditStatusType } = {
      oeId: oeId
    }

    const statusChanged = ongoingAudit.status === AuditStatus.PENDING_OE_CHOICE
    if (statusChanged) {
      auditUpdate.status = AuditStatus.PLANNING
    }

    await db
      .update(audits)
      .set(forUpdate(event, auditUpdate))
      .where(eq(audits.id, ongoingAudit.id))

    // Récupérer l'audit mis à jour
    const updatedAudit = await db.query.audits.findFirst({
      where: eq(audits.id, ongoingAudit.id),
    })

    if (!updatedAudit) {
      throw createError({
        statusCode: 500,
        message: 'Erreur lors de la récupération de l\'audit mis à jour',
      })
    }

    // Create actions if status changed and complete pending actions
    const { createActionsForAuditStatus, checkAndCompleteAllPendingActions } = await import('~~/server/services/actions')
    if (statusChanged) {
      await createActionsForAuditStatus(updatedAudit, AuditStatus.PLANNING, event)
    }
    await checkAndCompleteAllPendingActions(updatedAudit, currentUser.id, event)
  }

  // Retourner l'entité mise à jour avec les relations
  const entityWithRelations = await db.query.entities.findFirst({
    where: eq(entities.id, entityIdInt),
    with: {
      oe: {
        columns: {
          id: true,
          name: true,
        }
      },
      accountManager: {
        columns: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
        }
      }
    }
  })

  const auditMessage = ongoingAudit
    ? ' et à l\'audit en cours'
    : ''

  return {
    data: entityWithRelations,
    message: `OE ${targetOe.name} assigné avec succès à l'entité ${existingEntity.name}${auditMessage}`,
  }
})