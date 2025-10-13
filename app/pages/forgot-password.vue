<script setup lang="ts">
definePageMeta({
  layout: false
})

const router = useRouter()

const email = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)

async function handleSubmit() {
  error.value = ''

  // Validation côté client
  if (!email.value) {
    error.value = 'L\'email est requis'
    return
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value)) {
    error.value = 'Format d\'email invalide'
    return
  }

  loading.value = true

  try {
    await $fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: {
        email: email.value
      }
    })

    success.value = true
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'Une erreur est survenue. Veuillez réessayer.'
  } finally {
    loading.value = false
  }
}

function goToLogin() {
  router.push('/')
}
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-50">
    <UCard class="w-full max-w-md mx-4">
      <template #header>
        <div class="text-center">
          <h1 class="text-2xl font-bold text-gray-900">
            FEEF Workflow
          </h1>
          <p class="mt-2 text-sm text-gray-600">
            Mot de passe oublié
          </p>
        </div>
      </template>

      <!-- Message de succès -->
      <div v-if="success" class="text-center py-8">
        <UIcon name="i-lucide-mail-check" class="w-16 h-16 text-blue-500 mx-auto mb-4" />
        <h2 class="text-lg font-semibold mb-2 text-gray-900">
          Email envoyé !
        </h2>
        <p class="text-gray-600 mb-4">
          Si un compte existe avec cet email, vous recevrez un lien de réinitialisation dans quelques instants.
        </p>
        <p class="text-sm text-gray-500 mb-6">
          Pensez à vérifier vos spams si vous ne recevez pas l'email.
        </p>
        <UButton
          variant="soft"
          color="gray"
          @click="goToLogin"
          block
        >
          Retour à la connexion
        </UButton>
      </div>

      <!-- Formulaire -->
      <form v-else @submit.prevent="handleSubmit" class="space-y-6">
        <div class="space-y-4">
          <p class="text-sm text-gray-600">
            Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </p>

          <UFormGroup label="Adresse email" required>
            <UInput
              v-model="email"
              type="email"
              placeholder="votre.email@exemple.fr"
              :disabled="loading"
              size="lg"
              autocomplete="email"
            />
          </UFormGroup>
        </div>

        <!-- Message d'erreur -->
        <UAlert
          v-if="error"
          color="red"
          variant="soft"
          :title="error"
          icon="i-lucide-alert-circle"
        />

        <!-- Boutons -->
        <div class="space-y-3">
          <UButton
            type="submit"
            block
            size="lg"
            :loading="loading"
            :disabled="!email"
          >
            Envoyer le lien de réinitialisation
          </UButton>

          <UButton
            type="button"
            variant="ghost"
            color="gray"
            block
            @click="goToLogin"
            :disabled="loading"
          >
            Retour à la connexion
          </UButton>
        </div>
      </form>

      <template #footer>
        <div class="text-center text-sm text-gray-500">
          <p>Besoin d'aide ? Contactez votre administrateur</p>
        </div>
      </template>
    </UCard>
  </div>
</template>
