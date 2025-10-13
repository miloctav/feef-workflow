# Exemple d'intégration : Création de compte avec email

Ce fichier montre comment intégrer le service d'emails dans le workflow de création de compte.

## Workflow souhaité

1. **Admin FEEF crée un compte** → Ne fournit PAS de mot de passe
2. **Système génère un token** → Token de réinitialisation sécurisé
3. **Email automatique envoyé** → Lien pour créer le mot de passe
4. **Utilisateur clique** → Page de création de mot de passe
5. **Mot de passe créé** → Compte activé

## 1. Créer le système de tokens

```typescript
// server/utils/tokens.ts
import { randomBytes } from 'crypto'

/**
 * Génère un token de réinitialisation sécurisé
 */
export function generateResetToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Hash un token pour le stocker en base de données
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
```

## 2. Ajouter les champs à la base de données

```sql
-- Migration pour ajouter les tokens de réinitialisation
ALTER TABLE accounts ADD COLUMN reset_token VARCHAR(255);
ALTER TABLE accounts ADD COLUMN reset_token_expires TIMESTAMP;
ALTER TABLE accounts ADD COLUMN is_active BOOLEAN DEFAULT FALSE;
```

```typescript
// server/database/schema.ts
export const accounts = pgTable('accounts', {
  // ... champs existants
  resetToken: text('reset_token'),
  resetTokenExpires: timestamp('reset_token_expires'),
  isActive: boolean('is_active').default(false),
})
```

## 3. Modifier l'API de création de compte

```typescript
// server/api/accounts/index.post.ts
import { sendAccountCreationEmail } from '~/server/services/mail'
import { generateResetToken, hashToken } from '~/server/utils/tokens'

interface CreateAccountBody {
  firstname: string
  lastname: string
  email: string
  // password est maintenant OPTIONNEL
  password?: string
  role: string
  // ... autres champs
}

export default defineEventHandler(async (event) => {
  // ... validation existante

  const { firstname, lastname, email, password, role } = body

  // CHANGEMENT : Si pas de mot de passe, générer un token
  const shouldSendEmail = !password
  let hashedPassword: string | null = null
  let resetToken: string | null = null
  let resetTokenExpires: Date | null = null

  if (password) {
    // Mode classique : l'admin définit le mot de passe
    hashedPassword = await bcrypt.hash(password, 10)
  } else {
    // Mode email : générer un token de réinitialisation
    const token = generateResetToken()
    resetToken = await hashToken(token)
    resetTokenExpires = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48h

    // Mettre un mot de passe temporaire aléatoire (non utilisable)
    hashedPassword = await bcrypt.hash(randomBytes(32).toString('hex'), 10)
  }

  // Créer le compte
  const [newAccount] = await db
    .insert(accounts)
    .values({
      firstname,
      lastname,
      email,
      password: hashedPassword,
      role: role as any,
      resetToken,
      resetTokenExpires,
      isActive: !!password, // Actif seulement si mot de passe fourni
      // ... autres champs
    })
    .returning()

  // NOUVEAU : Envoyer l'email si pas de mot de passe
  if (shouldSendEmail && resetToken) {
    const resetUrl = `${getRequestURL(event).origin}/reset-password?token=${resetToken}`

    const emailResult = await sendAccountCreationEmail({
      email: newAccount.email,
      firstName: newAccount.firstname,
      lastName: newAccount.lastname,
      role: getRoleName(newAccount.role), // Fonction pour formater le rôle
      resetPasswordUrl: resetUrl,
      expiresInHours: 48
    })

    if (!emailResult.success) {
      console.error('Erreur envoi email:', emailResult.error)
      // Ne pas bloquer la création de compte, mais logger l'erreur
      // En production, vous pourriez vouloir notifier un admin
    }
  }

  return {
    account: newAccount,
    emailSent: shouldSendEmail
  }
})

// Fonction helper pour formater les rôles
function getRoleName(role: string): string {
  const roleNames = {
    'FEEF': 'Administrateur FEEF',
    'EVALUATOR_ORGANIZATION': 'Organisme Évaluateur',
    'AUDITOR': 'Auditeur',
    'ENTITY': 'Entreprise'
  }
  return roleNames[role] || role
}
```

## 4. Créer l'API de réinitialisation de mot de passe

```typescript
// server/api/auth/reset-password.post.ts
import bcrypt from 'bcrypt'
import { hashToken } from '~/server/utils/tokens'

interface ResetPasswordBody {
  token: string
  password: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ResetPasswordBody>(event)
  const { token, password } = body

  // Valider les données
  if (!token || !password) {
    throw createError({
      statusCode: 400,
      message: 'Token et mot de passe requis'
    })
  }

  if (password.length < 8) {
    throw createError({
      statusCode: 400,
      message: 'Le mot de passe doit contenir au moins 8 caractères'
    })
  }

  // Hasher le token pour le comparer avec celui en base
  const hashedToken = await hashToken(token)

  // Trouver l'utilisateur avec ce token
  const [user] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.resetToken, hashedToken))
    .limit(1)

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'Token invalide ou expiré'
    })
  }

  // Vérifier que le token n'a pas expiré
  if (user.resetTokenExpires && new Date() > user.resetTokenExpires) {
    throw createError({
      statusCode: 400,
      message: 'Le token a expiré. Demandez un nouveau lien.'
    })
  }

  // Hasher le nouveau mot de passe
  const hashedPassword = await bcrypt.hash(password, 10)

  // Mettre à jour le compte
  await db
    .update(accounts)
    .set({
      password: hashedPassword,
      resetToken: null,
      resetTokenExpires: null,
      isActive: true
    })
    .where(eq(accounts.id, user.id))

  return {
    success: true,
    message: 'Mot de passe créé avec succès'
  }
})
```

## 5. Créer la page frontend de réinitialisation

```vue
<!-- app/pages/reset-password.vue -->
<script setup lang="ts">
const route = useRoute()
const token = computed(() => route.query.token as string)

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)

async function handleSubmit() {
  error.value = ''

  // Validation
  if (password.value !== confirmPassword.value) {
    error.value = 'Les mots de passe ne correspondent pas'
    return
  }

  if (password.value.length < 8) {
    error.value = 'Le mot de passe doit contenir au moins 8 caractères'
    return
  }

  loading.value = true

  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: {
        token: token.value,
        password: password.value
      }
    })

    success.value = true

    // Rediriger vers la page de connexion après 2 secondes
    setTimeout(() => {
      navigateTo('/login')
    }, 2000)
  } catch (e: any) {
    error.value = e.data?.message || 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <UCard class="max-w-md w-full">
      <template #header>
        <h2 class="text-2xl font-bold text-center">
          Créez votre mot de passe
        </h2>
      </template>

      <div v-if="success" class="text-center">
        <UIcon name="i-lucide-check-circle" class="w-16 h-16 text-green-500 mx-auto mb-4" />
        <p class="text-lg font-semibold mb-2">Mot de passe créé !</p>
        <p class="text-gray-600">Vous allez être redirigé vers la page de connexion...</p>
      </div>

      <form v-else @submit.prevent="handleSubmit" class="space-y-4">
        <UFormGroup label="Nouveau mot de passe" required>
          <UInput
            v-model="password"
            type="password"
            placeholder="••••••••"
            :disabled="loading"
          />
        </UFormGroup>

        <UFormGroup label="Confirmer le mot de passe" required>
          <UInput
            v-model="confirmPassword"
            type="password"
            placeholder="••••••••"
            :disabled="loading"
          />
        </UFormGroup>

        <UAlert
          v-if="error"
          color="red"
          variant="soft"
          :title="error"
          icon="i-lucide-alert-circle"
        />

        <UButton
          type="submit"
          block
          :loading="loading"
          :disabled="!password || !confirmPassword"
        >
          Créer mon mot de passe
        </UButton>
      </form>
    </UCard>
  </div>
</template>
```

## 6. Utilisation complète

### Côté frontend : Formulaire de création de compte

```vue
<!-- app/pages/feef/accounts/create.vue -->
<script setup lang="ts">
const sendEmail = ref(true) // Par défaut, envoyer un email

async function createAccount() {
  await $fetch('/api/accounts', {
    method: 'POST',
    body: {
      firstname: form.firstname,
      lastname: form.lastname,
      email: form.email,
      role: form.role,
      // Ne PAS envoyer de password si sendEmail est true
      ...(!sendEmail.value && { password: form.password })
    }
  })
}
</script>

<template>
  <UForm @submit="createAccount">
    <!-- Champs nom, prénom, email, rôle... -->

    <UFormGroup label="Méthode d'activation">
      <URadioGroup v-model="sendEmail">
        <URadio :value="true" label="Envoyer un email d'activation (recommandé)" />
        <URadio :value="false" label="Définir un mot de passe temporaire" />
      </URadioGroup>
    </UFormGroup>

    <UFormGroup v-if="!sendEmail" label="Mot de passe temporaire">
      <UInput v-model="form.password" type="password" />
    </UFormGroup>

    <UButton type="submit">Créer le compte</UButton>
  </UForm>
</template>
```

## Résumé

Cette intégration permet :

✅ Création de compte sans mot de passe par l'admin
✅ Génération automatique de token sécurisé
✅ Envoi d'email avec lien d'activation
✅ Page dédiée pour créer le mot de passe
✅ Expiration du token après 48h
✅ Sécurité renforcée (token hashé)

## Prochaines étapes

1. Implémenter la migration de base de données
2. Créer les fonctions utilitaires de tokens
3. Modifier l'API de création de compte
4. Créer l'API de réinitialisation
5. Créer la page frontend
6. Tester le workflow complet
