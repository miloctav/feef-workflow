# Service d'envoi d'emails avec Resend

Ce dossier contient le système d'envoi d'emails de l'application FEEF Workflow utilisant [Resend](https://resend.com).

## Structure

```
server/services/mail/
├── index.ts                    # Service principal d'envoi d'emails
├── templates/
│   └── account-creation.ts     # Template d'email de création de compte
└── README.md                   # Cette documentation
```

## Configuration

### 1. Variables d'environnement

Ajoutez ces variables dans votre fichier `.env` :

```env
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=FEEF Workflow <noreply@your-domain.com>
```

### 2. Obtenir une clé API Resend

1. Créez un compte sur [resend.com](https://resend.com)
2. Vérifiez votre domaine ou utilisez un domaine de test
3. Générez une clé API dans les paramètres
4. Copiez la clé dans votre `.env`

## Utilisation

### Envoyer un email de création de compte

```typescript
import { sendAccountCreationEmail } from '~/server/services/mail'

// Dans votre endpoint API ou fonction server
const result = await sendAccountCreationEmail({
  email: 'user@example.com',
  firstName: 'Jean',
  lastName: 'Dupont',
  role: 'Évaluateur',
  resetPasswordUrl: 'https://feef-workflow.com/reset-password?token=abc123',
  expiresInHours: 48
})

if (result.success) {
  console.log('Email envoyé avec succès:', result.id)
} else {
  console.error('Erreur lors de l\'envoi:', result.error)
}
```

### Exemple complet dans une route API

```typescript
// server/api/accounts/create.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // 1. Créer l'utilisateur dans la base de données
  const user = await db.insert(users).values({
    email: body.email,
    firstName: body.firstName,
    lastName: body.lastName,
    role: body.role
  }).returning()

  // 2. Générer un token de réinitialisation
  const resetToken = generateResetToken()
  const resetUrl = `${getRequestURL(event).origin}/reset-password?token=${resetToken}`

  // 3. Envoyer l'email
  const emailResult = await sendAccountCreationEmail({
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    resetPasswordUrl: resetUrl,
    expiresInHours: 48
  })

  if (!emailResult.success) {
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de l\'envoi de l\'email'
    })
  }

  return { success: true, user }
})
```

## Créer un nouveau template d'email

### 1. Définir le type dans `server/types/mail.ts`

```typescript
// Ajouter le type d'email
export type EmailType =
  | 'account-creation'
  | 'audit-reminder'  // ← Nouveau type

// Définir la structure des données
export interface AuditReminderEmailData {
  email: string
  companyName: string
  auditDate: string
  evaluatorName: string
}
```

### 2. Créer le template dans `server/services/mail/templates/`

```typescript
// server/services/mail/templates/audit-reminder.ts
import type { EmailTemplate, AuditReminderEmailData } from '~/server/types/mail'

export const auditReminderTemplate: EmailTemplate<AuditReminderEmailData> = {
  type: 'audit-reminder',

  getSubject: (data) => {
    return `Rappel d'audit - ${data.companyName}`
  },

  getHtml: (data) => {
    return `
      <!DOCTYPE html>
      <html>
        <body>
          <h1>Rappel d'audit</h1>
          <p>Bonjour ${data.evaluatorName},</p>
          <p>L'audit de ${data.companyName} est prévu le ${data.auditDate}.</p>
        </body>
      </html>
    `
  }
}
```

### 3. Ajouter une fonction dans `server/services/mail/index.ts`

```typescript
import { auditReminderTemplate } from './templates/audit-reminder'

export async function sendAuditReminderEmail(
  data: AuditReminderEmailData
): Promise<EmailResult> {
  return sendTemplatedEmail(auditReminderTemplate, data)
}

// Mettre à jour l'export
export const mailService = {
  sendAccountCreationEmail,
  sendAuditReminderEmail,  // ← Nouveau
  sendTemplatedEmail,
  sendEmail
}
```

### 4. Utiliser le nouveau template

```typescript
import { sendAuditReminderEmail } from '~/server/services/mail'

const result = await sendAuditReminderEmail({
  email: 'evaluateur@example.com',
  companyName: 'Acme Corp',
  auditDate: '15 novembre 2025',
  evaluatorName: 'Marie Martin'
})
```

## Architecture

### Avantages de cette structure

1. **Séparation des responsabilités**
   - `server/utils/resend.ts` : Client Resend singleton
   - `server/types/mail.ts` : Types TypeScript
   - `server/services/mail/templates/` : Templates HTML
   - `server/services/mail/index.ts` : Logique d'envoi

2. **Réutilisabilité**
   - Templates isolés et testables
   - Fonction générique `sendTemplatedEmail` pour tous les types d'emails
   - Types stricts pour éviter les erreurs

3. **Extensibilité**
   - Ajout facile de nouveaux templates
   - Possibilité d'ajouter des fonctionnalités (pièces jointes, CC/BCC, etc.)

4. **Auto-import Nuxt**
   - Le client `resend` est auto-importé dans tous les fichiers server
   - Les fonctions du service sont importables avec `~/server/services/mail`

## Bonnes pratiques

1. **Toujours vérifier le résultat de l'envoi**
   ```typescript
   const result = await sendAccountCreationEmail(...)
   if (!result.success) {
     // Gérer l'erreur (log, retry, notification admin, etc.)
   }
   ```

2. **Logs en production**
   - Les logs sont automatiquement générés par le service
   - Format : `[Mail Service] Email envoyé avec succès: {id}`

3. **Domaine vérifié**
   - En production, utilisez un domaine vérifié sur Resend
   - En développement, utilisez le domaine de test fourni par Resend

4. **Gestion des erreurs**
   - Le service retourne toujours un objet `EmailResult`
   - Jamais de throw, toujours `{ success: false, error: '...' }`

## Templates disponibles

| Template | Type | Usage |
|----------|------|-------|
| `account-creation` | `AccountCreationEmailData` | Création de compte avec lien de réinitialisation |

## Roadmap

Templates à implémenter pour le workflow FEEF :

- [ ] `password-reset` - Réinitialisation de mot de passe
- [ ] `audit-reminder` - Rappel d'audit planifié
- [ ] `decision-notification` - Notification de décision FEEF
- [ ] `oe-assignment` - Assignation d'un OE à une entreprise
- [ ] `attestation-issued` - Attestation de labellisation disponible
- [ ] `contract-signature-reminder` - Rappel de signature de contrat
- [ ] `document-uploaded` - Notification d'upload de document
