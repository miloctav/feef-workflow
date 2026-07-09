import { Role } from '#shared/types/roles'
import {
  loadAuditForAdmin,
  planAuditAdminChange,
  type AuditAdminBody,
} from '~~/server/utils/audit-admin-plan'

/**
 * POST /api/audits/:id/admin/preview
 *
 * Simule (dry-run) une modification administrative d'audit et retourne les
 * changements, avertissements et blocages, sans rien écrire en base.
 *
 * Autorisations : FEEF uniquement.
 */
export default defineEventHandler(async (event) => {
  const { user: currentUser } = await requireUserSession(event)

  if (currentUser.role !== Role.FEEF) {
    throw createError({
      statusCode: 403,
      message: 'Accès refusé. Seul le rôle FEEF peut effectuer des opérations administratives sur les audits.',
    })
  }

  const idParam = getRouterParam(event, 'id')
  const auditId = parseInt(idParam ?? '', 10)
  if (Number.isNaN(auditId)) {
    throw createError({ statusCode: 400, message: 'ID de l\'audit invalide' })
  }

  const audit = await loadAuditForAdmin(auditId)
  if (!audit) {
    throw createError({ statusCode: 404, message: 'Audit non trouvé' })
  }

  const body = await readBody<AuditAdminBody>(event)
  const plan = await planAuditAdminChange(audit, body)

  return {
    data: {
      changes: plan.changes,
      warnings: plan.warnings,
      blocked: plan.blocked,
    },
  }
})
