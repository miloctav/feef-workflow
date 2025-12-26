<script setup lang="ts">
definePageMeta({
  layout: false,
})

const route = useRoute()
const router = useRouter()

const token = computed(() => route.query.token as string)

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)

// Vérifier qu'un token est présent dans l'URL
onMounted(() => {
  if (!token.value) {
    error.value = "Aucun token trouvé dans l'URL. Veuillez utiliser le lien reçu par email."
  }
})

async function handleSubmit() {
  error.value = ''

  // Validation côté client
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
        password: password.value,
      },
    })

    success.value = true

    // Rediriger vers la page de connexion après 2 secondes
    setTimeout(() => {
      router.push('/')
    }, 2000)
  } catch (e: any) {
    error.value = e.data?.message || 'Une erreur est survenue. Veuillez réessayer.'
  } finally {
    loading.value = false
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
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">FEEF Workflow</h1>
        <p class="text-gray-600 dark:text-gray-400">Créez votre nouveau mot de passe</p>
      </div>

      <UCard>
        <template #header>
          <div class="text-center">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              Réinitialisation du mot de passe
            </h2>
          </div>
        </template>

        <!-- Message de succès -->
        <div
          v-if="success"
          class="text-center py-8"
        >
          <UIcon
            name="i-lucide-check-circle"
            class="w-16 h-16 text-green-500 mx-auto mb-4"
          />
          <h2 class="text-lg font-semibold mb-2 text-gray-900">Mot de passe créé avec succès !</h2>
          <p class="text-gray-600">Vous allez être redirigé vers la page de connexion...</p>
        </div>

        <!-- Formulaire -->
        <form
          v-else
          @submit.prevent="handleSubmit"
          class="space-y-6"
        >
          <div class="space-y-8">
            <UFormField
              label="Nouveau mot de passe"
              required
              size="xl"
            >
              <UInput
                v-model="password"
                type="password"
                placeholder="Entrez votre nouveau mot de passe"
                :disabled="loading || !token"
                size="xl"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Confirmer le mot de passe"
              required
              size="xl"
            >
              <UInput
                v-model="confirmPassword"
                type="password"
                placeholder="Confirmez votre nouveau mot de passe"
                :disabled="loading || !token"
                size="xl"
                class="w-full"
              />
            </UFormField>
          </div>

          <div class="text-xs text-gray-500 space-y-1 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <p class="font-medium text-gray-700 dark:text-gray-300">
              Le mot de passe doit contenir :
            </p>
            <ul class="list-disc list-inside pl-2">
              <li>Au moins 8 caractères</li>
            </ul>
          </div>

          <!-- Message d'erreur -->
          <UAlert
            v-if="error"
            color="red"
            variant="soft"
            :title="error"
            icon="i-lucide-alert-circle"
          />

          <!-- Bouton de soumission -->
          <UButton
            type="submit"
            block
            size="lg"
            :loading="loading"
            :disabled="!password || !confirmPassword || !token"
          >
            Créer mon mot de passe
          </UButton>
        </form>

        <template #footer>
          <div class="text-center text-sm text-gray-500">
            <p>Besoin d'aide ? Contactez votre administrateur</p>
          </div>
        </template>
      </UCard>
    </div>
  </div>
</template>
