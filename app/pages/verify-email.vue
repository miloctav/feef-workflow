<script setup lang="ts">
definePageMeta({
  layout: 'default',
  auth: false
})

const route = useRoute()
const router = useRouter()
const toast = useToast()

const isVerifying = ref(true)
const verificationSuccess = ref(false)
const verificationError = ref<string | null>(null)
const newEmail = ref<string | null>(null)

const token = computed(() => route.query.token as string | undefined)

onMounted(async () => {
  if (!token.value) {
    verificationError.value = 'Token de vérification manquant'
    isVerifying.value = false
    return
  }

  try {
    const response = await $fetch('/api/accounts/verify-email-change', {
      method: 'POST',
      body: {
        token: token.value
      }
    })

    verificationSuccess.value = true
    newEmail.value = response.data.newEmail

    toast.add({
      title: 'Email modifié avec succès',
      description: response.data.message,
      color: 'success',
    })

    // Redirect to login after 5 seconds
    setTimeout(() => {
      router.push('/login')
    }, 5000)
  } catch (error: any) {
    verificationError.value = error.data?.message || 'Une erreur est survenue'

    toast.add({
      title: 'Erreur de vérification',
      description: verificationError.value,
      color: 'error',
    })
  } finally {
    isVerifying.value = false
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
    <UCard class="max-w-md w-full">
      <template #header>
        <div class="flex items-center justify-center">
          <UIcon name="i-lucide-mail-check" class="size-8 text-primary" />
        </div>
      </template>

      <div class="space-y-4 text-center">
        <!-- Loading -->
        <div v-if="isVerifying" class="space-y-3">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Vérification en cours...
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Veuillez patienter pendant la vérification de votre nouvelle adresse email.
          </p>
          <div class="flex justify-center py-4">
            <UIcon name="i-lucide-loader-2" class="size-8 text-primary animate-spin" />
          </div>
        </div>

        <!-- Success -->
        <div v-else-if="verificationSuccess" class="space-y-3">
          <div class="flex justify-center">
            <UIcon name="i-lucide-check-circle" class="size-16 text-success" />
          </div>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Email modifié avec succès !
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Votre adresse email a été mise à jour vers :
          </p>
          <p class="text-base font-semibold text-primary">
            {{ newEmail }}
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Vous allez être redirigé vers la page de connexion...
          </p>
          <UButton
            label="Se connecter maintenant"
            block
            class="mt-4"
            @click="router.push('/login')"
          />
        </div>

        <!-- Error -->
        <div v-else class="space-y-3">
          <div class="flex justify-center">
            <UIcon name="i-lucide-x-circle" class="size-16 text-error" />
          </div>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Échec de la vérification
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ verificationError }}
          </p>
          <div class="flex flex-col gap-2 mt-4">
            <UButton
              label="Retour à la connexion"
              block
              @click="router.push('/login')"
            />
            <UButton
              label="Aller à mon compte"
              variant="outline"
              block
              @click="router.push('/my-account')"
            />
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
