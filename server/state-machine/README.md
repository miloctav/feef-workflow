# Audit State Machine

Ce dossier contient l'implémentation de la **state machine** (machine à états) qui gère toutes les transitions de statuts d'audit dans l'application FEEF Workflow.

## Vue d'ensemble

La state machine centralise toute la logique de gestion des statuts d'audit, remplaçant l'ancienne approche dispersée dans plusieurs fichiers. Elle garantit que toutes les transitions de statuts sont valides, exécute automatiquement les actions associées, et facilite grandement l'ajout de nouveaux statuts.

**12 statuts d'audit** sont gérés, incluant la gestion de l'audit complémentaire (phase 2) pour les cas où le plan d'action correctif nécessite une vérification supplémentaire.

## Architecture

### Fichiers

- **`types.ts`** : Définit toutes les interfaces TypeScript utilisées par la state machine
- **`guards.ts`** : Contient les prédicats (guards) qui vérifient si une transition est autorisée
- **`actions.ts`** : Contient les side-effects (actions) exécutés lors des transitions
- **`config.ts`** : **FICHIER CENTRAL** - Configuration complète de tous les statuts et transitions
- **`engine.ts`** : Moteur d'exécution qui orchestre les transitions
- **`index.ts`** : Point d'entrée public exportant l'API de la state machine

### Principes de fonctionnement

La state machine suit ces principes :

1. **Déclaratif** : Toute la logique est définie dans `config.ts` de manière déclarative
2. **Type-safe** : TypeScript garantit la cohérence des types partout
3. **Extensible** : Ajouter un statut = modifier uniquement 2 fichiers (schema + config)
4. **Testable** : Chaque composant (guards, actions, engine) est isolé et testable
5. **Non-blocking** : Les erreurs dans les side-effects n'empêchent pas les transitions

## Utilisation

### Exécuter une transition manuelle

```typescript
import { auditStateMachine } from '~/server/state-machine'

// Dans un endpoint API
await auditStateMachine.transition(audit, AuditStatus.SCHEDULED, event)
```

### Vérifier les auto-transitions

```typescript
// Après une mise à jour de champ ou complétion d'action
await auditStateMachine.checkAutoTransition(audit, event, actionType)
```

### Exemple complet dans un endpoint

```typescript
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  // Récupérer l'audit
  const audit = await db.query.audits.findFirst({
    where: eq(audits.id, auditId)
  })

  // Transition manuelle
  if (newStatus) {
    await auditStateMachine.transition(audit, newStatus, event)
  }

  // Mettre à jour d'autres champs
  await db.update(audits)
    .set({ actualEndDate: '2025-12-31' })
    .where(eq(audits.id, auditId))

  // Vérifier auto-transitions après update
  const updatedAudit = await db.query.audits.findFirst({
    where: eq(audits.id, auditId)
  })
  await auditStateMachine.checkAutoTransition(updatedAudit, event)

  return { data: updatedAudit }
})
```

## Configuration des statuts

Tous les statuts sont définis dans `config.ts`. Voici la structure :

```typescript
{
  states: {
    [AuditStatus.PLANNING]: {
      status: AuditStatus.PLANNING,

      // Actions à créer lors de l'entrée dans ce statut
      onEnter: {
        createActions: [
          ActionType.SET_AUDIT_DATES,
          ActionType.UPLOAD_AUDIT_PLAN
        ],
        executeActions: ['check_if_action_plan_needed']
      },

      // Actions à exécuter lors de la sortie
      onExit: {
        executeActions: ['cleanup_temp_data']
      },

      // Transitions possibles depuis ce statut
      transitions: {
        to_scheduled: {
          target: AuditStatus.SCHEDULED,
          guards: ['has_audit_plan', 'has_actual_dates', 'end_date_is_future'],
          trigger: 'AUTO_DOCUMENT',
          triggerOnActions: [ActionType.UPLOAD_AUDIT_PLAN, ActionType.SET_AUDIT_DATES],
          description: 'Plan uploadé + dates définies + date future'
        }
      }
    }
  }
}
```

### Types de triggers

- **`MANUAL`** : Transition déclenchée manuellement via API (changement de statut explicite)
- **`AUTO_DOCUMENT`** : Transition automatique lors d'un upload de document ou complétion d'action
- **`AUTO_CRON`** : Transition automatique via cron job (basé sur le temps)

## Guards (Prédicats)

Les guards sont des fonctions qui vérifient si une transition est autorisée.

### Guards disponibles

| Guard | Description |
|-------|-------------|
| `has_oe_assigned` | Vérifie si un OE est assigné |
| `no_oe_assigned` | Vérifie qu'aucun OE n'est assigné |
| `has_audit_plan` | Vérifie qu'un plan d'audit est uploadé |
| `has_actual_dates` | Vérifie que les dates réelles sont définies |
| `end_date_is_future` | Vérifie que la date de fin est dans le futur |
| `actual_end_date_passed` | Vérifie que la date de fin est passée |
| `has_report_document` | Vérifie qu'un rapport d'audit existe |
| `has_global_score` | Vérifie que le score global est défini |
| `needs_action_plan` | Vérifie si un plan d'action est nécessaire |
| `no_action_plan_uploaded` | Vérifie qu'aucun plan d'action n'est uploadé |
| `has_action_plan_document` | Vérifie qu'un plan d'action est uploadé |
| `action_plan_validated` | Vérifie que le plan d'action est validé |
| `has_oe_opinion` | Vérifie que l'avis OE est transmis |
| `has_feef_decision` | Vérifie que la décision FEEF est prise |
| `requires_oe_acceptance` | Vérifie si l'OE doit accepter l'audit (INITIAL/RENEWAL) |
| `is_monitoring_audit` | Vérifie si c'est un audit de surveillance (MONITORING) |
| `oe_has_accepted` | Vérifie que l'OE a accepté l'audit |
| `oe_has_refused` | Vérifie que l'OE a refusé l'audit |
| `action_plan_refused` | Vérifie que le plan d'action a été refusé (événement AUDIT_CORRECTIVE_PLAN_REFUSED) |
| `complementary_audit_requested` | Vérifie qu'un audit complémentaire a été demandé (événement AUDIT_COMPLEMENTARY_REQUESTED) |
| `no_previous_complementary_audit` | Vérifie qu'aucun audit complémentaire n'a été fait (hasComplementaryAudit = false) |
| `has_complementary_report` | Vérifie qu'un rapport d'audit complémentaire existe (complementaryGlobalScore défini) |
| `has_complementary_global_score` | Vérifie que le score global complémentaire est défini |

### Ajouter un nouveau guard

1. Créer la fonction dans `guards.ts` :

```typescript
export async function myNewGuard(audit: Audit): Promise<boolean> {
  // Votre logique de vérification
  return audit.someField !== null
}
```

2. L'enregistrer dans `config.ts` :

```typescript
guards: {
  // ... autres guards
  my_new_guard: guards.myNewGuard,
}
```

3. L'utiliser dans une transition :

```typescript
transitions: {
  my_transition: {
    target: AuditStatus.SOME_STATUS,
    guards: ['my_new_guard'],
    // ...
  }
}
```

## Actions (Side-effects)

Les actions sont des fonctions qui exécutent des effets de bord lors des transitions.

### Actions disponibles

| Action | Description |
|--------|-------------|
| `check_if_action_plan_needed` | Recalcule si un plan d'action est nécessaire |
| `calculate_label_expiration` | Calcule la date d'expiration du label (+1 an) |
| `reset_entity_workflow` | Réinitialise les champs de workflow de l'entité |
| `generate_attestation` | Génère l'attestation de labellisation (manuel uniquement) |
| `create_new_audit_after_refusal` | Crée un nouvel audit après le refus de l'OE |
| `mark_complementary_audit_started` | Marque le début de l'audit complémentaire (hasComplementaryAudit = true) |
| `check_if_action_plan_needed_phase2` | Vérifie le type de plan d'action nécessaire pour la phase 2 (utilise complementaryGlobalScore) |

### Ajouter une nouvelle action

1. Créer la fonction dans `actions.ts` :

```typescript
export async function myNewAction(audit: Audit, event: H3Event): Promise<void> {
  // Votre logique de side-effect
  await db.update(something)...
}
```

2. L'enregistrer dans `config.ts` :

```typescript
actions: {
  // ... autres actions
  my_new_action: actions.myNewAction,
}
```

3. L'utiliser dans une transition ou un état :

```typescript
transitions: {
  my_transition: {
    target: AuditStatus.SOME_STATUS,
    actions: ['my_new_action'],
    // ...
  }
}

// OU

onEnter: {
  executeActions: ['my_new_action']
}
```

## Statuts terminaux

Certains statuts sont des états finaux sans transitions sortantes :

| Statut | Description |
|--------|-------------|
| `COMPLETED` | Audit terminé avec succès, certificat émis |
| `REFUSED_BY_OE` | Audit refusé par l'OE avant planification |
| `REFUSED_PLAN` | Plan d'action correctif refusé définitivement après audit complémentaire |

## Ajouter un nouveau statut

Voici la procédure complète pour ajouter un nouveau statut entre deux statuts existants.

### Exemple : Ajouter "PENDING_TECHNICAL_REVIEW" entre PENDING_REPORT et PENDING_OE_OPINION

#### Étape 1 : Modifier le schéma de base de données

```typescript
// server/database/schema.ts
export const auditStatusEnum = pgEnum('audit_status', [
  // ... statuts existants
  'PENDING_REPORT',
  'PENDING_TECHNICAL_REVIEW', // 🆕
  'PENDING_OE_OPINION',
  // ... autres statuts
])
```

#### Étape 2 : Ajouter dans les types partagés

```typescript
// shared/types/enums.ts
export const AuditStatus = {
  // ... statuts existants
  PENDING_REPORT: 'PENDING_REPORT',
  PENDING_TECHNICAL_REVIEW: 'PENDING_TECHNICAL_REVIEW', // 🆕
  PENDING_OE_OPINION: 'PENDING_OE_OPINION',
  // ... autres statuts
}

export const AUDIT_STATUS_LABELS = {
  // ... labels existants
  [AuditStatus.PENDING_TECHNICAL_REVIEW]: 'En attente de revue technique', // 🆕
  // ... autres labels
}
```

#### Étape 3 : Configurer dans la state machine

```typescript
// server/state-machine/config.ts

// Modifier l'état PENDING_REPORT
[AuditStatus.PENDING_REPORT]: {
  // ...
  transitions: {
    to_pending_opinion: { // 🆕 Nouvelle transition
      target: AuditStatus.PENDING_OE_OPINION,
      guards: ['has_report_document', 'has_global_score'],
      trigger: 'AUTO_DOCUMENT',
      triggerOnActions: [ActionType.UPLOAD_AUDIT_REPORT],
      description: 'Rapport uploadé + score défini'
    }
  }
},
```

#### Étape 4 : Ajouter les guards nécessaires (si nouveau)

Si vous avez besoin de nouveaux guards, ajoutez-les dans `guards.ts` et enregistrez-les dans `config.ts`.

#### Étape 5 : Générer et appliquer la migration

```bash
npm run db:generate  # Génère la migration
npm run db:migrate   # Applique la migration
```

**C'est tout !** Le reste du système s'adapte automatiquement.

### Exemple réel : Configuration de PENDING_COMPLEMENTARY_AUDIT

Voici la configuration complète du statut d'audit complémentaire ajouté récemment :

```typescript
// server/state-machine/config.ts

[AuditStatus.PENDING_COMPLEMENTARY_AUDIT]: {
  status: AuditStatus.PENDING_COMPLEMENTARY_AUDIT,
  onEnter: {
    createActions: [
      ActionType.SET_COMPLEMENTARY_AUDIT_DATES,
      ActionType.UPLOAD_COMPLEMENTARY_REPORT
    ]
  },
  transitions: {
    to_pending_opinion: {
      target: AuditStatus.PENDING_OE_OPINION,
      guards: ['has_complementary_report', 'has_complementary_global_score'],
      trigger: 'AUTO_DOCUMENT',
      triggerOnActions: [ActionType.UPLOAD_COMPLEMENTARY_REPORT],
      actions: ['check_if_action_plan_needed_phase2'],
      description: 'Rapport complémentaire uploadé + score phase 2 défini'
    }
  }
}
```

Cette configuration :
1. Crée automatiquement 2 actions lors de l'entrée dans le statut (dates + rapport)
2. Définit une transition automatique vers `PENDING_OE_OPINION` quand le rapport est uploadé
3. Exécute l'action `check_if_action_plan_needed_phase2` pour recalculer le type de plan d'action

## Diagramme de flux complet

```
                        PENDING_CASE_APPROVAL
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ↓                 ↓                 ↓
       PENDING_OE_CHOICE  PENDING_OE_ACCEPTANCE  PLANNING
              │                 │              (monitoring)
              │            ┌────┴────┐
              │            ↓         ↓
              │        PLANNING  REFUSED_BY_OE
              │            │       (terminal)
              └────────────┘
                     │
                ┌────┴────┐
                ↓         ↓
            SCHEDULED → PENDING_REPORT
                        │
                        ↓
                PENDING_OE_OPINION ←─────────────────────┐
                        │                                │
           ┌────────────┼────────────┐                   │
           │            │            │                   │
           ↓            ↓            ↓                   │
    PENDING_FEEF_  (plan OK)  PENDING_CORRECTIVE_PLAN    │
    DECISION                        │                    │
           │                        ↓                    │
           │       PENDING_CORRECTIVE_PLAN_VALIDATION    │
           │            │           │           │        │
           │            │           │           │        │
           │            ↓           ↓           ↓        │
           │      (plan validé) REFUSED_PLAN PENDING_COMPLEMENTARY_AUDIT
           │            │        (terminal)              │
           │            │                                │
           │            └────────────────────────────────┘
           │
           ↓
        COMPLETED
```

### Flux de l'audit complémentaire (Phase 2)

L'audit complémentaire est déclenché lorsqu'un plan d'action correctif nécessite une vérification sur site :

1. **Déclenchement** : Depuis `PENDING_CORRECTIVE_PLAN_VALIDATION`, l'OE/FEEF peut demander un audit complémentaire (une seule fois par audit)
2. **Phase 2** : L'audit passe en `PENDING_COMPLEMENTARY_AUDIT` où l'auditeur définit les dates et effectue l'audit
3. **Rapport complémentaire** : Un rapport avec score complémentaire (`complementaryGlobalScore`) est uploadé
4. **Retour au flux** : L'audit retourne en `PENDING_OE_OPINION` avec le score de la phase 2

**Note** : Si après l'audit complémentaire un plan d'action est encore nécessaire (score < 65 ou notation C/D), le plan est automatiquement refusé (`REFUSED_PLAN`) car un seul audit complémentaire est autorisé.

## Tests

Pour tester la state machine, créez des tests unitaires pour :

1. **Guards** : Vérifier que chaque guard retourne true/false correctement
2. **Actions** : Vérifier que chaque action exécute les bons side-effects
3. **Engine** : Vérifier que les transitions sont exécutées correctement
4. **Scénarios complets** : Tester des flux complets de bout en bout

Exemple de test :

```typescript
// server/state-machine/__tests__/guards.test.ts
import { describe, it, expect } from 'vitest'
import { hasAuditPlan } from '../guards'

describe('hasAuditPlan', () => {
  it('retourne true quand un plan existe', async () => {
    const audit = { id: 1, entityId: 10 }
    // Mock DB query pour retourner un document
    expect(await hasAuditPlan(audit as any)).toBe(true)
  })

  it('retourne false quand aucun plan n\'existe', async () => {
    const audit = { id: 1, entityId: 10 }
    // Mock DB query pour retourner null
    expect(await hasAuditPlan(audit as any)).toBe(false)
  })
})
```

## Avantages de cette architecture

✅ **Centralisation** : Toute la logique dans un seul fichier (`config.ts`)
✅ **Extensibilité** : Ajout d'un statut = 2 fichiers à modifier
✅ **Maintenabilité** : Code déclaratif facile à lire et comprendre
✅ **Testabilité** : Chaque composant isolé et testable
✅ **Documentation vivante** : La configuration EST la documentation
✅ **Sécurité** : Impossible de faire une transition non autorisée
✅ **Type-safety** : TypeScript complet partout

## Dépannage

### Erreur "État non trouvé"

Vérifiez que le statut existe bien dans `config.ts` avec la bonne clé.

### Erreur "Guard échoué"

Vérifiez que les guards de la transition sont satisfaits en loggant leur résultat.

### Erreur "Transition non autorisée"

Vérifiez qu'une transition existe bien entre le statut actuel et le statut cible dans `config.ts`.

### Auto-transition ne se déclenche pas

Vérifiez que :
1. Le trigger est `AUTO_DOCUMENT`
2. Les `triggerOnActions` incluent bien le type d'action complété
3. Tous les guards sont satisfaits

## Migration depuis l'ancien système

L'ancienne approche dispersée a été remplacée par la state machine :

| Ancien fichier | Remplacé par |
|----------------|--------------|
| `auditStatusHandlers.ts` | `state-machine/actions.ts` |
| `auditWorkflow.ts` | `state-machine/config.ts` |
| `auditReportTransition.ts` | `state-machine/guards.ts` |

Tous les endpoints ont été modifiés pour utiliser `auditStateMachine.transition()` au lieu de modifier directement le statut.
