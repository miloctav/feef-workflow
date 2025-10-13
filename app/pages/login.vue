<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

definePageMeta({
  layout: false,
})

const router = useRouter()
const { login, loginLoading, loginError, clearLoginError } = useAuth()

const fields: AuthFormField[] = [
  {
    name: 'email',
    type: 'email',
    label: 'Email',
    placeholder: 'Entrez votre email',
    required: true,
  },
  {
    name: 'password',
    type: 'password',
    label: 'Mot de passe',
    placeholder: 'Entrez votre mot de passe',
    required: true,
  },
]

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

type Schema = z.output<typeof schema>

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const result = await login({
    email: event.data.email,
    password: event.data.password,
  })

  if (result.success) {
    // Rediriger vers la page d'accueil
    await router.push('/')
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          FEEF Workflow
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Connectez-vous à votre compte
        </p>
      </div>

      <UCard>
        <UAuthForm
          :schema="schema"
          :fields="fields"
          :loading="loginLoading"
          title="Connexion"
          submit-label="Se connecter"
          icon="i-lucide-user"
          @submit="onSubmit"
        >
          <template #validation>
            <UAlert
              v-if="loginError"
              color="error"
              variant="subtle"
              :title="loginError"
              :close-button="{ icon: 'i-lucide-x', color: 'red', variant: 'link' }"
              @close="clearLoginError"
            />
          </template>
        </UAuthForm>

        <template #footer>
          <div class="text-center">
            <NuxtLink
              to="/forgot-password"
              class="text-sm text-primary hover:text-primary-600 dark:hover:text-primary-400 font-medium"
            >
              Mot de passe oublié ?
            </NuxtLink>
          </div>
        </template>
      </UCard>

      <div class="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
        <p>Compte de test : maxime@miloctav.fr / admin</p>
      </div>
    </div>
  </div>
</template>
