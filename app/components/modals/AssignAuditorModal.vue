<template>
  <UModal title="Affecter un auditeur" :ui="{ footer: 'justify-end' }">
    <UButton
      icon="i-lucide-user-cog"
      size="sm"
      color="primary"
      variant="outline"
    >
      {{ currentAuditorId ? 'Modifier l\'auditeur affecté' : 'Affecter un auditeur' }}
    </UButton>

    <template #body>
      <div class="space-y-4">
        <!-- Information actuelle -->
        <div v-if="currentAuditorId && currentAuditorName" class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-info" class="w-4 h-4 text-blue-600" />
            <span class="text-sm text-blue-900">
              Auditeur actuel : <strong>{{ currentAuditorName }}</strong>
            </span>
          </div>
        </div>

        <!-- Sélection de l'auditeur -->
        <UFormField label="Auditeur" required>
          <USelectMenu
            v-model="selectedAuditorId"
            :items="auditorOptions"
            :loading="loadingAuditors"
            placeholder="Sélectionner un auditeur"
            value-key="value"
          >
            <template #empty>
              <div class="text-center text-sm text-gray-500 py-2">
                Aucun auditeur disponible pour votre organisation
              </div>
            </template>
          </USelectMenu>
        </UFormField>

        <!-- Message d'aide -->
        <div class="text-sm text-gray-600">
          <UIcon name="i-lucide-info" class="w-4 h-4 inline-block mr-1" />
          Seuls les auditeurs liés à votre organisation sont disponibles.
        </div>
      </div>
    </template>

    <template #footer="{ close }">
      <UButton
        label="Annuler"
        color="neutral"
        variant="outline"
        @click="close"
      />
      <UButton
        label="Affecter"
        color="primary"
        :loading="updateLoading"
        :disabled="!selectedAuditorId || selectedAuditorId === currentAuditorId"
        @click="handleSubmit(close)"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
interface Props {
  auditId: number
  currentAuditorId?: number | null
  currentAuditorName?: string | null
  oeId: number
}

const props = defineProps<Props>()

const { assignAuditor, updateLoading } = useAudits()
const { fetchAuditorsByOe } = useAccounts()

// État local
const selectedAuditorId = ref<number | null>(props.currentAuditorId || null)
const auditorOptions = ref<Array<{ label: string; value: number }>>([])
const loadingAuditors = ref(false)

// Charger les auditeurs au montage
onMounted(async () => {
  loadingAuditors.value = true
  try {
    auditorOptions.value = await fetchAuditorsByOe(props.oeId)
  } finally {
    loadingAuditors.value = false
  }
})

// Gérer la soumission
const handleSubmit = async (close: () => void) => {
  if (!selectedAuditorId.value) return

  const result = await assignAuditor(props.auditId, selectedAuditorId.value)

  if (result.success) {
    close()
  }
}
</script>
