import { sql } from 'drizzle-orm'
import { entities as entitiesTable, accountsToEntities } from '~~/server/database/schema'
import { AuditStatus, AuditStatusFlow, type AuditStatusType } from '#shared/types/enums'

/**
 * Ordre de tri des statuts d'audit : le flow métier d'abord (du plus en amont au
 * plus avancé), puis les statuts hors flow. Un statut absent de cette liste
 * ressort en fin de tri (array_position renvoie NULL, donc NULLS LAST).
 */
const auditStatusSortOrder: AuditStatusType[] = [
  ...AuditStatusFlow,
  AuditStatus.PENDING_COMPLEMENTARY_AUDIT,
  AuditStatus.REFUSED_PLAN,
  AuditStatus.REFUSED_BY_OE,
]

const auditStatusSortArray = sql.join(
  auditStatusSortOrder.map((status) => sql`${status}`),
  sql`, `
)

/**
 * Les colonnes des tables jointes sont écrites en identifiants littéraux plutôt qu'en
 * objets colonnes Drizzle : dans une requête relationnelle (`db.query.*` avec `with`),
 * Drizzle réécrit toute colonne présente dans un `orderBy` avec l'alias de la table
 * racine, ce qui transformerait `oes.name` en `"entities"."name"`. Les fragments
 * littéraux du template, eux, sont laissés intacts.
 *
 * Ces sous-requêtes corrélées sont aussi le seul moyen de trier sur une relation :
 * les relations chargées via `with` passent par des jointures latérales agrégées,
 * dont les colonnes ne sont pas adressables dans ORDER BY.
 */

/** Rang, dans le flow métier, du statut du dernier audit de l'entité */
const latestAuditStatusRank = sql`(
  select array_position(ARRAY[${auditStatusSortArray}]::text[], "audits"."status"::text)
  from "audits"
  where "audits"."entity_id" = "entities"."id"
    and "audits"."deleted_at" is null
  order by "audits"."created_at" desc
  limit 1
)`

/** Date planifiée du dernier audit de l'entité */
const latestAuditPlannedDate = sql`(
  select "audits"."planned_date"
  from "audits"
  where "audits"."entity_id" = "entities"."id"
    and "audits"."deleted_at" is null
  order by "audits"."created_at" desc
  limit 1
)`

/** Nom de l'organisme évaluateur assigné à l'entité */
const oeName = sql`(
  select "oes"."name" from "oes" where "oes"."id" = "entities"."oe_id"
)`

/** Nom complet du chargé de compte de l'entité */
const accountManagerName = sql`(
  select "accounts"."lastname" || ' ' || "accounts"."firstname"
  from "accounts"
  where "accounts"."id" = "entities"."account_manager_id"
)`

/**
 * Configuration de pagination partagée entre `GET /api/entities` et `GET /api/entities/export`,
 * pour que l'export CSV respecte exactement les mêmes filtres et le même tri que le tableau.
 */
export const entitiesPaginationConfig = {
  table: entitiesTable,
  searchFields: ['name', 'siret'],
  allowedFilters: {
    local: ['type', 'mode', 'oeId', 'accountManagerId', 'parentGroupId'],
  },
  allowedSorts: {
    local: ['createdAt', 'updatedAt', 'name', 'siret', 'type', 'mode'],
  },
  customSorts: {
    'oe.name': oeName,
    'accountManager.lastname': accountManagerName,
    'audits.status': latestAuditStatusRank,
    'audits.plannedDate': latestAuditPlannedDate,
  },
  junctionFilters: {
    accountId: {
      junctionTable: accountsToEntities,
      localIdColumn: accountsToEntities.entityId, // On veut récupérer les entityId
      targetIdColumn: accountsToEntities.accountId, // Filtrés par accountId
      roleColumn: accountsToEntities.role, // Support du filtre par rôle (optionnel)
      roleParam: 'accountIdRole', // Nom du paramètre pour filtrer par rôle
    },
  },
  defaultSort: 'updatedAt:desc',
}
