<script setup lang="ts">

const {
  currentEntity,
  submitCase,
  approveCase,
  assignAccountManager,
  fetchAccountManagers,
  approveCaseLoading,
  submitCaseLoading,
  assignAccountManagerLoading,
} = useEntities()

const { user } = useAuth()

// État pour le slideover d'édition des champs
const isFieldEditorOpen = ref(false)
const selectedFieldKey = ref<string | undefined>(undefined)

const openFieldEditor = (fieldKey: string) => {
  selectedFieldKey.value = fieldKey
  isFieldEditorOpen.value = true
}

const handleSubmitCase = async () => {
  if (!currentEntity.value) return

  await submitCase(currentEntity.value.id)
}

const handleApproveCase = async () => {
  if (!currentEntity.value) return

  await approveCase(currentEntity.value.id)
}
</script>

<template>
     <UCard v-if="currentEntity" class="mb-6">
      <div class="flex items-start gap-6">
        <!-- Icône entreprise à gauche -->
        <div class="flex-shrink-0 flex flex-col items-center gap-3">
          <UIcon 
            name="i-lucide-building-2" 
            class="w-16 h-16 text-primary"
          />
        </div>
        <!-- Informations à droite -->
        <div class="flex-1 grid grid-cols-3 gap-6">
          <!-- Colonne gauche -->
          <div>
            <h1 class="font-bold text-xl text-gray-900 mb-4">Raison sociale</h1>
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-600">SIREN:</span>
                <span class="text-gray-900">{{ currentEntity.siren }}</span>
              </div>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-phone" class="w-4 h-4 text-gray-500" />
                <div class="text-gray-900">00000000</div>
              </div>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-map-pin" class="w-4 h-4 text-gray-500" />
                <span class="text-sm font-medium text-gray-600">Sites:</span>
                <span class="text-gray-900">88</span>
              </div>
            </div>
          </div>
          <!-- Colonne centre -->
          <div>
            <div class="h-10 mb-4"></div>
            <div class="space-y-1 text-gray-700">
              <div>adresse</div>
              <div>866666 Ville</div>
              <div class="text-gray-600">France</div>
            </div>
          </div>
          <!-- Colonne droite - Actions -->
          <div>
            <h2 class="font-bold text-xl text-gray-900 mb-4">Actions</h2>
            <div class="space-y-3">
              <UButton
                v-if="user?.role === Role.FEEF && (currentEntity?.caseSubmittedAt && !currentEntity?.caseApprovedAt)"
                color="success"
                variant="solid"
                size="md"
                icon="i-lucide-check"
                :disabled="!!currentEntity?.caseApprovedAt || !currentEntity.caseSubmittedAt"
                @click="handleApproveCase"
              >
                Valider le dossier
              </UButton>
              <UButton
                v-if="user?.role === Role.ENTITY && !currentEntity?.caseSubmittedAt"
                :disabled="!!currentEntity?.caseSubmittedAt || !!currentEntity?.caseApprovedAt || submitCaseLoading"
                :loading="submitCaseLoading"
                @click="handleSubmitCase"
                variant="solid"
                size="md"
                icon="i-lucide-upload"
              >
                Déposer le dossier
              </UButton>

              <AssignAccountManagerModal />

              <!-- Informations de soumission -->
              <div v-if="currentEntity?.caseSubmittedAt" class="text-sm text-gray-600 pt-2">
                <div class="flex items-start gap-2">
                  <UIcon name="i-lucide-upload" class="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <span class="font-medium">Dossier déposé</span>
                    <div v-if="currentEntity.caseSubmittedByAccount">
                      par {{ currentEntity.caseSubmittedByAccount.firstname }} {{ currentEntity.caseSubmittedByAccount.lastname }}
                    </div>
                    <div>le {{ new Date(currentEntity.caseSubmittedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }}</div>
                  </div>
                </div>
              </div>

              <!-- Informations d'approbation -->
              <div v-if="currentEntity?.caseApprovedAt" class="text-sm text-gray-600 pt-1">
                <div class="flex items-start gap-2">
                  <UIcon name="i-lucide-check-circle" class="w-4 h-4 mt-0.5 flex-shrink-0 text-success" />
                  <div>
                    <span class="font-medium text-success">Dossier approuvé</span>
                    <div v-if="currentEntity.caseApprovedByAccount">
                      par {{ currentEntity.caseApprovedByAccount.firstname }} {{ currentEntity.caseApprovedByAccount.lastname }}
                    </div>
                    <div>le {{ new Date(currentEntity.caseApprovedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }}</div>
                  </div>
                </div>
              </div>

              <!-- Informations du chargé d'affaire -->
              <div v-if="currentEntity?.accountManager" class="text-sm text-gray-600 pt-1">
                <div class="flex items-start gap-2">
                  <UIcon name="i-lucide-user-cog" class="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                  <div>
                    <span class="font-medium text-primary">Chargé d'affaire</span>
                    <div>
                      {{ currentEntity.accountManager.firstname }} {{ currentEntity.accountManager.lastname }}
                    </div>
                    <div class="text-xs text-gray-500">{{ currentEntity.accountManager.email }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Informations complémentaires (champs versionnés) -->
      <div v-if="currentEntity?.fields && currentEntity.fields.length > 0" class="mt-6 pt-6 border-t border-gray-200">
        <div class="flex items-start gap-3">
          <UIcon name="i-lucide-info" class="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div class="flex-1">
            <h3 class="font-semibold text-gray-900 mb-4">Informations complémentaires</h3>
            <div class="grid grid-cols-2 gap-4">
              <div
                v-for="field in currentEntity.fields"
                v-if="user?.role === Role.FEEF || user?.role === Role.ENTITY"
                :key="field.key"
                class="space-y-1 cursor-pointer hover:bg-gray-50 rounded-md p-2 -m-2 transition-colors"
                @click="openFieldEditor(field.key)"
              >
                <div class="text-sm font-medium text-gray-600">{{ field.label }}</div>
                <div class="text-gray-900">
                  <template v-if="field.value === null || field.value === undefined">
                    <span class="text-gray-400 italic">Non défini</span>
                  </template>
                  <template v-else-if="field.type === 'date'">
                    {{ new Date(field.value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }}
                  </template>
                  <template v-else-if="field.type === 'boolean'">
                    {{ field.value ? 'Oui' : 'Non' }}
                  </template>
                  <template v-else-if="field.type === 'number' && field.unit">
                    {{ field.value }} {{ field.unit }}
                  </template>
                  <template v-else-if="field.type === 'text'">
                    <span class="line-clamp-2">{{ field.value }}</span>
                  </template>
                  <template v-else>
                    {{ field.value }}
                  </template>
                </div>
              </div>
              <!-- Affichage non cliquable pour les autres rôles -->
              <div
                v-else
                v-for="field in currentEntity.fields"
                :key="field.key"
                class="space-y-1"
              >
                <div class="text-sm font-medium text-gray-600">{{ field.label }}</div>
                <div class="text-gray-900">
                  <template v-if="field.value === null || field.value === undefined">
                    <span class="text-gray-400 italic">Non défini</span>
                  </template>
                  <template v-else-if="field.type === 'date'">
                    {{ new Date(field.value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }}
                  </template>
                  <template v-else-if="field.type === 'boolean'">
                    {{ field.value ? 'Oui' : 'Non' }}
                  </template>
                  <template v-else-if="field.type === 'number' && field.unit">
                    {{ field.value }} {{ field.unit }}
                  </template>
                  <template v-else-if="field.type === 'text'">
                    <span class="line-clamp-2">{{ field.value }}</span>
                  </template>
                  <template v-else>
                    {{ field.value }}
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Modal d'affectation du chargé d'affaire -->

    <!-- Slideover d'édition des champs -->
    <EntityFieldEditor
      v-if="currentEntity"
      v-model:open="isFieldEditorOpen"
      :entity-id="currentEntity.id"
      :fields="currentEntity.fields || []"
      :initial-field-key="selectedFieldKey"
    />
</template>