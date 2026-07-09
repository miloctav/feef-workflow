import { and, eq, isNull, inArray } from 'drizzle-orm'
import { db } from '~~/server/database'
import { entities as entitiesTable, audits as auditsTable, actions, contracts } from '~~/server/database/schema'
import {
  parsePaginationParams,
  buildWhereConditions,
  buildOrderBy,
} from '~~/server/utils/pagination'
import { entitiesPaginationConfig } from '~~/server/utils/entities-query'
import { Role, OERole } from '#shared/types/roles'
import {
  AuditStatusLabels,
  getFullAuditTypeLabel,
  getEntityTypeLabel,
  getEntityModeLabel,
  type AuditStatusType,
  type AuditTypeType,
  type MonitoringModeType,
  type EntityTypeType,
  type EntityModeType,
} from '#shared/types/enums'
import { getLatestFieldValueFromVersions } from '~~/server/utils/entity-fields'

/**
 * GET /api/entities/export
 *
 * Export CSV des entités selon les filtres/recherche/tri appliqués.
 * Réutilise la même logique de filtrage que GET /api/entities mais ignore la pagination.
 * Retourne un fichier CSV (UTF-8 avec BOM pour compatibilité Excel).
 */

const escapeCsvCell = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  let str = String(value)
  // Neutraliser l'injection de formules : un tableur interprète une cellule
  // commençant par = + - @ (ou tab/CR) comme une formule. On préfixe alors
  // d'une apostrophe pour forcer l'interprétation en texte.
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }
  if (/[",\n\r;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

const formatDateFr = (date: Date | string | null | undefined): string => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  if (user.role === Role.AUDITOR) {
    throw createError({
      statusCode: 403,
      message: 'Les auditeurs ne peuvent pas accéder à la liste des entités',
    })
  }

  const query = getQuery(event)

  const dashboardFilter = query.dashboardFilter as string | undefined
  delete query.dashboardFilter

  if (user.role === Role.ENTITY) {
    query.accountId = String(user.id)
  }

  // Forcer le mode unlimited pour récupérer toutes les entités filtrées
  query.limit = '-1'

  const config = entitiesPaginationConfig

  const params = parsePaginationParams(query, config)
  const whereConditions = await buildWhereConditions(params, config)

  if (dashboardFilter === 'CASE_SUBMISSION_IN_PROGRESS') {
    whereConditions.push(
      inArray(
        entitiesTable.id,
        db.select({ entityId: actions.entityId }).from(actions).where(
          and(
            eq(actions.type, 'ENTITY_SUBMIT_CASE'),
            eq(actions.status, 'PENDING'),
            isNull(actions.deletedAt),
          )
        )
      )
    )
  } else if (dashboardFilter === 'PENDING_FEEF_CONTRACT_SIGNATURE') {
    whereConditions.push(
      inArray(
        entitiesTable.id,
        db.select({ entityId: contracts.entityId }).from(contracts).where(
          and(
            eq(contracts.signatureStatus, 'PENDING_ENTITY'),
            isNull(contracts.oeId),
            isNull(contracts.deletedAt),
          )
        )
      )
    )
  }

  if (user.role === Role.OE) {
    whereConditions.push(eq(entitiesTable.oeId, user.oeId))

    if (user.oeRole === OERole.ACCOUNT_MANAGER) {
      whereConditions.push(eq(entitiesTable.accountManagerId, user.id))
    }
  }

  const orderByClause = buildOrderBy(params.sort, config)

  const rows = await db.query.entities.findMany({
    where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
    with: {
      oe: { columns: { id: true, name: true } },
      accountManager: { columns: { id: true, firstname: true, lastname: true } },
      parentGroup: { columns: { id: true, name: true } },
      fieldVersions: {
        where: (fv, { eq }) => eq(fv.fieldKey, 'firstLabelingDate'),
        columns: { fieldKey: true, valueString: true, valueNumber: true, valueBoolean: true, valueDate: true, createdAt: true },
        orderBy: (fv, { desc }) => [desc(fv.createdAt)],
      },
      audits: {
        orderBy: (audits, { desc }) => [desc(audits.createdAt)],
        where: isNull(auditsTable.deletedAt),
        limit: 1,
        columns: {
          id: true,
          type: true,
          status: true,
          monitoringMode: true,
        },
      },
    },
    ...(orderByClause && { orderBy: orderByClause }),
  })

  const headers = [
    'Nom',
    'SIRET',
    'ID Ecocert (principal)',
    'Tous les ID Ecocert',
    'ID CRM',
    "Type d'entité",
    'Mode labellisation',
    'Groupe parent',
    'Organisme Évaluateur',
    'Chargé de compte',
    'Adresse',
    "Complément d'adresse",
    'Code postal',
    'Ville',
    'Région',
    'Téléphone',
    'Date de première labellisation',
    'Dernier audit',
    'Date de création',
    'Dernière mise à jour',
  ]

  const lines: string[] = [headers.map(escapeCsvCell).join(';')]

  for (const entity of rows) {
    const latestAudit = entity.audits?.[0]
    const auditLabel = latestAudit
      ? `${AuditStatusLabels[latestAudit.status as AuditStatusType] ?? latestAudit.status} - ${getFullAuditTypeLabel(latestAudit.type as AuditTypeType, latestAudit.monitoringMode as MonitoringModeType | null)}`
      : ''

    const manager = entity.accountManager
      ? `${entity.accountManager.firstname} ${entity.accountManager.lastname}`
      : ''

    const firstLabelingDate = getLatestFieldValueFromVersions(
      entity.fieldVersions as any,
      'firstLabelingDate'
    )

    const row = [
      entity.name ?? '',
      entity.siret ?? '',
      entity.ecocertId ?? '',
      entity.ecocertIds ?? '',
      entity.crmId ?? '',
      getEntityTypeLabel(entity.type as EntityTypeType),
      getEntityModeLabel(entity.mode as EntityModeType),
      entity.parentGroup?.name ?? '',
      entity.oe?.name ?? '',
      manager,
      entity.address ?? '',
      entity.addressComplement ?? '',
      entity.postalCode ?? '',
      entity.city ?? '',
      entity.region ?? '',
      entity.phoneNumber ?? '',
      formatDateFr(firstLabelingDate as Date | string | null),
      auditLabel,
      formatDateFr(entity.createdAt),
      formatDateFr(entity.updatedAt ?? entity.createdAt),
    ]

    lines.push(row.map(escapeCsvCell).join(';'))
  }

  const csv = '﻿' + lines.join('\r\n')

  const timestamp = new Date().toISOString().slice(0, 10)
  const filename = `entites-${timestamp}.csv`

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)

  return csv
})
