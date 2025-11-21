<script setup lang="ts">
import type { EntityWithRelations } from '~~/app/types/entities'

const props = defineProps<{
  followerEntity?: EntityWithRelations
  masterEntity?: EntityWithRelations | null
  onRefresh?: () => void | Promise<void>
}>()

const {
  currentEntity,
  submitCase,
  approveCase,
  submitCaseLoading,
  fetchEntity,
} = useEntities()

const { user } = useAuth()

// Entité à afficher : followerEntity (si fourni) ou currentEntity
const displayEntity = computed(() => props.followerEntity || currentEntity.value)

// Est-ce qu'on affiche une entité suiveuse ?
const isFollowerView = computed(() => !!props.followerEntity)

// État pour le slideover d'édition des champs
const isFieldEditorOpen = ref(false)
const selectedFieldKey = ref<string | undefined>(undefined)

const openFieldEditor = (fieldKey: string) => {
  selectedFieldKey.value = fieldKey
  isFieldEditorOpen.value = true
}

const handleSubmitCaseAndClose = async (close: () => void) => {
  if (!displayEntity.value) return
  await submitCase(displayEntity.value.id)
  close()
}

const handleApproveCase = async () => {
  if (!displayEntity.value) return
  await approveCase(displayEntity.value.id)
}

const handleRefreshEntity = async () => {
  if (props.onRefresh) {
    await props.onRefresh()
  } else if (currentEntity.value) {
    await fetchEntity(currentEntity.value.id)
  }
}
</script>

<template>
     <!-- Badge entité suiveuse + bouton retour -->
     <div v-if="isFollowerView && masterEntity" class="mb-4 flex items-center gap-3">
       <UButton
         variant="ghost"
         icon="i-lucide-arrow-left"
         size="sm"
         @click="navigateTo('/entity')"
       >
         Retour
       </UButton>
       <UBadge color="info" variant="subtle" size="md">
         <UIcon name="i-lucide-link" class="w-3 h-3 mr-1" />
         Entité suiveuse de {{ masterEntity.name }}
       </UBadge>
     </div>

     <UCard v-if="displayEntity" class="mb-6">
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
                <span class="text-gray-900">{{ displayEntity.siren }}</span>
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
                v-if="!isFollowerView && user?.role === Role.FEEF && (displayEntity?.caseSubmittedAt && !displayEntity?.caseApprovedAt)"
                color="success"
                variant="solid"
                size="md"
                icon="i-lucide-check"
                :disabled="!!displayEntity?.caseApprovedAt || !displayEntity.caseSubmittedAt"
                @click="handleApproveCase"
              >
                Valider le dossier
              </UButton>
              <UModal
                v-if="!isFollowerView && user?.role === Role.ENTITY && !displayEntity?.caseSubmittedAt"
                title="Confirmer le dépôt du dossier"
                :ui="{ footer: 'justify-end' }"
              >
                <UButton
                  :disabled="!!displayEntity?.caseSubmittedAt || !!displayEntity?.caseApprovedAt || submitCaseLoading"
                  :loading="submitCaseLoading"
                  variant="solid"
                  size="md"
                  icon="i-lucide-upload"
                >
                  Déposer le dossier
                </UButton>

                <template #body>
                  <div class="space-y-4">
                    <!-- Mode appel d'offre (pas d'OE assigné) -->
                    <template v-if="!displayEntity?.oe">
                      <UAlert
                        color="info"
                        icon="i-lucide-megaphone"
                        title="Mode appel d'offre"
                        description="Aucun Organisme Évaluateur n'est assigné. Vous pourrez en choisir un après le dépôt du dossier."
                      />
                    </template>

                    <!-- OE assigné -->
                    <template v-else>
                      <UAlert
                        color="warning"
                        icon="i-lucide-alert-triangle"
                        title="Organisme Évaluateur assigné"
                      >
                        <template #description>
                          <p>
                            L'audit sera réalisé par <strong>{{ displayEntity.oe.name }}</strong>.
                          </p>
                          <p class="mt-2">
                            Ce choix ne sera <strong>plus modifiable</strong> après le dépôt du dossier.
                          </p>
                          <p class="mt-2 text-sm">
                            Pour modifier, allez dans l'onglet <strong>Contrats</strong> où vous pouvez changer d'OE ou passer en mode appel d'offre.
                          </p>
                        </template>
                      </UAlert>
                    </template>

                    <p class="text-sm text-gray-600">
                      Êtes-vous sûr de vouloir déposer le dossier ?
                    </p>
                  </div>
                </template>

                <template #footer="{ close }">
                  <UButton
                    label="Annuler"
                    color="neutral"
                    variant="outline"
                    :disabled="submitCaseLoading"
                    @click="close"
                  />
                  <UButton
                    label="Confirmer le dépôt"
                    color="primary"
                    icon="i-lucide-upload"
                    :loading="submitCaseLoading"
                    @click="handleSubmitCaseAndClose(close)"
                  />
                </template>
              </UModal>

              <AssignAccountManagerModal v-if="!isFollowerView" />

              <!-- Informations de soumission -->
              <div v-if="displayEntity?.caseSubmittedAt" class="text-sm text-gray-600 pt-2">
                <div class="flex items-start gap-2">
                  <UIcon name="i-lucide-upload" class="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <span class="font-medium">Dossier déposé</span>
                    <div v-if="displayEntity.caseSubmittedByAccount">
                      par {{ displayEntity.caseSubmittedByAccount.firstname }} {{ displayEntity.caseSubmittedByAccount.lastname }}
                    </div>
                    <div>le {{ new Date(displayEntity.caseSubmittedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }}</div>
                  </div>
                </div>
              </div>

              <!-- Informations d'approbation -->
              <div v-if="displayEntity?.caseApprovedAt" class="text-sm text-gray-600 pt-1">
                <div class="flex items-start gap-2">
                  <UIcon name="i-lucide-check-circle" class="w-4 h-4 mt-0.5 flex-shrink-0 text-success" />
                  <div>
                    <span class="font-medium text-success">Dossier approuvé</span>
                    <div v-if="displayEntity.caseApprovedByAccount">
                      par {{ displayEntity.caseApprovedByAccount.firstname }} {{ displayEntity.caseApprovedByAccount.lastname }}
                    </div>
                    <div>le {{ new Date(displayEntity.caseApprovedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }}</div>
                  </div>
                </div>
              </div>

              <!-- Informations du chargé d'affaire -->
              <div v-if="displayEntity?.accountManager" class="text-sm text-gray-600 pt-1">
                <div class="flex items-start gap-2">
                  <UIcon name="i-lucide-user-cog" class="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                  <div>
                    <span class="font-medium text-primary">Chargé d'affaire</span>
                    <div>
                      {{ displayEntity.accountManager.firstname }} {{ displayEntity.accountManager.lastname }}
                    </div>
                    <div class="text-xs text-gray-500">{{ displayEntity.accountManager.email }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Informations complémentaires (champs versionnés) -->
      <div v-if="displayEntity?.fields && displayEntity.fields.length > 0" class="mt-6 pt-6 border-t border-gray-200">
        <div class="flex items-start gap-3">
          <UIcon name="i-lucide-info" class="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div class="flex-1">
            <h3 class="font-semibold text-gray-900 mb-4">Informations complémentaires</h3>
            <div class="grid grid-cols-2 gap-4">
              <div
                v-for="field in displayEntity.fields"
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
                v-for="field in displayEntity.fields"
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

    <!-- Section entreprises suiveuses (masquée en vue suiveuse) -->
    <EntityFollowers
      v-if="displayEntity && !isFollowerView && (user?.role === Role.FEEF || user?.role === Role.ENTITY)"
      :entity="displayEntity"
      :on-refresh="handleRefreshEntity"
      class="mb-6"
    />

    <!-- Modal d'affectation du chargé d'affaire -->

    <!-- Slideover d'édition des champs -->
    <EntityFieldEditor
      v-if="displayEntity"
      v-model:open="isFieldEditorOpen"
      :entity-id="displayEntity.id"
      :fields="displayEntity.fields || []"
      :initial-field-key="selectedFieldKey"
    />
</template>