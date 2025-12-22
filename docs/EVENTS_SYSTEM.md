# Système d'Événements (Events System)

## Vue d'ensemble

Le système d'événements est une **architecture event-sourcing** qui remplace les anciens champs d'audit trail (`*At/*By`) éparpillés dans les tables `audits`, `entities` et `contracts`. Au lieu d'ajouter une paire de colonnes pour chaque action à traquer, tous les événements sont centralisés dans une seule table `events`.

### Avantages

- ✅ **Scalabilité** : Ajouter un nouveau type d'événement = 1 ligne dans l'enum (pas de migration de schéma)
- ✅ **Contexte riche** : Métadonnées flexibles (raison, commentaire, score, décision, etc.)
- ✅ **Timeline complète** : Historique complet et immutable de toutes les actions
- ✅ **Schéma propre** : Pas de prolifération de colonnes dans les tables métier
- ✅ **Séparation claire** : Events (ce qui s'est passé) vs Actions (ce qui doit être fait)

---

## 1. Architecture des Événements

### 1.1 Table `events`

```typescript
// server/database/schema.ts
export const events = pgTable('events', {
  id: serial('id').primaryKey(),

  // Identification de l'événement
  type: eventTypeEnum('type').notNull(),        // ex: AUDIT_CASE_SUBMITTED
  category: eventCategoryEnum('category').notNull(), // AUDIT, ENTITY, CONTRACT, SYSTEM

  // Références polymorphiques (au moins une doit être remplie)
  auditId: integer('audit_id').references(() => audits.id),
  entityId: integer('entity_id').references(() => entities.id),
  contractId: integer('contract_id').references(() => contracts.id),

  // Qui et quand (immuable)
  performedBy: integer('performed_by').notNull().references(() => accounts.id),
  performedAt: timestamp('performed_at').notNull().defaultNow(),

  // Contexte flexible (JSON)
  metadata: json('metadata'),
})
```

**Points clés** :
- **Polymorphique** : Un événement peut concerner un audit, une entité OU un contrat
- **Immuable** : Les événements ne sont jamais modifiés après création
- **Métadonnées flexibles** : Permet de stocker du contexte spécifique à chaque type d'événement

### 1.2 Types d'événements (19 types)

```typescript
export const eventTypeEnum = pgEnum('event_type', [
  // Audit workflow (14 types)
  'AUDIT_CASE_SUBMITTED',
  'AUDIT_CASE_APPROVED',
  'AUDIT_OE_ASSIGNED',
  'AUDIT_OE_ACCEPTED',
  'AUDIT_OE_REFUSED',
  'AUDIT_DATES_SET',
  'AUDIT_PLAN_UPLOADED',
  'AUDIT_REPORT_UPLOADED',
  'AUDIT_CORRECTIVE_PLAN_UPLOADED',
  'AUDIT_CORRECTIVE_PLAN_VALIDATED',
  'AUDIT_OE_OPINION_TRANSMITTED',
  'AUDIT_FEEF_DECISION_ACCEPTED',
  'AUDIT_FEEF_DECISION_REJECTED',
  'AUDIT_ATTESTATION_GENERATED',
  'AUDIT_STATUS_CHANGED',

  // Entity (2 types)
  'ENTITY_DOCUMENTARY_REVIEW_READY',
  'ENTITY_OE_ASSIGNED',

  // Contract (2 types)
  'CONTRACT_ENTITY_SIGNED',
  'CONTRACT_FEEF_SIGNED',
])
```

### 1.3 Service Layer (`server/services/events.ts`)

Le service expose 5 fonctions principales :

#### `recordEvent()` - Enregistrer un événement

```typescript
await recordEvent(event, {
  type: 'AUDIT_CASE_SUBMITTED',
  auditId: audit.id,
  entityId: entity.id,
  metadata: {
    plannedDate: '2025-06-15',
    timestamp: new Date(),
  },
})
```

**Validation automatique** :
- Type d'événement valide
- Références requises présentes
- Utilisateur connecté

#### `hasEventOccurred()` - Vérifier si un événement existe

```typescript
// Utilisé par les guards de la state machine
const hasDecision = await hasEventOccurred('AUDIT_FEEF_DECISION_ACCEPTED', {
  auditId: audit.id
})
```

#### `getLatestEvent()` - Récupérer le dernier événement d'un type

```typescript
// Utilisé pour les validations API
const approvedEvent = await getLatestEvent('AUDIT_CASE_APPROVED', {
  auditId: latestAudit.id
})

if (approvedEvent) {
  throw createError({
    message: `Déjà approuvé le ${approvedEvent.performedAt.toLocaleDateString('fr-FR')}`
  })
}
```

#### `getAuditEvents()` - Timeline d'un audit

```typescript
// Récupérer tous les événements d'un audit
const events = await getAuditEvents(auditId, {
  types: ['AUDIT_CASE_SUBMITTED', 'AUDIT_CASE_APPROVED'],
  limit: 50
})
```

#### `getEntityTimeline()` - Timeline complète d'une entité

```typescript
// Inclut événements de l'entité + ses audits + ses contrats
const timeline = await getEntityTimeline(entityId, {
  categories: ['AUDIT', 'CONTRACT'],
  limit: 100
})
```

---

## 2. Intégration avec la State Machine

### 2.1 Guards basés sur les événements

Les **guards** de la state machine utilisent `hasEventOccurred()` pour déterminer si une transition est autorisée.

**Exemple - `server/state-machine/guards.ts`** :

```typescript
/**
 * Vérifie si l'OE a accepté l'audit
 */
export async function oeHasAccepted(audit: Audit): Promise<boolean> {
  return await hasEventOccurred('AUDIT_OE_ACCEPTED', { auditId: audit.id })
}

/**
 * Vérifie si la décision FEEF a été prise
 */
export async function hasFeefDecision(audit: Audit): Promise<boolean> {
  const acceptedEvent = await hasEventOccurred('AUDIT_FEEF_DECISION_ACCEPTED', { auditId: audit.id })
  const rejectedEvent = await hasEventOccurred('AUDIT_FEEF_DECISION_REJECTED', { auditId: audit.id })
  return acceptedEvent || rejectedEvent
}
```

### 2.2 Enregistrement d'événements lors des transitions

Les transitions de la state machine enregistrent automatiquement des événements.

**Exemple - `server/api/audits/[id]/validate-corrective-plan.put.ts`** :

```typescript
// 1. Mettre à jour le statut
await db.update(audits)
  .set({ status: 'PENDING_OE_OPINION', updatedBy: user.id, updatedAt: new Date() })
  .where(eq(audits.id, auditId))

// 2. Enregistrer l'événement
await recordEvent(event, {
  type: 'AUDIT_CORRECTIVE_PLAN_VALIDATED',
  auditId: auditId,
  entityId: audit.entityId,
  metadata: {
    previousStatus: audit.status,
    newStatus: 'PENDING_OE_OPINION',
    timestamp: new Date(),
  },
})
```

### 2.3 Configuration State Machine (`server/state-machine/config.ts`)

Les transitions peuvent spécifier des événements à enregistrer :

```typescript
{
  from: 'PENDING_CORRECTIVE_PLAN_VALIDATION',
  to: 'PENDING_OE_OPINION',
  trigger: 'MANUAL',
  guards: ['correctivePlanValidated'], // Utilise hasEventOccurred()
  actions: ['createActionsForStatus'],
}
```

---

## 3. Intégration avec les Actions

### 3.1 Différence Events vs Actions

| Aspect | **Events** | **Actions** |
|--------|-----------|------------|
| **Nature** | Ce qui **s'est passé** (historique) | Ce qui **doit être fait** (tâches) |
| **Mutabilité** | Immuable | Mutable (status: PENDING → COMPLETED) |
| **Utilisateur** | `performedBy` (qui a fait) | `assignedTo` / `completedBy` |
| **Timestamp** | `performedAt` (quand c'est arrivé) | `deadline` / `completedAt` |
| **Métadonnées** | Contexte de l'action (raison, score) | Instructions pour l'utilisateur |

### 3.2 Complétion d'action = Enregistrement d'événement

Quand une action est complétée, un événement correspondant est souvent enregistré.

**Exemple - `server/api/entities/[id]/mark-documentary-review-ready.put.ts`** :

```typescript
// 1. Mettre à jour l'entité
await db.update(entities)
  .set({ updatedBy: currentUser.id, updatedAt: new Date() })
  .where(eq(entities.id, entityIdInt))

// 2. Enregistrer l'événement
await recordEvent(event, {
  type: 'ENTITY_DOCUMENTARY_REVIEW_READY',
  entityId: entityIdInt,
  metadata: { timestamp: new Date() },
})

// 3. Compléter automatiquement les actions en attente
await checkAndCompleteAllPendingActionsForEntity(entity, currentUser.id, event)
```

### 3.3 Auto-complétion basée sur les événements

Le système d'actions peut utiliser les événements pour déterminer si une action doit être auto-complétée.

**Exemple dans `server/services/actions.ts`** :

```typescript
// Si l'événement AUDIT_CASE_SUBMITTED existe, compléter l'action ENTITY_SUBMIT_CASE
const submittedEvent = await hasEventOccurred('AUDIT_CASE_SUBMITTED', { auditId: audit.id })
if (submittedEvent && action.type === 'ENTITY_SUBMIT_CASE' && action.status === 'PENDING') {
  await completeAction(action.id, currentUser.id, event)
}
```

---

## 4. Intégration avec le Dashboard

### 4.1 Queries basées sur les événements

Le dashboard utilise des **subqueries SQL** pour récupérer les timestamps depuis la table `events` au lieu des anciens champs `*At`.

**Exemple - Durée moyenne du processus** (`server/api/dashboard/overview.get.ts`) :

```typescript
// Calcul de la durée entre createdAt et la décision FEEF
db.select({
  avgDurationDays: sql<number>`
    AVG(
      EXTRACT(DAY FROM (
        (SELECT e.performed_at FROM ${eventsTable} e
         WHERE e.audit_id = ${auditsTable.id}
           AND e.type IN ('AUDIT_FEEF_DECISION_ACCEPTED', 'AUDIT_FEEF_DECISION_REJECTED')
         ORDER BY e.performed_at DESC
         LIMIT 1)
        - ${auditsTable.createdAt}
      ))
    )
  `,
})
.from(auditsTable)
.where(
  and(
    eq(auditsTable.status, 'COMPLETED'),
    sql`EXISTS (
      SELECT 1 FROM ${eventsTable} e
      WHERE e.audit_id = ${auditsTable.id}
        AND e.type IN ('AUDIT_FEEF_DECISION_ACCEPTED', 'AUDIT_FEEF_DECISION_REJECTED')
    )`,
  ),
)
```

**Exemple - Entités labellisées par année** :

```typescript
db.select({
  year: sql<number>`
    EXTRACT(YEAR FROM (
      SELECT e.performed_at FROM ${eventsTable} e
      WHERE e.audit_id = ${auditsTable.id}
        AND e.type = 'AUDIT_FEEF_DECISION_ACCEPTED'
      ORDER BY e.performed_at DESC
      LIMIT 1
    ))::int
  `,
  type: auditsTable.type,
  count: sql<number>`COUNT(*)::int`,
})
.from(auditsTable)
.where(
  and(
    eq(auditsTable.status, 'COMPLETED'),
    eq(auditsTable.feefDecision, 'ACCEPTED'),
    sql`EXISTS (
      SELECT 1 FROM ${eventsTable} e
      WHERE e.audit_id = ${auditsTable.id}
        AND e.type = 'AUDIT_FEEF_DECISION_ACCEPTED'
    )`,
  ),
)
.groupBy(/* subquery pour year */, auditsTable.type)
```

### 4.2 Optimisation des performances

**Index créés sur la table `events`** :

```typescript
index('idx_events_audit_id').on(table.auditId),
index('idx_events_entity_id').on(table.entityId),
index('idx_events_type').on(table.type),
index('idx_events_category_date').on(table.category, table.performedAt),
index('idx_events_performed_by').on(table.performedBy),
```

**Recommandation** : Si les queries du dashboard deviennent lentes, créer un index composite :

```sql
CREATE INDEX idx_events_audit_type_date
ON events (audit_id, type, performed_at DESC);
```

---

## 5. API Endpoints pour les Événements

### 5.1 GET `/api/audits/:id/events`

Récupère tous les événements d'un audit avec filtrage optionnel.

**Query params** :
- `types` : string[] - Filtrer par types (ex: `AUDIT_CASE_SUBMITTED,AUDIT_CASE_APPROVED`)
- `limit` : number - Limiter le nombre de résultats

**Exemple** :
```bash
GET /api/audits/123/events?types=AUDIT_CASE_SUBMITTED,AUDIT_CASE_APPROVED&limit=10
```

**Response** :
```json
{
  "data": [
    {
      "id": 1,
      "type": "AUDIT_CASE_SUBMITTED",
      "category": "AUDIT",
      "auditId": 123,
      "entityId": 45,
      "performedBy": 2,
      "performedAt": "2025-01-15T10:30:00Z",
      "metadata": {
        "plannedDate": "2025-06-15",
        "timestamp": "2025-01-15T10:30:00Z"
      },
      "performedByAccount": {
        "id": 2,
        "firstname": "John",
        "lastname": "Doe"
      }
    }
  ]
}
```

### 5.2 GET `/api/entities/:id/timeline`

Récupère la timeline complète d'une entité (tous événements liés).

**Query params** :
- `categories` : string[] - Filtrer par catégories (ex: `AUDIT,CONTRACT`)
- `limit` : number - Limiter le nombre de résultats

**Exemple** :
```bash
GET /api/entities/45/timeline?categories=AUDIT,CONTRACT
```

---

## 6. Composant Frontend AuditTimeline.vue

### 6.1 Utilisation

```vue
<template>
  <AuditTimeline :audit-id="audit.id" />
</template>
```

### 6.2 Fonctionnalités

- Timeline visuelle avec ligne verticale
- Icônes et couleurs par catégorie d'événement
- Affichage du contexte : score, avis, décision, raison, commentaire
- États de chargement, erreur et vide
- Formatage des dates en français

### 6.3 Exemple de rendu

```
┃ 🔵 Dossier soumis
┃    Par Marie Dupont
┃    15 janvier 2025 à 10:30
┃    📋 Date prévisionnelle: 15 juin 2025
┃
┃ 🔵 Dossier approuvé
┃    Par Jean Martin
┃    16 janvier 2025 à 14:20
┃    📋 Nouveau statut: PLANNING
┃
┃ 🟢 OE a accepté l'audit
┃    Par Sophie Bernard
┃    18 janvier 2025 à 09:15
```

---

## 7. Exemples d'Usage Complets

### 7.1 Workflow complet d'approbation de dossier

**Endpoint : `server/api/entities/[id]/approve-case.post.ts`**

```typescript
export default defineEventHandler(async (event) => {
  const { user: currentUser } = await requireUserSession(event)
  const entityId = parseInt(getRouterParam(event, 'id'))

  // 1. Vérifier que le dossier a été soumis (validation basée sur événement)
  const submittedEvent = await getLatestEvent('AUDIT_CASE_SUBMITTED', {
    auditId: latestAudit.id
  })
  if (!submittedEvent) {
    throw createError({
      statusCode: 400,
      message: 'Le dossier doit être soumis avant approbation',
    })
  }

  // 2. Vérifier que le dossier n'est pas déjà approuvé
  const approvedEvent = await getLatestEvent('AUDIT_CASE_APPROVED', {
    auditId: latestAudit.id
  })
  if (approvedEvent) {
    throw createError({
      statusCode: 400,
      message: `Déjà approuvé le ${approvedEvent.performedAt.toLocaleDateString('fr-FR')}`,
    })
  }

  // 3. Mettre à jour le statut
  const newStatus = entity.oeId ? AuditStatus.PLANNING : AuditStatus.PENDING_OE_CHOICE
  await db.update(audits)
    .set(forUpdate(event, { status: newStatus }))
    .where(eq(audits.id, latestAudit.id))

  // 4. Enregistrer l'événement
  await recordEvent(event, {
    type: 'AUDIT_CASE_APPROVED',
    auditId: latestAudit.id,
    entityId: latestAudit.entityId,
    metadata: {
      previousStatus: latestAudit.status,
      newStatus: newStatus,
      timestamp: new Date(),
    },
  })

  // 5. Récupérer l'audit mis à jour
  const updatedAudit = await db.query.audits.findFirst({
    where: eq(audits.id, latestAudit.id),
  })

  // 6. Créer les actions pour le nouveau statut
  await createActionsForAuditStatus(updatedAudit, newStatus, event)

  // 7. Auto-compléter les actions basées sur les événements
  await checkAndCompleteAllPendingActions(updatedAudit, currentUser.id, event)

  return { data: updatedAudit }
})
```

### 7.2 Validation de plan correctif avec événement

**Endpoint : `server/api/audits/[id]/validate-corrective-plan.put.ts`**

```typescript
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const auditId = Number(event.context.params?.id)

  // 1. Récupérer l'audit
  const audit = await db.query.audits.findFirst({
    where: eq(audits.id, auditId),
  })

  // 2. Vérifier que le plan n'est pas déjà validé (guard basé sur événement)
  const validatedEvent = await getLatestEvent('AUDIT_CORRECTIVE_PLAN_VALIDATED', {
    auditId: audit.id
  })
  if (validatedEvent) {
    throw createError({
      statusCode: 400,
      message: 'Le plan d\'action correctif a déjà été validé',
    })
  }

  // 3. Mettre à jour le statut
  await db.update(audits)
    .set({
      status: 'PENDING_OE_OPINION',
      updatedBy: user.id,
      updatedAt: new Date(),
    })
    .where(eq(audits.id, auditId))

  // 4. Enregistrer l'événement de validation
  await recordEvent(event, {
    type: 'AUDIT_CORRECTIVE_PLAN_VALIDATED',
    auditId: auditId,
    entityId: audit.entityId,
    metadata: {
      previousStatus: audit.status,
      newStatus: 'PENDING_OE_OPINION',
      timestamp: new Date(),
    },
  })

  // 5. Créer les actions pour la nouvelle étape
  await createActionsForAuditStatus(audit, 'PENDING_OE_OPINION', event)

  // 6. Auto-compléter les actions
  await checkAndCompleteAllPendingActions(audit, user.id, event)

  return { data: audit }
})
```

---

## 8. Bonnes Pratiques

### 8.1 Nommage des types d'événements

✅ **Bon** : Nom descriptif au passé composé
```typescript
'AUDIT_CASE_SUBMITTED'       // Le dossier a été soumis
'CONTRACT_ENTITY_SIGNED'     // Le contrat a été signé par l'entité
'AUDIT_FEEF_DECISION_ACCEPTED' // La décision FEEF a été acceptée
```

❌ **Mauvais** : Verbe à l'infinitif ou présent
```typescript
'SUBMIT_CASE'       // Pas clair
'SIGNING_CONTRACT'  // Présent continu, ambigu
```

### 8.2 Métadonnées flexibles

✅ **Bon** : Stocker le contexte pertinent
```typescript
metadata: {
  score: 85,
  opinion: 'FAVORABLE',
  argumentaire: 'Très bon niveau de conformité...',
  conditions: 'Maintenir la formation continue',
  timestamp: new Date(),
}
```

❌ **Mauvais** : Duplication de données déjà en DB
```typescript
metadata: {
  auditId: 123,        // Déjà dans event.auditId
  performedBy: 2,      // Déjà dans event.performedBy
}
```

### 8.3 Ordre d'exécution dans les endpoints

```typescript
// 1. Validations (basées sur événements si possible)
const existingEvent = await getLatestEvent(...)
if (existingEvent) throw createError(...)

// 2. Mise à jour DB (champs métier uniquement)
await db.update(...).set({ status: ... })

// 3. Enregistrement de l'événement
await recordEvent(event, { type: ..., metadata: ... })

// 4. Récupération de l'entité mise à jour
const updated = await db.query....findFirst(...)

// 5. Gestion des actions
await createActionsForStatus(...)
await checkAndCompleteAllPendingActions(...)

// 6. Retour de la réponse
return { data: updated }
```

### 8.4 Gestion des erreurs

```typescript
try {
  await recordEvent(event, { ... })
} catch (error) {
  console.error('[ENDPOINT] Erreur enregistrement événement:', error)
  // Ne pas bloquer le workflow si l'événement échoue
  // L'utilisateur peut toujours continuer
}
```

### 8.5 Tests et debugging

**Vérifier les événements dans la DB** :
```sql
-- Derniers événements d'un audit
SELECT e.*, a.firstname, a.lastname
FROM events e
JOIN accounts a ON e.performed_by = a.id
WHERE e.audit_id = 123
ORDER BY e.performed_at DESC
LIMIT 20;

-- Compter les événements par type
SELECT type, category, COUNT(*) as count
FROM events
GROUP BY type, category
ORDER BY count DESC;

-- Timeline complète d'une entité
SELECT e.*, a.firstname, a.lastname
FROM events e
JOIN accounts a ON e.performed_by = a.id
WHERE e.entity_id = 45
   OR e.audit_id IN (SELECT id FROM audits WHERE entity_id = 45)
   OR e.contract_id IN (SELECT id FROM contracts WHERE entity_id = 45)
ORDER BY e.performed_at DESC;
```

---

## 9. Migration et Compatibilité

### 9.1 État actuel

✅ **Phase 3 terminée** - Système 100% basé sur les événements

- Anciens champs `*At/*By` supprimés du schéma
- Tous les endpoints écrivent uniquement dans `events`
- Tous les guards, validations, dashboard utilisent les événements

### 9.2 Données historiques

⚠️ **Les données antérieures à la migration ne sont PAS dans `events`**

Si besoin d'accéder aux anciennes données (avant migration) :
- Les colonnes ont été supprimées → données perdues
- Pas de backfill prévu (selon décision initiale du plan)

### 9.3 Ajout d'un nouveau type d'événement

**Étapes** :

1. Ajouter le type dans l'enum (`server/database/schema.ts`) :
   ```typescript
   export const eventTypeEnum = pgEnum('event_type', [
     // ... types existants
     'AUDIT_NEW_EVENT_TYPE', // Nouveau type
   ])
   ```

2. Générer la migration :
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

3. Ajouter la définition dans le registre (`server/services/events.ts`) :
   ```typescript
   export const EVENT_TYPE_REGISTRY: Record<string, EventTypeDefinition> = {
     // ... types existants
     AUDIT_NEW_EVENT_TYPE: {
       type: 'AUDIT_NEW_EVENT_TYPE',
       category: 'AUDIT',
       requiredReferences: ['auditId', 'entityId'],
     },
   }
   ```

4. Utiliser dans l'endpoint :
   ```typescript
   await recordEvent(event, {
     type: 'AUDIT_NEW_EVENT_TYPE',
     auditId: audit.id,
     entityId: entity.id,
     metadata: { ... },
   })
   ```

5. Mettre à jour le composant Timeline (`AuditTimeline.vue`) :
   ```typescript
   const iconMap: Record<string, string> = {
     // ... icônes existantes
     AUDIT_NEW_EVENT_TYPE: 'i-lucide-star',
   }

   const titleMap: Record<string, string> = {
     // ... titres existants
     AUDIT_NEW_EVENT_TYPE: 'Nouveau type d\'événement',
   }
   ```

---

## 10. Diagramme de Flux

```
┌─────────────────┐
│  USER ACTION    │  (ex: Soumettre dossier)
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  ENDPOINT                                    │
│  server/api/entities/[id]/submit-case.post  │
├─────────────────────────────────────────────┤
│  1. Validation (guards basés sur events)    │
│  2. Update DB (champs métier)               │
│  3. recordEvent()                           │
│  4. createActionsForStatus()                │
│  5. checkAndCompleteAllPendingActions()     │
└────────┬──────────────┬─────────────────────┘
         │              │
         │              ▼
         │         ┌──────────────┐
         │         │   ACTIONS    │
         │         │  (Tâches)    │
         │         └──────────────┘
         │
         ▼
┌─────────────────────┐
│  EVENTS TABLE       │
│  (Historique)       │
├─────────────────────┤
│  • Immuable         │
│  • Timeline         │
│  • Audit trail      │
└────────┬────────────┘
         │
         ├──────────┬──────────────┬────────────┐
         │          │              │            │
         ▼          ▼              ▼            ▼
    ┌────────┐ ┌─────────┐  ┌──────────┐ ┌──────────┐
    │ Guards │ │ Validat.│  │ Dashboard│ │ Timeline │
    │(State  │ │  API    │  │  Stats   │ │   UI     │
    │Machine)│ │         │  │          │ │          │
    └────────┘ └─────────┘  └──────────┘ └──────────┘
```

---

## 11. Références

- **Schéma** : `server/database/schema.ts` (table `events`, enums, relations)
- **Service** : `server/services/events.ts` (fonctions helper)
- **Guards** : `server/state-machine/guards.ts` (utilisation de `hasEventOccurred()`)
- **Dashboard** : `server/api/dashboard/overview.get.ts` (queries SQL avec subqueries)
- **Endpoints API** :
  - `server/api/audits/[id]/events.get.ts`
  - `server/api/entities/[id]/timeline.get.ts`
- **Composant** : `app/components/AuditTimeline.vue`
- **Documentation State Machine** : `server/state-machine/README.md`

---

**Dernière mise à jour** : Décembre 2025
