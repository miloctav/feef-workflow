<script setup lang="ts">
const { showWarning, resetActivity, startWatcher, stopWatcher } = useSessionWarning()
const { refreshSession, logout } = useAuth()

const loading = ref(false)

onMounted(() => {
  startWatcher()
})

onBeforeUnmount(() => {
  stopWatcher()
})

async function stayConnected() {
  loading.value = true
  try {
    // Ce GET passe par le middleware serveur qui réémet le cookie si elapsed > 15 min.
    await refreshSession()
    resetActivity()
  } finally {
    loading.value = false
  }
}

async function disconnect() {
  showWarning.value = false
  await logout()
}
</script>

<template>
  <UModal
    v-model:open="showWarning"
    :dismissible="false"
    :close="false"
    title="Votre session va expirer"
  >
    <template #body>
      <div class="space-y-3">
        <div class="flex items-center gap-3">
          <UIcon
            name="i-lucide-clock-alert"
            class="text-warning size-8"
          />
          <p class="text-sm text-gray-700 dark:text-gray-300">
            Sans activité, vous serez automatiquement déconnecté dans quelques minutes par mesure de sécurité.
          </p>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Souhaitez-vous rester connecté ?
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          variant="ghost"
          color="neutral"
          :disabled="loading"
          @click="disconnect"
        >
          Se déconnecter
        </UButton>
        <UButton
          color="primary"
          :loading="loading"
          @click="stayConnected"
        >
          Rester connecté
        </UButton>
      </div>
    </template>
  </UModal>
</template>
