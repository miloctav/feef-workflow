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

const PASSWORD_MIN_LENGTH = 12

const passwordRules = [
  { id: 'length', label: `Au moins ${PASSWORD_MIN_LENGTH} caractères`, test: (p: string) => p.length >= PASSWORD_MIN_LENGTH },
  { id: 'uppercase', label: 'Au moins 1 lettre majuscule', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'Au moins 1 lettre minuscule', test: (p: string) => /[a-z]/.test(p) },
  { id: 'digit', label: 'Au moins 1 chiffre', test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: 'Au moins 1 caractère spécial (ex: !@#$%)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

const ruleResults = computed(() =>
  passwordRules.map(rule => ({ ...rule, passed: rule.test(password.value) }))
)

const isPasswordValid = computed(() => ruleResults.value.every(r => r.passed))

const showPassword = ref(false)
const showConfirmPassword = ref(false)

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

  if (!isPasswordValid.value) {
    error.value = 'Le mot de passe ne respecte pas les critères de sécurité'
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
                :type="showPassword ? 'text' : 'password'"
                placeholder="Entrez votre nouveau mot de passe"
                :disabled="loading || !token"
                size="xl"
                class="w-full"
              >
                <template #trailing>
                  <UButton
                    color="neutral"
                    variant="link"
                    :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                    :aria-label="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                    :padded="false"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </UInput>
            </UFormField>

            <UFormField
              label="Confirmer le mot de passe"
              required
              size="xl"
            >
              <UInput
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="Confirmez votre nouveau mot de passe"
                :disabled="loading || !token"
                size="xl"
                class="w-full"
              >
                <template #trailing>
                  <UButton
                    color="neutral"
                    variant="link"
                    :icon="showConfirmPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                    :aria-label="showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                    :padded="false"
                    @click="showConfirmPassword = !showConfirmPassword"
                  />
                </template>
              </UInput>
            </UFormField>
          </div>

          <div class="text-xs bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
            <p class="font-medium text-gray-700 dark:text-gray-300">
              Le mot de passe doit contenir :
            </p>
            <ul class="space-y-1">
              <li
                v-for="rule in ruleResults"
                :key="rule.id"
                class="flex items-center gap-2"
                :class="rule.passed ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'"
              >
                <UIcon
                  :name="rule.passed ? 'i-lucide-check-circle' : 'i-lucide-circle'"
                  class="w-3.5 h-3.5 shrink-0"
                />
                {{ rule.label }}
              </li>
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
            :disabled="!password || !confirmPassword || !token || !isPasswordValid"
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
