/**
 * Utilitaires pour gérer les champs versionnés des entités
 */

import { db } from '../database'
import { entityFieldVersions, type EntityFieldVersion, type NewEntityFieldVersion } from '../database/schema'
import { eq, and, desc } from 'drizzle-orm'
import { entityFieldsConfig, getFieldDefinition, isValidFieldKey, type EntityFieldKey, type EntityFieldType } from '../database/entity-fields-config'

// Type pour une valeur de champ typée
export type EntityFieldValue = string | number | boolean | Date | null

// Type pour un champ avec sa valeur actuelle
export interface EntityFieldWithValue {
  key: EntityFieldKey
  label: string
  type: EntityFieldType
  value: EntityFieldValue
  unit?: string
  lastUpdatedAt: Date
  lastUpdatedBy: number
}

// Type pour l'historique d'un champ
export interface EntityFieldHistoryEntry {
  id: number
  value: EntityFieldValue
  createdAt: Date
  createdBy: number
}

/**
 * Extrait la valeur typée d'une version de champ
 */
export function extractValue(version: EntityFieldVersion): EntityFieldValue {
  if (version.valueString !== null) return version.valueString
  if (version.valueNumber !== null) return Number(version.valueNumber)
  if (version.valueBoolean !== null) return version.valueBoolean
  if (version.valueDate !== null) return version.valueDate
  return null
}

/**
 * Prépare les colonnes de valeur pour l'insertion selon le type
 */
function prepareValueColumns(type: EntityFieldType, value: EntityFieldValue): Pick<NewEntityFieldVersion, 'valueString' | 'valueNumber' | 'valueBoolean' | 'valueDate'> {
  const columns: Pick<NewEntityFieldVersion, 'valueString' | 'valueNumber' | 'valueBoolean' | 'valueDate'> = {
    valueString: null,
    valueNumber: null,
    valueBoolean: null,
    valueDate: null,
  }

  if (value === null || value === undefined) {
    return columns
  }

  switch (type) {
    case 'string':
    case 'text':
      columns.valueString = String(value)
      break
    case 'number':
      columns.valueNumber = String(value) // numeric est stocké comme string dans pg
      break
    case 'boolean':
      columns.valueBoolean = Boolean(value)
      break
    case 'date':
      columns.valueDate = value instanceof Date ? value : new Date(value)
      break
  }

  return columns
}

/**
 * Récupère les dernières valeurs de tous les champs d'une entité
 *
 * @param entityId - ID de l'entité
 * @returns Map des champs avec leurs valeurs actuelles
 */
export async function getEntityFields(entityId: number): Promise<Map<EntityFieldKey, EntityFieldWithValue>> {
  const result = new Map<EntityFieldKey, EntityFieldWithValue>()

  // Pour chaque champ configuré, récupérer la dernière version
  for (const fieldDef of entityFieldsConfig) {
    const latestVersion = await db.query.entityFieldVersions.findFirst({
      where: and(
        eq(entityFieldVersions.entityId, entityId),
        eq(entityFieldVersions.fieldKey, fieldDef.key)
      ),
      orderBy: [desc(entityFieldVersions.createdAt)],
      with: {
        createdByAccount: {
          columns: {
            id: true,
            firstname: true,
            lastname: true,
          },
        },
      },
    })

    if (latestVersion) {
      result.set(fieldDef.key, {
        key: fieldDef.key,
        label: fieldDef.label,
        type: fieldDef.type,
        value: extractValue(latestVersion),
        unit: fieldDef.unit,
        lastUpdatedAt: latestVersion.createdAt,
        lastUpdatedBy: latestVersion.createdBy,
      })
    }
  }

  return result
}

/**
 * Récupère l'historique complet d'un champ spécifique
 *
 * @param entityId - ID de l'entité
 * @param fieldKey - Clé du champ
 * @returns Historique des versions du champ (du plus récent au plus ancien)
 */
export async function getEntityFieldHistory(
  entityId: number,
  fieldKey: EntityFieldKey
): Promise<EntityFieldHistoryEntry[]> {
  if (!isValidFieldKey(fieldKey)) {
    throw new Error(`Clé de champ invalide: ${fieldKey}`)
  }

  const versions = await db.query.entityFieldVersions.findMany({
    where: and(
      eq(entityFieldVersions.entityId, entityId),
      eq(entityFieldVersions.fieldKey, fieldKey)
    ),
    orderBy: [desc(entityFieldVersions.createdAt)],
    with: {
      createdByAccount: {
        columns: {
          id: true,
          firstname: true,
          lastname: true,
        },
      },
    },
  })

  return versions.map(version => ({
    id: version.id,
    value: extractValue(version),
    createdAt: version.createdAt,
    createdBy: version.createdBy,
    createdByAccount: version.createdByAccount,
  }))
}

/**
 * Définit ou met à jour la valeur d'un champ (crée une nouvelle version)
 *
 * @param entityId - ID de l'entité
 * @param fieldKey - Clé du champ
 * @param value - Nouvelle valeur
 * @param createdBy - ID de l'utilisateur effectuant la modification
 * @returns La version créée
 */
export async function setEntityField(
  entityId: number,
  fieldKey: EntityFieldKey,
  value: EntityFieldValue,
  createdBy: number
): Promise<EntityFieldVersion> {
  if (!isValidFieldKey(fieldKey)) {
    throw new Error(`Clé de champ invalide: ${fieldKey}`)
  }

  const fieldDef = getFieldDefinition(fieldKey)
  if (!fieldDef) {
    throw new Error(`Définition de champ non trouvée: ${fieldKey}`)
  }

  // Valider le type de la valeur
  if (value !== null && value !== undefined) {
    switch (fieldDef.type) {
      case 'string':
        if (typeof value !== 'string') {
          throw new Error(`Le champ ${fieldKey} attend une valeur de type string`)
        }
        break
      case 'number':
        if (typeof value !== 'number') {
          throw new Error(`Le champ ${fieldKey} attend une valeur de type number`)
        }
        break
      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new Error(`Le champ ${fieldKey} attend une valeur de type boolean`)
        }
        break
      case 'date':
        if (!(value instanceof Date)) {
          throw new Error(`Le champ ${fieldKey} attend une valeur de type Date`)
        }
        break
    }
  }

  // Préparer les colonnes de valeur
  const valueColumns = prepareValueColumns(fieldDef.type, value)

  // Créer une nouvelle version
  const [newVersion] = await db
    .insert(entityFieldVersions)
    .values({
      entityId,
      fieldKey,
      ...valueColumns,
      createdBy,
    })
    .returning()

  return newVersion
}

/**
 * Définit plusieurs champs en une seule transaction
 *
 * @param entityId - ID de l'entité
 * @param fields - Map des champs à définir (clé -> valeur)
 * @param createdBy - ID de l'utilisateur effectuant les modifications
 * @returns Les versions créées
 */
export async function setEntityFields(
  entityId: number,
  fields: Map<EntityFieldKey, EntityFieldValue>,
  createdBy: number
): Promise<EntityFieldVersion[]> {
  const results: EntityFieldVersion[] = []

  // Insérer toutes les versions en transaction
  for (const [fieldKey, value] of fields.entries()) {
    const version = await setEntityField(entityId, fieldKey, value, createdBy)
    results.push(version)
  }

  return results
}

/**
 * Récupère la valeur actuelle d'un champ spécifique
 *
 * @param entityId - ID de l'entité
 * @param fieldKey - Clé du champ
 * @returns La valeur actuelle ou null si le champ n'a pas de valeur
 */
export async function getEntityFieldValue(
  entityId: number,
  fieldKey: EntityFieldKey
): Promise<EntityFieldValue> {
  if (!isValidFieldKey(fieldKey)) {
    throw new Error(`Clé de champ invalide: ${fieldKey}`)
  }

  const latestVersion = await db.query.entityFieldVersions.findFirst({
    where: and(
      eq(entityFieldVersions.entityId, entityId),
      eq(entityFieldVersions.fieldKey, fieldKey)
    ),
    orderBy: [desc(entityFieldVersions.createdAt)],
  })

  return latestVersion ? extractValue(latestVersion) : null
}

/**
 * Vérifie si tous les champs requis d'une entité ont une valeur
 *
 * @param entityId - ID de l'entité
 * @returns true si tous les champs requis sont remplis
 */
export async function areRequiredFieldsFilled(entityId: number): Promise<boolean> {
  const fields = await getEntityFields(entityId)

  for (const fieldDef of entityFieldsConfig) {
    if (fieldDef.required) {
      const field = fields.get(fieldDef.key)
      if (!field || field.value === null || field.value === undefined) {
        return false
      }
    }
  }

  return true
}

/**
 * Récupère la dernière valeur d'un champ depuis un tableau de fieldVersions
 * Utile quand on a déjà chargé les fieldVersions via une relation Drizzle
 *
 * @param fieldVersions - Tableau des versions de champs (ex: entity.fieldVersions)
 * @param fieldKey - Clé du champ à récupérer
 * @returns La valeur actuelle ou null si le champ n'a pas de valeur
 */
export function getLatestFieldValueFromVersions(
  fieldVersions: EntityFieldVersion[],
  fieldKey: EntityFieldKey
): EntityFieldValue {
  if (!fieldVersions || fieldVersions.length === 0) {
    return null
  }

  // Filtrer les versions pour ce champ et trier par date de création décroissante
  const matchingVersions = fieldVersions
    .filter((v) => v.fieldKey === fieldKey)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  if (matchingVersions.length === 0) {
    return null
  }

  // Extraire la valeur typée de la dernière version
  return extractValue(matchingVersions[0])
}
