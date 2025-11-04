# Système de Champs Versionnés pour les Entités

Ce système permet de gérer des champs d'entité qui évoluent dans le temps avec un **versioning automatique complet**.

## Architecture

### Tables

- **`entity_field_versions`** : Stocke toutes les versions de tous les champs
  - Colonnes typées : `valueString`, `valueNumber`, `valueBoolean`, `valueDate`
  - Index optimisé : `(entity_id, field_key, created_at DESC)`
  - Audit trail : `createdBy`, `createdAt`

### Fichiers

- **`server/database/entity-fields-config.ts`** : Définition des champs en dur
- **`server/utils/entity-fields.ts`** : Helper functions
- **`server/api/entities/[id]/fields/`** : Endpoints API

## Configuration des champs

Les champs sont définis dans `entity-fields-config.ts` :

```typescript
export const entityFieldsConfig: EntityFieldDefinition[] = [
  {
    key: 'labeling_scope',
    label: 'Périmètre de labellisation',
    type: 'string',
    required: true,
    description: 'Description du périmètre couvert par la certification FEEF',
  },
  {
    key: 'employee_count',
    label: 'Nombre de salariés',
    type: 'number',
    required: true,
  },
  // ... autres champs
]
```

### Ajouter un nouveau champ

1. Ajouter la clé dans le type `EntityFieldKey`
2. Ajouter la définition dans `entityFieldsConfig`
3. Aucune migration nécessaire (système flexible)

## Utilisation des helpers

### Récupérer tous les champs d'une entité

```typescript
import { getEntityFields } from '~/server/utils/entity-fields'

const fieldsMap = await getEntityFields(entityId)

// Accéder à un champ spécifique
const employeeCount = fieldsMap.get('employee_count')
console.log(employeeCount.value) // 50
console.log(employeeCount.lastUpdatedAt) // 2025-01-15
```

### Mettre à jour un champ (crée une nouvelle version)

```typescript
import { setEntityField } from '~/server/utils/entity-fields'

await setEntityField(
  entityId,
  'employee_count',
  75, // nouvelle valeur
  userId
)
```

### Récupérer l'historique d'un champ

```typescript
import { getEntityFieldHistory } from '~/server/utils/entity-fields'

const history = await getEntityFieldHistory(entityId, 'employee_count')
// [
//   { id: 3, value: 75, createdAt: 2025-02-01, createdBy: 5 },
//   { id: 2, value: 50, createdAt: 2025-01-15, createdBy: 3 },
//   { id: 1, value: 30, createdAt: 2024-12-01, createdBy: 3 }
// ]
```

### Mettre à jour plusieurs champs à la fois

```typescript
import { setEntityFields } from '~/server/utils/entity-fields'

const fields = new Map([
  ['employee_count', 75],
  ['labeling_scope', 'Production et distribution'],
  ['has_quality_system', true],
])

await setEntityFields(entityId, fields, userId)
```

### Vérifier les champs requis

```typescript
import { areRequiredFieldsFilled } from '~/server/utils/entity-fields'

const allFilled = await areRequiredFieldsFilled(entityId)
if (!allFilled) {
  console.log('Certains champs requis sont manquants')
}
```

## Endpoints API

### GET `/api/entities/:id/fields`

Récupère tous les champs avec leurs valeurs actuelles.

**Réponse :**
```json
{
  "data": [
    {
      "key": "employee_count",
      "label": "Nombre de salariés",
      "type": "number",
      "value": 75,
      "lastUpdatedAt": "2025-02-01T10:30:00Z",
      "lastUpdatedBy": 5
    }
  ]
}
```

### PUT `/api/entities/:id/fields/:key`

Met à jour un champ (crée une nouvelle version).

**Body :**
```json
{
  "value": 75
}
```

**Réponse :**
```json
{
  "data": {
    "id": 123,
    "entityId": 42,
    "fieldKey": "employee_count",
    "value": 75,
    "createdAt": "2025-02-01T10:30:00Z",
    "createdBy": 5
  }
}
```

### GET `/api/entities/:id/fields/:key/history`

Récupère l'historique complet d'un champ.

**Réponse :**
```json
{
  "data": [
    {
      "id": 3,
      "value": 75,
      "createdAt": "2025-02-01T10:30:00Z",
      "createdBy": 5
    },
    {
      "id": 2,
      "value": 50,
      "createdAt": "2025-01-15T14:20:00Z",
      "createdBy": 3
    }
  ]
}
```

## Intégration avec les relations Drizzle

Les champs versionnés sont accessibles via les relations :

```typescript
// Depuis une entité
const entity = await db.query.entities.findFirst({
  where: eq(entities.id, entityId),
  with: {
    fieldVersions: true, // Toutes les versions de tous les champs
  },
})

// Depuis un compte
const account = await db.query.accounts.findFirst({
  where: eq(accounts.id, userId),
  with: {
    entityFieldVersions: true, // Toutes les modifications faites par cet utilisateur
  },
})
```

## Types de champs supportés

| Type | Colonne DB | Type TypeScript | Exemple |
|------|-----------|----------------|---------|
| `string` | `valueString` | `string` | "Production et distribution" |
| `number` | `valueNumber` | `number` | 75 |
| `boolean` | `valueBoolean` | `boolean` | true |
| `date` | `valueDate` | `Date` | new Date('2025-01-15') |

## Validation automatique

Le système valide automatiquement :
- ✅ Clés de champs (doivent exister dans `entityFieldsConfig`)
- ✅ Types de valeurs (doivent correspondre au type défini)
- ✅ Champs requis (via `areRequiredFieldsFilled()`)

## Performance

- **Index composite** : `(entity_id, field_key, created_at DESC)`
- **Requête optimale** : Récupération de la dernière version en O(1) grâce à l'index
- **Scalabilité** : Supporte des milliers de versions par champ sans impact

## Migration

La migration `0004_redundant_gorgon.sql` crée :
- Table `entity_field_versions`
- Foreign keys vers `entities` et `accounts`
- Index de performance

Pour appliquer la migration :
```bash
npm run db:migrate
```

## Exemple complet

```typescript
// Créer une nouvelle entité et définir ses champs initiaux
const entityId = 42
const userId = 5

// Définir les champs initiaux
await setEntityFields(entityId, new Map([
  ['labeling_scope', 'Production de produits alimentaires'],
  ['employee_count', 30],
  ['main_activity', 'Transformation de produits laitiers'],
  ['has_quality_system', false],
]), userId)

// Plus tard, mettre à jour un champ
await setEntityField(entityId, 'employee_count', 50, userId)

// Encore plus tard
await setEntityField(entityId, 'employee_count', 75, userId)

// Récupérer la valeur actuelle
const fields = await getEntityFields(entityId)
console.log(fields.get('employee_count').value) // 75

// Voir l'historique complet
const history = await getEntityFieldHistory(entityId, 'employee_count')
// [75, 50, 30] avec dates et auteurs
```

## Avantages du système

✅ **Flexibilité** : Ajouter des champs sans migration DB
✅ **Versioning complet** : Historique de toutes les modifications
✅ **Typage DB** : Validation au niveau PostgreSQL
✅ **Performance** : Index optimisé pour requêtes rapides
✅ **Audit trail** : Qui a modifié quoi et quand
✅ **Type-safe** : Types TypeScript inférés automatiquement
✅ **Cohérent** : Suit le pattern existant (`documentVersions`)
