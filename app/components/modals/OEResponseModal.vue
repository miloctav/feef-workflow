<template>
  <UModal :ui="{ width: 'sm:max-w-2xl' }">
    <!-- Bouton déclencheur dans le slot par défaut -->
    <UButton
      label="Répondre à la demande"
      icon="i-lucide-clipboard-check"
    />

    <!-- Contenu du modal dans le slot #content -->
    <template #content="{ close }">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-xl font-semibold text-gray-900">Réponse à la demande d'audit</h3>
              <p class="text-sm text-gray-500 mt-1">
                Veuillez indiquer votre décision concernant cet audit
              </p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              @click="close"
            />
          </div>
        </template>

        <div class="space-y-6">
          <!-- Options de décision avec cards -->
          <div class="grid grid-cols-1 gap-3">
            <!-- Card Accepter -->
            <button
              type="button"
              class="relative group rounded-lg border-2 p-6 transition-all duration-200 text-left"
              :class="[
                decision === 'accept'
                  ? 'border-green-500 bg-green-50 shadow-lg scale-105'
                  : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50',
              ]"
              @click="decision = 'accept'"
            >
              <div class="flex items-start gap-4">
                <div
                  class="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-colors"
                  :class="[
                    decision === 'accept'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-400 group-hover:bg-green-100 group-hover:text-green-600',
                  ]"
                >
                  <UIcon
                    name="i-lucide-check-circle"
                    class="w-6 h-6"
                  />
                </div>
                <div class="flex-1">
                  <h4
                    class="font-semibold text-lg mb-1"
                    :class="decision === 'accept' ? 'text-green-700' : 'text-gray-900'"
                  >
                    Accepter l'audit
                  </h4>
                  <p
                    class="text-sm"
                    :class="decision === 'accept' ? 'text-green-600' : 'text-gray-500'"
                  >
                    Je confirme pouvoir réaliser cet audit
                  </p>
                </div>
              </div>
              <!-- Checkmark indicator -->
              <div
                v-if="decision === 'accept'"
                class="absolute top-3 right-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
              >
                <UIcon
                  name="i-heroicons-check-20-solid"
                  class="w-4 h-4 text-white"
                />
              </div>
            </button>

            <!-- Card Refuser -->
            <button
              type="button"
              class="relative group rounded-lg border-2 p-6 transition-all duration-200 text-left"
              :class="[
                decision === 'refuse'
                  ? 'border-red-500 bg-red-50 shadow-lg scale-105'
                  : 'border-gray-200 hover:border-red-300 hover:bg-red-50/50',
              ]"
              @click="decision = 'refuse'"
            >
              <div class="flex items-start gap-4">
                <div
                  class="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-colors"
                  :class="[
                    decision === 'refuse'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-400 group-hover:bg-red-100 group-hover:text-red-600',
                  ]"
                >
                  <UIcon
                    name="i-lucide-x-circle"
                    class="w-6 h-6"
                  />
                </div>
                <div class="flex-1">
                  <h4
                    class="font-semibold text-lg mb-1"
                    :class="decision === 'refuse' ? 'text-red-700' : 'text-gray-900'"
                  >
                    Refuser l'audit
                  </h4>
                  <p
                    class="text-sm"
                    :class="decision === 'refuse' ? 'text-red-600' : 'text-gray-500'"
                  >
                    Je ne peux pas réaliser cet audit
                  </p>
                </div>
              </div>
              <!-- Checkmark indicator -->
              <div
                v-if="decision === 'refuse'"
                class="absolute top-3 right-3 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
              >
                <UIcon
                  name="i-heroicons-check-20-solid"
                  class="w-4 h-4 text-white"
                />
              </div>
            </button>
          </div>

          <!-- Raison du refus avec animation -->
          <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 -translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-2"
          >
            <div
              v-if="decision === 'refuse'"
              class="space-y-3"
            >
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Raison du refus <span class="text-red-500">*</span>
                </label>
                <p class="text-sm text-gray-500 mb-3">
                  Veuillez expliquer les raisons de votre refus
                </p>
                <UTextarea
                  v-model="refusalReason"
                  placeholder="Argumentez votre refus"
                  :rows="4"
                  :maxlength="1000"
                  autofocus
                  class="w-full"
                />
                <div class="flex items-center justify-between mt-2">
                  <p
                    v-if="errors.refusalReason"
                    class="text-sm text-red-500"
                  >
                    {{ errors.refusalReason }}
                  </p>
                  <span class="text-xs text-gray-500 ml-auto">
                    {{ refusalReason?.length || 0 }} / 1000 caractères
                  </span>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <template #footer>
          <div class="flex items-center justify-between">
            <UButton
              color="neutral"
              variant="ghost"
              label="Annuler"
              icon="i-heroicons-arrow-left-20-solid"
              @click="close"
            />
            <UButton
              v-if="decision"
              :color="decision === 'accept' ? 'primary' : 'error'"
              :icon="decision === 'accept' ? 'i-lucide-check' : 'i-lucide-x'"
              :label="decision === 'accept' ? 'Confirmer l\'acceptation' : 'Confirmer le refus'"
              :loading="loading"
              :disabled="decision === 'refuse' && !refusalReason?.trim()"
              size="lg"
              @click="handleSubmit(close)"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  auditId: number
}>()

const emit = defineEmits<{
  success: []
}>()

const decision = ref<'accept' | 'refuse' | null>(null)
const refusalReason = ref('')
const loading = ref(false)
const errors = ref<{ refusalReason?: string }>({})

const toast = useToast()

const handleSubmit = async (close: () => void) => {
  errors.value = {}

  // Validation côté client
  if (decision.value === 'refuse' && !refusalReason.value?.trim()) {
    errors.value.refusalReason = 'Un commentaire est obligatoire en cas de refus'
    return
  }

  loading.value = true

  try {
    const { data, message } = await $fetch(`/api/audits/${props.auditId}/oe-response`, {
      method: 'POST',
      body: {
        accepted: decision.value === 'accept',
        refusalReason: decision.value === 'refuse' ? refusalReason.value : undefined,
      },
    })

    toast.add({
      title: decision.value === 'accept' ? 'Audit accepté' : 'Audit refusé',
      description: message,
      color: decision.value === 'accept' ? 'success' : 'warning',
    })

    close()
    emit('success')

    // Reset form après fermeture
    decision.value = null
    refusalReason.value = ''
    errors.value = {}
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error?.data?.message || 'Impossible de soumettre votre réponse',
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}
</script>
