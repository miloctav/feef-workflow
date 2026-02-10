# Notifications par email

## Vue d'ensemble

Lorsqu'une **action** est créée dans le système (via la state machine d'audit ou manuellement), le système :

1. **Enregistre une notification en BDD** pour chaque destinataire concerné (toujours)
2. **Envoie un email** aux destinataires qui ont activé les notifications email (opt-in par défaut)

L'envoi est **non-bloquant** : si l'email échoue, l'action est quand même créée.

## Flux complet

```
createAction()
  │
  ├─ Insert action en BDD
  │
  └─ notifyActionCreated()          ← fire-and-forget (.catch)
       │
       ├─ Lookup ACTION_TYPE_REGISTRY → titre, description, rôles assignés
       ├─ Fetch nom de l'entité
       ├─ findActionRecipients()     → tous les comptes actifs concernés
       │
       └─ Pour chaque destinataire :
            ├─ INSERT notification en BDD (toujours)
            └─ Si emailNotificationsEnabled && envoi autorisé :
                 ├─ Construire l'URL adaptée au rôle
                 ├─ sendActionCreatedEmail() via Resend
                 └─ Mettre emailSent = true sur la notification
```

## Résolution des destinataires

Le service `notification-recipients.ts` détermine qui reçoit la notification selon les rôles définis dans `ACTION_TYPE_REGISTRY.assignedRoles` :

| Rôle | Logique de résolution |
|------|----------------------|
| **FEEF** | Tous les comptes avec `role='FEEF'`, actifs, non supprimés |
| **ENTITY** | Comptes liés à l'entité via la table `accounts_to_entities` |
| **OE** | Comptes `role='OE'` dont le `oeId` correspond à l'OE de l'audit |
| **AUDITOR** | Le compte `auditorId` assigné à l'audit |

Les destinataires sont dédupliqués par `account.id` (un compte ne reçoit qu'une seule notification même s'il est concerné par plusieurs rôles).

**Important** : le filtre `emailNotificationsEnabled` n'est PAS appliqué ici. Tous les comptes actifs reçoivent une notification en BDD. Le filtre email se fait au moment de l'envoi.

## Conditions d'envoi d'email

Un email est envoyé uniquement si **toutes** ces conditions sont remplies :

1. `account.emailNotificationsEnabled = true` (préférence utilisateur, activée par défaut)
2. `devMode = false` **OU** `devMailOverride` est configuré

En développement avec `devMode=true` et sans `NUXT_DEV_MAIL_OVERRIDE`, aucun email n'est envoyé (les notifications BDD sont toujours créées).

## Dev mail override

Pour tester les emails en développement sans envoyer aux vrais destinataires :

```bash
# .env
NUXT_DEV_MAIL_OVERRIDE=votre@email.com
```

Tous les emails seront redirigés vers cette adresse, quel que soit le destinataire réel. Le log affiche la redirection :

```
[Mail Service] Dev override: destinataire@reel.com -> votre@email.com
```

## URL dans l'email

L'URL du bouton "Voir l'action" est adaptée au rôle du destinataire :

| Rôle | URL (avec audit) | URL (sans audit) |
|------|-------------------|------------------|
| FEEF | `/feef/audits/{auditId}` | `/feef/entities/{entityId}` |
| OE | `/oe/audits/{auditId}` | `/oe/entities/{entityId}` |
| AUDITOR | `/auditor/audits/{auditId}` | — |
| ENTITY | `/entity/audits/{auditId}` | `/entity` |

## Table `notifications`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | serial | PK |
| `account_id` | integer | Destinataire (FK accounts, cascade delete) |
| `type` | varchar(50) | `'action_created'`, `'action_reminder'`, etc. |
| `title` | varchar(500) | Titre affiché |
| `description` | text | Description optionnelle |
| `entity_id` | integer | FK entities (optionnel) |
| `audit_id` | integer | FK audits (optionnel) |
| `action_id` | integer | FK actions (optionnel) |
| `read_at` | timestamp | `null` = non lue, sinon date de lecture |
| `email_sent` | boolean | `true` si l'email a bien été envoyé |
| `metadata` | json | Données extensibles (ex: `{ actionType }`) |
| `created_at` | timestamp | Date de création |

Index : `account_id`, `(account_id, read_at)`, `created_at`.

## Préférence utilisateur

Chaque compte a une colonne `email_notifications_enabled` (défaut `true`).

- Modifiable par l'utilisateur via la page **Mon compte**
- Modifiable par API : `PUT /api/accounts/:id` avec `{ emailNotificationsEnabled: false }`
- Désactiver les emails n'empêche **pas** la création de notifications en BDD (elles restent visibles dans l'application)

## Templates email

Les templates HTML sont dans `server/services/mail/templates/` :

- **`action-created.ts`** : notification de nouvelle action assignée (header bleu, titre, description, entité, deadline, bouton CTA)
- **`action-reminder.ts`** : rappel de deadline (accent orange, jours restants) — template prêt, pas encore déclenché par un cron

## API notifications

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/notifications` | GET | Liste paginée (`page`, `limit`, `unreadOnly`) |
| `/api/notifications/:id` | PUT | Marquer une notification comme lue |
| `/api/notifications/read-all` | PUT | Marquer toutes les non-lues comme lues |

## Fichiers clés

```
server/
  services/
    notifications.ts              ← Orchestration (crée notif + envoie email)
    notification-recipients.ts    ← Résolution des destinataires par rôle
    actions.ts                    ← Appelle notifyActionCreated() après création
    mail/
      index.ts                   ← sendActionCreatedEmail(), dev override
      templates/
        action-created.ts        ← Template HTML email
        action-reminder.ts       ← Template HTML rappel (futur)
  api/
    notifications/
      index.get.ts               ← Liste paginée
      [id].put.ts                ← Marquer lu
      read-all.put.ts            ← Marquer tout lu
  database/
    schema.ts                    ← Table notifications + emailNotificationsEnabled
app/
  composables/
    useNotifications.ts          ← Composable partagé (badge + pages)
```
