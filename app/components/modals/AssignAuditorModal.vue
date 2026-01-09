<template>
  <UModal title="Affecter un auditeur" :ui="{ footer: 'justify-end' }">
    <UButton
      icon="i-lucide-user-cog"
      size="sm"
      color="primary"
      variant="outline"
    >
      {{ currentAuditorId || currentExternalAuditorName ? 'Modifier l\'auditeur affecté' : 'Affecter un auditeur' }}
    </UButton>

    <template #body>
      <div class="space-y-4">
        <!-- Information actuelle -->
        <div v-if="currentAuditorId && currentAuditorName || currentExternalAuditorName" class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-info" class="w-4 h-4 text-blue-600" />
            <span class="text-sm text-blue-900">
              Auditeur actuel : <strong>{{ currentAuditorName || currentExternalAuditorName }}</strong>
            </span>
          </div>
        </div>

        <!-- Type d'auditeur -->
        <UFormField label="Type d'auditeur" required>
          <URadioGroup
            v-model="auditorType"
            :items="[
              { value: 'account', label: 'Compte existant' },
              { value: 'external', label: 'Auditeur externe' }
            ]"
          />
        </UFormField>

        <!-- Sélection de l'auditeur (compte) -->
        <UFormField v-if="auditorType === 'account'" label="Auditeur" required>
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

        <!-- Nom de l'auditeur externe -->
        <UFormField v-else label="Nom de l'auditeur externe" required>
          <UInput
            v-model="externalAuditorName"
            placeholder="Nom complet de l'auditeur"
            maxlength="255"
          />
        </UFormField>

        <!-- Message d'aide -->
        <div class="text-sm text-gray-600">
          <UIcon name="i-lucide-info" class="w-4 h-4 inline-block mr-1" />
          <span v-if="auditorType === 'account'">
            Seuls les auditeurs liés à votre organisation sont disponibles.
          </span>
          <span v-else>
            Saisissez le nom complet de l'auditeur externe (maximum 255 caractères).
          </span>
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
        :disabled="!isValid"
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
  currentExternalAuditorName?: string | null
  oeId: number
}

const props = defineProps<Props>()

const { assignAuditor, updateLoading } = useAudits()
const { fetchAuditorsByOe } = useAccounts()

// État local
const auditorType = ref<'account' | 'external'>(
  props.currentExternalAuditorName ? 'external' : 'account'
)
const selectedAuditorId = ref<number | null>(props.currentAuditorId || null)
const externalAuditorName = ref<string>(props.currentExternalAuditorName || '')
const auditorOptions = ref<Array<{ label: string; value: number }>>([])
const loadingAuditors = ref(false)

// Watch auditor type changes to reset values
watch(auditorType, (newType) => {
  if (newType === 'external') {
    selectedAuditorId.value = null
  }
  else {
    externalAuditorName.value = ''
  }
})

// Charger les auditeurs au montage
onMounted(async () => {
  loadingAuditors.value = true
  try {
    auditorOptions.value = await fetchAuditorsByOe(props.oeId)
  }
  finally {
    loadingAuditors.value = false
  }
})

// Watch auditor type changes to load auditors when switching to account mode
watch(auditorType, async (newType) => {
  if (newType === 'account' && auditorOptions.value.length === 0) {
    loadingAuditors.value = true
    try {
      auditorOptions.value = await fetchAuditorsByOe(props.oeId)
    }
    finally {
      loadingAuditors.value = false
    }
  }
})

// Validation computed
const isValid = computed(() => {
  if (auditorType.value === 'account') {
    return selectedAuditorId.value !== null && selectedAuditorId.value !== props.currentAuditorId
  }
  else {
    return externalAuditorName.value.trim().length > 0 && externalAuditorName.value.trim() !== props.currentExternalAuditorName
  }
})

// Gérer la soumission
const handleSubmit = async (close: () => void) => {
  const data = {
    auditorType: auditorType.value,
    ...(auditorType.value === 'account'
      ? { auditorId: selectedAuditorId.value! }
      : { externalAuditorName: externalAuditorName.value.trim() }
    ),
  }

  const result = await assignAuditor(props.auditId, data)

  if (result.success) {
    close()
  }
}
</script>
