import { and, isNotNull, isNull, max, sql } from 'drizzle-orm'
import { db } from '../database'
import { audits as auditsTable, entities as entitiesTable } from '../database/schema'

/**
 * Sous-requête retournant, pour chaque entité, la date d'expiration de label
 * la plus lointaine parmi ses audits.
 *
 * On prend le MAX plutôt que l'audit le plus récent : sur les audits importés,
 * createdAt ne reflète pas la chronologie réelle des décisions FEEF. Une entité
 * est labellisée dès que l'une de ses labellisations est encore valide.
 */
export function latestLabelExpirationPerEntity(alias = 'label_expiration_per_entity') {
  return db
    .select({
      entityId: auditsTable.entityId,
      labelExpirationDate: max(auditsTable.labelExpirationDate).as('label_expiration_date'),
    })
    .from(auditsTable)
    .where(
      and(
        isNull(auditsTable.deletedAt),
        isNotNull(auditsTable.labelExpirationDate),
      ),
    )
    .groupBy(auditsTable.entityId)
    .as(alias)
}

/**
 * Conditions identifiant une entité MASTER dont la labellisation est encore valide.
 * `labelExpiration` doit être la sous-requête produite par `latestLabelExpirationPerEntity`.
 */
export function labeledEntityConditions(labelExpiration: ReturnType<typeof latestLabelExpirationPerEntity>) {
  return [
    isNull(entitiesTable.deletedAt),
    sql`${entitiesTable.mode} = 'MASTER'`,
    sql`${labelExpiration.labelExpirationDate} >= CURRENT_DATE`,
  ]
}

/**
 * Conditions identifiant une entité MASTER ayant obtenu le label au moins une fois.
 *
 * Cumul historique : le compteur ne décroît jamais. Aucun statut de retrait du
 * label n'existe en base, une entité sortie du label reste donc comptée ici.
 * Pour l'état courant, utiliser `labeledEntityConditions`.
 */
export function everLabeledEntityConditions() {
  return [
    isNull(entitiesTable.deletedAt),
    sql`${entitiesTable.mode} = 'MASTER'`,
    sql`EXISTS (
      SELECT 1 FROM ${auditsTable}
      WHERE ${auditsTable.entityId} = ${entitiesTable.id}
        AND ${auditsTable.deletedAt} IS NULL
        AND ${auditsTable.status} = 'COMPLETED'
    )`,
  ]
}
