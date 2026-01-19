<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: false,
})

const router = useRouter()
const { twoFactorAccountId, clear2FA, is2FAExpired, refreshSession } = useAuth()

// Vérifier que l'utilisateur a un accountId valide au montage
onMounted(() => {
  console.log('[Verify 2FA] accountId:', twoFactorAccountId.value)
  console.log('[Verify 2FA] is expired:', is2FAExpired())

  if (!twoFactorAccountId.value || is2FAExpired()) {
    console.log('[Verify 2FA] No valid accountId, redirecting to login')
    navigateTo('/login')
  }
})

const code = ref('')
const loading = ref(false)
const error = ref('')
const attemptsRemaining = ref<number | null>(null)
const resendLoading = ref(false)
const resendSuccess = ref(false)

// Timer pour l'expiration
const timeRemaining = ref(300) // 5 minutes en secondes

onMounted(() => {
  // Mettre à jour le timer toutes les secondes
  const interval = setInterval(() => {
    if (timeRemaining.value > 0) {
      timeRemaining.value--
    } else {
      clearInterval(interval)
      // Rediriger vers login après expiration
      navigateTo('/login')
    }
  }, 1000)

  // Nettoyer l'interval lors du démontage
  onUnmounted(() => {
    clearInterval(interval)
  })
})

// Formater le temps restant (MM:SS)
const formattedTime = computed(() => {
  const minutes = Math.floor(timeRemaining.value / 60)
  const seconds = timeRemaining.value % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

const schema = z.object({
  code: z.string().length(6, 'Le code doit contenir 6 chiffres'),
})

type Schema = z.output<typeof schema>

async function onSubmit(event: FormSubmitEvent<Schema>) {
  error.value = ''
  loading.value = true
  attemptsRemaining.value = null

  try {
    const response = await $fetch('/api/auth/2fa/verify', {
      method: 'POST',
      body: {
        accountId: twoFactorAccountId.value,
        code: event.data.code,
      },
    })

    if (response.data.success) {
      // Rafraîchir la session côté client (sync with server session)
      await refreshSession()

      // Nettoyer les données 2FA
      clear2FA()

      // Rediriger vers la page d'accueil
      await router.push('/')
    }
  } catch (err: any) {
    if (err.data?.data?.attemptsRemaining !== undefined) {
      attemptsRemaining.value = err.data.data.attemptsRemaining
    }
    error.value = err.data?.message || 'Une erreur est survenue'
    loading.value = false

    // Si plus de tentatives ou code expiré, rediriger vers login après 3 secondes
    if (error.value.includes('Trop de tentatives') || error.value.includes('expiré')) {
      setTimeout(() => {
        navigateTo('/login')
      }, 3000)
    }
  }
}

async function resendCode() {
  resendLoading.value = true
  resendSuccess.value = false
  error.value = ''

  try {
    await $fetch('/api/auth/2fa/resend', {
      method: 'POST',
      body: {
        accountId: twoFactorAccountId.value,
      },
    })

    resendSuccess.value = true
    // Réinitialiser le timer
    timeRemaining.value = 300

    // Cacher le message de succès après 5 secondes
    setTimeout(() => {
      resendSuccess.value = false
    }, 5000)
  } catch (err: any) {
    error.value = err.data?.message || 'Erreur lors du renvoi du code'
  } finally {
    resendLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <img
          src="/assets/images/Logo-PMEplus.png"
          alt="Logo PME+"
          class="h-20 w-auto mx-auto mb-4"
        />
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Vérification en deux étapes
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Un code de vérification a été envoyé à votre adresse email
        </p>
      </div>

      <UCard>
        <UForm
          :schema="schema"
          :state="{ code }"
          @submit="onSubmit"
        >
          <div class="space-y-4">
            <!-- Timer -->
            <div
              class="flex items-center justify-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg"
            >
              <UIcon
                name="i-lucide-clock"
                class="text-blue-600 dark:text-blue-400"
              />
              <span class="text-sm font-medium text-blue-600 dark:text-blue-400">
                Code valide pendant {{ formattedTime }}
              </span>
            </div>

            <!-- Message de succès de renvoi -->
            <UAlert
              v-if="resendSuccess"
              color="success"
              variant="subtle"
              title="Un nouveau code a été envoyé"
              icon="i-lucide-check-circle"
            />

            <!-- Message d'erreur -->
            <UAlert
              v-if="error"
              color="error"
              variant="subtle"
              :title="error"
              :close-button="{ icon: 'i-lucide-x', color: 'red', variant: 'link' }"
              @close="error = ''"
            />

            <!-- Tentatives restantes -->
            <UAlert
              v-if="attemptsRemaining !== null && attemptsRemaining > 0"
              color="warning"
              variant="subtle"
              :title="`Il vous reste ${attemptsRemaining} tentative(s)`"
              icon="i-lucide-alert-triangle"
            />

            <!-- Champ de code -->
            <UFormField
              label="Code de vérification"
              name="code"
              required
              class="text-center"
            >
              <UInput
                v-model="code"
                type="text"
                placeholder="000000"
                maxlength="6"
                icon="i-lucide-shield-check"
                size="xl"
                :ui="{ base: 'text-center text-2xl font-mono tracking-widest' }"
              />
            </UFormField>

            <!-- Bouton de soumission -->
            <UButton
              type="submit"
              block
              size="xl"
              :loading="loading"
              :disabled="code.length !== 6"
            >
              Vérifier le code
            </UButton>

            <!-- Lien pour renvoyer le code -->
            <div class="text-center">
              <UButton
                variant="link"
                :loading="resendLoading"
                @click="resendCode"
              >
                Renvoyer le code
              </UButton>
            </div>
          </div>
        </UForm>
      </UCard>

      <!-- Lien de retour -->
      <div class="text-center mt-6">
        <NuxtLink
          to="/login"
          class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          Retour à la connexion
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
