<script setup lang="ts">
// Ajout d'un champ date pour plannedDate si audit initial et d'un champ pour la date d'audit souhaitée si audits existent
const plannedDate = ref<string | null>(null)
const wishedAuditDate = ref<string | null>(null)
import type { EntityWithRelations, EntityFieldGroupKey } from '~~/app/types/entities'

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
const { buildFieldGroups } = useEntityFieldGroups()

// Entité à afficher : followerEntity (si fourni) ou currentEntity
const displayEntity = computed(() => props.followerEntity || currentEntity.value)

// Est-ce qu'on affiche une entité suiveuse ?
const isFollowerView = computed(() => !!props.followerEntity)

// Dernier audit de l'entité
const latestAudit = computed(() => displayEntity.value?.audits?.[0] || null)

// Groupes de champs
const fieldGroups = computed(() => {
  if (!displayEntity.value?.fields) return []
  return buildFieldGroups(displayEntity.value.fields)
})

// État pour le slideover d'édition des champs
const isFieldEditorOpen = ref(false)
const selectedFieldKey = ref<string | undefined>(undefined)

const openFieldEditor = (fieldKey: string) => {
  selectedFieldKey.value = fieldKey
  isFieldEditorOpen.value = true
}

// État pour le slideover d'édition des groupes de champs
const isFieldGroupEditorOpen = ref(false)
const selectedGroupKey = ref<EntityFieldGroupKey | undefined>(undefined)

const openFieldGroupEditor = (groupKey: EntityFieldGroupKey) => {
  selectedGroupKey.value = groupKey
  isFieldGroupEditorOpen.value = true
}

const handleSubmitCaseAndClose = async (close: () => void) => {
  if (!displayEntity.value) return
  await submitCase(displayEntity.value.id, plannedDate.value)
  await handleRefreshEntity()
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

// Helper functions for field values
const getFieldValue = (fieldKey: string) => {
  const field = displayEntity.value?.fields?.find(f => f.key === fieldKey)
  return field?.value ?? null
}

const formatFieldValue = (field: any) => {
  if (field.value === null || field.value === undefined) return 'Non défini'

  if (field.type === 'boolean') return field.value ? 'Oui' : 'Non'
  if (field.type === 'number' && field.unit) return `${field.value} ${field.unit}`
  if (field.type === 'date') return new Date(field.value).toLocaleDateString('fr-FR')

  return field.value
}

const getGroupIcon = (groupKey: string) => {
  const group = fieldGroups.value.find(g => g.key === groupKey)
  return group?.icon || 'i-lucide-folder'
}

const getGroupLabel = (groupKey: string) => {
  const group = fieldGroups.value.find(g => g.key === groupKey)
  return group?.label || groupKey
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
                v-if="!isFollowerView && user?.role === Role.FEEF && (latestAudit?.caseSubmittedAt && !latestAudit?.caseApprovedAt)"
                color="success"
                variant="solid"
                size="md"
                icon="i-lucide-check"
                :disabled="!!latestAudit?.caseApprovedAt || !latestAudit?.caseSubmittedAt"
                @click="handleApproveCase"
              >
                Valider le dossier
              </UButton>
              <UModal
                v-if="!isFollowerView && user?.role === Role.ENTITY && (!latestAudit?.caseSubmittedAt || latestAudit.status===AuditStatus.COMPLETED)"
                title="Confirmer le dépôt du dossier"
                :ui="{ footer: 'justify-end' }"
              >
                <UButton
                  :loading="submitCaseLoading"
                  variant="solid"
                  size="md"
                  icon="i-lucide-upload"
                >
                  Déposer le dossier
                </UButton>

                <template #body>
                  <div class="space-y-4">
                    <!-- Champ date si audit initial -->
                    <template v-if="!displayEntity?.audits || displayEntity.audits.length === 0">
                      <UFormField label="Date prévisionnelle de l'audit (optionnelle)">
                        <UInput
                          type="date"
                          v-model="plannedDate"
                          :disabled="submitCaseLoading"
                        />
                      </UFormField>
                    </template>
                  
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
              <div v-if="latestAudit?.caseSubmittedAt  && latestAudit.status!==AuditStatus.COMPLETED" class="text-sm text-gray-600 pt-2">
                <div class="flex items-start gap-2">
                  <UIcon name="i-lucide-upload" class="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <span class="font-medium">Dossier déposé</span>
                    <div v-if="latestAudit.caseSubmittedByAccount">
                      par {{ latestAudit.caseSubmittedByAccount.firstname }} {{ latestAudit.caseSubmittedByAccount.lastname }}
                    </div>
                    <div>le {{ new Date(latestAudit.caseSubmittedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }}</div>
                  </div>
                </div>
              </div>

              <!-- Informations d'approbation -->
              <div v-if="latestAudit?.caseApprovedAt && latestAudit.status!==AuditStatus.COMPLETED" class="text-sm text-gray-600 pt-1">
                <div class="flex items-start gap-2">
                  <UIcon name="i-lucide-check-circle" class="w-4 h-4 mt-0.5 flex-shrink-0 text-success" />
                  <div>
                    <span class="font-medium text-success">Dossier approuvé</span>
                    <div v-if="latestAudit.caseApprovedByAccount">
                      par {{ latestAudit.caseApprovedByAccount.firstname }} {{ latestAudit.caseApprovedByAccount.lastname }}
                    </div>
                    <div>le {{ new Date(latestAudit.caseApprovedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }}</div>
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

    </UCard>

    <!-- Groupes de champs (Informations complémentaires) - Version stylisée -->
    <div v-if="fieldGroups.length > 0" class="space-y-6 mt-6">
      <!-- Groupes 1-2: Sites et Revenue (Grid 2 colonnes) -->
      <div v-for="groupKey in ['sites', 'revenue']" :key="groupKey">
        <UCard
          :class="[
            'cursor-pointer hover:shadow-md transition-shadow',
            { 'pointer-events-none': user?.role !== Role.FEEF && user?.role !== Role.ENTITY }
          ]"
          @click="user?.role === Role.FEEF || user?.role === Role.ENTITY ? openFieldGroupEditor(groupKey) : undefined"
        >
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <UIcon :name="getGroupIcon(groupKey)" class="w-6 h-6 text-primary" />
                <h2 class="font-bold text-xl">{{ getGroupLabel(groupKey) }}</h2>
              </div>
              <UIcon
                v-if="user?.role === Role.FEEF || user?.role === Role.ENTITY"
                name="i-lucide-pencil"
                class="w-4 h-4 text-gray-400"
              />
            </div>
          </template>

          <div class="grid grid-cols-2 gap-4">
            <div v-for="field in fieldGroups.find(g => g.key === groupKey)?.fields || []" :key="field.key">
              <label class="text-sm font-medium text-gray-600">{{ field.label }}</label>
              <div class="text-gray-900 font-semibold">
                {{ formatFieldValue(field) }}
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Groupes 3-4-5: Pilot, CEO, Accounting (ContactCard style en grille 3) -->
      <div class="grid grid-cols-3 gap-6">
        <UCard
          v-for="groupKey in ['pilot', 'ceo', 'accounting']"
          :key="groupKey"
          :class="[
            'cursor-pointer hover:shadow-md transition-shadow',
            { 'pointer-events-none': user?.role !== Role.FEEF && user?.role !== Role.ENTITY }
          ]"
          @click="user?.role === Role.FEEF || user?.role === Role.ENTITY ? openFieldGroupEditor(groupKey) : undefined"
        >
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <UIcon :name="getGroupIcon(groupKey)" class="w-5 h-5 text-primary" />
                <h3 class="font-semibold text-lg">{{ getGroupLabel(groupKey) }}</h3>
              </div>
              <UIcon
                v-if="user?.role === Role.FEEF || user?.role === Role.ENTITY"
                name="i-lucide-pencil"
                class="w-4 h-4 text-gray-400"
              />
            </div>
          </template>

          <div class="space-y-3">
            <div class="text-lg font-semibold text-gray-900">
              {{ getFieldValue(`${groupKey}FirstName`) }} {{ getFieldValue(`${groupKey}LastName`) }}
            </div>
            <div class="text-sm text-gray-600">{{ getFieldValue(`${groupKey}Role`) || 'Non défini' }}</div>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-phone" class="w-4 h-4 text-gray-500" />
              <span class="text-sm">{{ getFieldValue(`${groupKey}Phone`) || 'Non défini' }}</span>
            </div>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-mail" class="w-4 h-4 text-gray-500" />
              <span class="text-sm">{{ getFieldValue(`${groupKey}Email`) || 'Non défini' }}</span>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Groupe 6: Labeling Scope (avec alerte conditionnelle) -->
      <UCard
        :class="[
          'cursor-pointer hover:shadow-md transition-shadow',
          { 'pointer-events-none': user?.role !== Role.FEEF && user?.role !== Role.ENTITY }
        ]"
        @click="user?.role === Role.FEEF || user?.role === Role.ENTITY ? openFieldGroupEditor('labeling_scope') : undefined"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-flag" class="w-6 h-6 text-primary" />
              <h2 class="font-bold text-xl">Périmètre de labellisation</h2>
            </div>
            <UIcon
              v-if="user?.role === Role.FEEF || user?.role === Role.ENTITY"
              name="i-lucide-pencil"
              class="w-4 h-4 text-gray-400"
            />
          </div>
        </template>

        <div class="space-y-4">
          <div>
            <label class="text-sm font-medium text-gray-700 mb-2">Périmètre souhaité</label>
            <p class="text-sm text-gray-900">{{ getFieldValue('labelingScopeRequestedScope') || 'Non défini' }}</p>
          </div>

          <!-- Alerte rouge si exclusions -->
          <div v-if="getFieldValue('labelingScopeExcludeYesno')" class="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div class="flex items-start gap-3">
              <UIcon name="i-lucide-alert-triangle" class="w-5 h-5 text-red-600 mt-0.5" />
              <div class="flex-1">
                <h5 class="font-semibold text-red-800 mb-2">Activités exclues du périmètre</h5>
                <div class="space-y-2">
                  <div>
                    <label class="block text-xs font-medium text-red-700 mb-1">Activités concernées :</label>
                    <p class="text-sm text-red-900 bg-white p-2 rounded border border-red-200">
                      {{ getFieldValue('labelingScopeExcludeActivities') || 'Non défini' }}
                    </p>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-red-700 mb-1">Raison de l'exclusion :</label>
                    <p class="text-sm text-red-900 bg-white p-2 rounded border border-red-200">
                      {{ getFieldValue('labelingScopeExcludeReason') || 'Non défini' }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Groupe 7: Activities (ActivitesGrid avec badges) -->
      <UCard
        :class="[
          'cursor-pointer hover:shadow-md transition-shadow',
          { 'pointer-events-none': user?.role !== Role.FEEF && user?.role !== Role.ENTITY }
        ]"
        @click="user?.role === Role.FEEF || user?.role === Role.ENTITY ? openFieldGroupEditor('activities') : undefined"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-activity" class="w-6 h-6 text-primary" />
              <h2 class="font-bold text-xl">Activités de l'entreprise</h2>
            </div>
            <UIcon
              v-if="user?.role === Role.FEEF || user?.role === Role.ENTITY"
              name="i-lucide-pencil"
              class="w-4 h-4 text-gray-400"
            />
          </div>
        </template>

        <div class="space-y-4">
          <div>
            <label class="text-sm font-medium text-gray-700 mb-2">Descriptif</label>
            <p class="text-sm text-gray-900">{{ getFieldValue('activitiesDescription') || 'Non défini' }}</p>
          </div>

          <!-- Grid 3 colonnes avec badges -->
          <div class="grid grid-cols-3 gap-4">
            <!-- Production -->
            <div>
              <h5 class="font-medium text-gray-900 mb-2">Production</h5>
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <div :class="['w-3 h-3 rounded-full', getFieldValue('activitiesProductionInhouse') ? 'bg-green-500' : 'bg-gray-300']"></div>
                  <span class="text-sm">En propre</span>
                </div>
                <div class="flex items-center gap-2">
                  <div :class="['w-3 h-3 rounded-full', getFieldValue('activitiesProductionSubcontracted') ? 'bg-orange-500' : 'bg-gray-300']"></div>
                  <span class="text-sm">Sous-traitance</span>
                </div>
              </div>
            </div>

            <!-- Conditionnement -->
            <div>
              <h5 class="font-medium text-gray-900 mb-2">Conditionnement</h5>
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <div :class="['w-3 h-3 rounded-full', getFieldValue('activitiesPackagingInhouse') ? 'bg-green-500' : 'bg-gray-300']"></div>
                  <span class="text-sm">En propre</span>
                </div>
                <div class="flex items-center gap-2">
                  <div :class="['w-3 h-3 rounded-full', getFieldValue('activitiesPackagingSubcontracted') ? 'bg-orange-500' : 'bg-gray-300']"></div>
                  <span class="text-sm">Sous-traitance</span>
                </div>
              </div>
            </div>

            <!-- Logistique -->
            <div>
              <h5 class="font-medium text-gray-900 mb-2">Logistique</h5>
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <div :class="['w-3 h-3 rounded-full', getFieldValue('activitiesLogisticsInhouse') ? 'bg-green-500' : 'bg-gray-300']"></div>
                  <span class="text-sm">En propre</span>
                </div>
                <div class="flex items-center gap-2">
                  <div :class="['w-3 h-3 rounded-full', getFieldValue('activitiesLogisticsSubcontracted') ? 'bg-orange-500' : 'bg-gray-300']"></div>
                  <span class="text-sm">Sous-traitance</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Groupes 8-9: Subcontracting et Trading (graphiques pourcentages) -->
      <UCard
        v-for="groupKey in ['subcontracting', 'trading']"
        :key="groupKey"
        :class="[
          'cursor-pointer hover:shadow-md transition-shadow',
          { 'pointer-events-none': user?.role !== Role.FEEF && user?.role !== Role.ENTITY }
        ]"
        @click="user?.role === Role.FEEF || user?.role === Role.ENTITY ? openFieldGroupEditor(groupKey) : undefined"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <UIcon :name="getGroupIcon(groupKey)" class="w-6 h-6 text-primary" />
              <h2 class="font-bold text-xl">{{ getGroupLabel(groupKey) }}</h2>
            </div>
            <UIcon
              v-if="user?.role === Role.FEEF || user?.role === Role.ENTITY"
              name="i-lucide-pencil"
              class="w-4 h-4 text-gray-400"
            />
          </div>
        </template>

        <div class="space-y-4">
          <div>
            <label class="text-sm font-medium text-gray-700 mb-2">Nature</label>
            <p class="text-sm text-gray-900 bg-white p-3 rounded border">
              {{ getFieldValue(`${groupKey}Nature`) || 'Non défini' }}
            </p>
          </div>

          <div class="grid grid-cols-2 gap-6">
            <!-- Part totale -->
            <div>
              <h5 class="text-sm font-medium text-gray-700 mb-3">Répartition du CA {{ groupKey === 'subcontracting' ? 'sous-traitance' : 'négoce' }}</h5>
              <div class="space-y-2">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">Part totale</span>
                  <span class="font-medium">{{ getFieldValue(`${groupKey}TotalRatio`) || 0 }}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div :class="groupKey === 'subcontracting' ? 'bg-purple-600' : 'bg-orange-600'" class="h-2 rounded-full transition-all duration-300" :style="`width: ${getFieldValue(`${groupKey}TotalRatio`) || 0}%`"></div>
                </div>
              </div>
            </div>

            <!-- Répartition géographique (barres empilées) -->
            <div>
              <h5 class="text-sm font-medium text-gray-700 mb-3">Répartition géographique</h5>

              <!-- Légende -->
              <div class="flex flex-wrap gap-4 mb-3">
                <div class="flex items-center gap-2 text-xs">
                  <div class="w-3 h-3 bg-blue-500 rounded"></div>
                  <span class="text-gray-600">France: {{ getFieldValue(`${groupKey}FranceRatio`) || 0 }}%</span>
                </div>
                <div class="flex items-center gap-2 text-xs">
                  <div class="w-3 h-3 bg-green-500 rounded"></div>
                  <span class="text-gray-600">Europe: {{ getFieldValue(`${groupKey}EuropeRatio`) || 0 }}%</span>
                </div>
                <div class="flex items-center gap-2 text-xs">
                  <div class="w-3 h-3 bg-orange-500 rounded"></div>
                  <span class="text-gray-600">Hors Europe: {{ getFieldValue(`${groupKey}NonEuropeRatio`) || 0 }}%</span>
                </div>
              </div>

              <!-- Graphique -->
              <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div class="h-full flex">
                  <div class="bg-blue-500 h-full transition-all duration-300" :style="`width: ${getFieldValue(`${groupKey}FranceRatio`) || 0}%`"></div>
                  <div class="bg-green-500 h-full transition-all duration-300" :style="`width: ${getFieldValue(`${groupKey}EuropeRatio`) || 0}%`"></div>
                  <div class="bg-orange-500 h-full transition-all duration-300" :style="`width: ${getFieldValue(`${groupKey}NonEuropeRatio`) || 0}%`"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Groupe 10: Products (grid + graphique alimentaire/non-alimentaire) -->
      <UCard
        :class="[
          'cursor-pointer hover:shadow-md transition-shadow',
          { 'pointer-events-none': user?.role !== Role.FEEF && user?.role !== Role.ENTITY }
        ]"
        @click="user?.role === Role.FEEF || user?.role === Role.ENTITY ? openFieldGroupEditor('products') : undefined"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-package" class="w-6 h-6 text-primary" />
              <h2 class="font-bold text-xl">Produits</h2>
            </div>
            <UIcon
              v-if="user?.role === Role.FEEF || user?.role === Role.ENTITY"
              name="i-lucide-pencil"
              class="w-4 h-4 text-gray-400"
            />
          </div>
        </template>

        <div class="space-y-4">
          <!-- Nature des produits (toute la largeur) -->
          <div>
            <label class="text-sm font-medium text-gray-700 mb-2">Nature des produits</label>
            <p class="text-sm text-gray-900 bg-white p-3 rounded border">
              {{ getFieldValue('productsNature') || 'Non défini' }}
            </p>
          </div>

          <div class="grid grid-cols-2 gap-6">
            <!-- Infos gammes et marques -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-sm font-medium text-gray-700 mb-1">Nombre de gammes</label>
                <div class="flex items-center gap-2">
                  <span class="text-2xl font-bold text-green-600">{{ getFieldValue('productsRangeCount') || 0 }}</span>
                  <span class="text-sm text-gray-500">gammes</span>
                </div>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-700 mb-1">Marques</label>
                <p class="text-sm text-gray-900">{{ getFieldValue('productsBrands') || 'Non défini' }}</p>
              </div>
            </div>

            <!-- Graphique alimentaire/non-alimentaire -->
            <div>
              <h5 class="text-sm font-medium text-gray-700 mb-3">Répartition par volume</h5>

              <!-- Légende -->
              <div class="flex flex-wrap gap-4 mb-3">
                <div class="flex items-center gap-2 text-xs">
                  <div class="w-3 h-3 bg-green-500 rounded"></div>
                  <span class="text-gray-600">Alimentaires: {{ getFieldValue('productsFoodRatio') || 0 }}%</span>
                </div>
                <div class="flex items-center gap-2 text-xs">
                  <div class="w-3 h-3 bg-blue-500 rounded"></div>
                  <span class="text-gray-600">Non-alimentaires: {{ getFieldValue('productsNonFoodRatio') || 0 }}%</span>
                </div>
              </div>

              <!-- Graphique -->
              <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div class="h-full flex">
                  <div class="bg-green-500 h-full transition-all duration-300" :style="`width: ${getFieldValue('productsFoodRatio') || 0}%`"></div>
                  <div class="bg-blue-500 h-full transition-all duration-300" :style="`width: ${getFieldValue('productsNonFoodRatio') || 0}%`"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Groupe 11: Employees (avec graphique camembert) -->
      <UCard
        :class="[
          'cursor-pointer hover:shadow-md transition-shadow',
          { 'pointer-events-none': user?.role !== Role.FEEF && user?.role !== Role.ENTITY }
        ]"
        @click="user?.role === Role.FEEF || user?.role === Role.ENTITY ? openFieldGroupEditor('employees') : undefined"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-users" class="w-6 h-6 text-primary" />
              <h2 class="font-bold text-xl">{{ getFieldValue('employeesTotalScopeCount') || 0 }} Salariés</h2>
            </div>
            <UIcon
              v-if="user?.role === Role.FEEF || user?.role === Role.ENTITY"
              name="i-lucide-pencil"
              class="w-4 h-4 text-gray-400"
            />
          </div>
        </template>

        <div class="grid grid-cols-2 gap-6">
          <!-- Graphique circulaire admin/production -->
          <div class="flex items-center gap-6">
            <div class="relative w-32 h-32 flex-shrink-0">
              <!-- SVG donut chart -->
              <svg viewBox="0 0 42 42" class="w-full h-full">
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#e5e7eb" stroke-width="3"/>
                <!-- Segment administratif (bleu) -->
                <circle
                  cx="21" cy="21" r="15.915"
                  fill="transparent" stroke="#3b82f6" stroke-width="3"
                  :stroke-dasharray="`${((getFieldValue('employeesAdminCount') || 0) / (getFieldValue('employeesTotalScopeCount') || 1)) * 100} ${100 - ((getFieldValue('employeesAdminCount') || 0) / (getFieldValue('employeesTotalScopeCount') || 1)) * 100}`"
                  stroke-dashoffset="25"
                  transform="rotate(-90 21 21)"
                />
                <!-- Segment production (vert) -->
                <circle
                  cx="21" cy="21" r="15.915"
                  fill="transparent" stroke="#10b981" stroke-width="3"
                  :stroke-dasharray="`${((getFieldValue('employeesProductionCount') || 0) / (getFieldValue('employeesTotalScopeCount') || 1)) * 100} ${100 - ((getFieldValue('employeesProductionCount') || 0) / (getFieldValue('employeesTotalScopeCount') || 1)) * 100}`"
                  :stroke-dashoffset="`${25 - ((getFieldValue('employeesAdminCount') || 0) / (getFieldValue('employeesTotalScopeCount') || 1)) * 100}`"
                  transform="rotate(-90 21 21)"
                />
              </svg>
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="text-center">
                  <div class="text-xl font-bold text-gray-900">{{ getFieldValue('employeesTotalScopeCount') || 0 }}</div>
                  <div class="text-xs text-gray-600">Total</div>
                </div>
              </div>
            </div>

            <div class="space-y-2 text-sm">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Administratif: {{ getFieldValue('employeesAdminCount') || 0 }}</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Production: {{ getFieldValue('employeesProductionCount') || 0 }}</span>
              </div>
              <div class="text-gray-600 text-sm mt-3 pt-2 border-t">
                <span class="font-medium">Personnel siège:</span> {{ getFieldValue('employeesHeadcountHq') || 0 }}
              </div>
            </div>
          </div>

          <!-- Infos CSE et ressources RSE -->
          <div class="space-y-2">
            <div class="flex items-center gap-3 p-2 bg-gray-50 rounded-lg w-fit">
              <UIcon name="i-lucide-shield-check" class="w-4 h-4 text-gray-600" />
              <span class="text-sm font-medium">CSE</span>
              <UBadge :variant="getFieldValue('employeesCsePresent') ? 'solid' : 'outline'" :color="getFieldValue('employeesCsePresent') ? 'success' : 'neutral'" size="sm">
                {{ getFieldValue('employeesCsePresent') ? 'Oui' : 'Non' }}
              </UBadge>
            </div>
            <div class="flex items-center gap-3 p-2 bg-gray-50 rounded-lg w-fit">
              <UIcon name="i-lucide-leaf" class="w-4 h-4 text-gray-600" />
              <span class="text-sm font-medium">Ressources RSE</span>
              <span class="font-semibold text-gray-900 text-sm">{{ getFieldValue('employeesRseResources') || 0 }} ETP/an</span>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Groupe 12: Bio Activities / Certifications (grille 3 colonnes) -->
      <UCard
        :class="[
          'cursor-pointer hover:shadow-md transition-shadow',
          { 'pointer-events-none': user?.role !== Role.FEEF && user?.role !== Role.ENTITY }
        ]"
        @click="user?.role === Role.FEEF || user?.role === Role.ENTITY ? openFieldGroupEditor('bio_activities') : undefined"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-leaf" class="w-6 h-6 text-primary" />
              <h2 class="font-bold text-xl">Labellisations et démarches RSE</h2>
            </div>
            <UIcon
              v-if="user?.role === Role.FEEF || user?.role === Role.ENTITY"
              name="i-lucide-pencil"
              class="w-4 h-4 text-gray-400"
            />
          </div>
        </template>

        <div class="space-y-6">
          <!-- Certification biologique -->
          <div class="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
            <UIcon name="i-lucide-leaf" class="w-6 h-6 text-green-600" />
            <div class="flex-1">
              <h5 class="font-medium text-gray-900 mb-1">Certification biologique</h5>
              <UBadge :color="getFieldValue('bioLabelPresent') ? 'success' : 'neutral'" variant="solid">
                {{ getFieldValue('bioLabelPresent') ? 'Certifié Bio' : 'Non certifié' }}
              </UBadge>
            </div>
          </div>

          <!-- Grille des autres labellisations -->
          <div class="grid grid-cols-3 gap-6">
            <!-- QSE -->
            <div class="space-y-3">
              <div class="flex items-center gap-2 mb-3">
                <UIcon name="i-lucide-shield-check" class="w-5 h-5 text-blue-600" />
                <h5 class="font-semibold text-gray-900">Qualité - Sécurité - Environnement</h5>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-2">Labellisation principale</label>
                <div class="bg-white p-3 rounded border border-gray-200">
                  <p class="text-sm text-gray-900 font-medium">
                    {{ getFieldValue('qseLabelPresent') || 'Aucune labellisation' }}
                  </p>
                </div>
              </div>
              <div v-if="getFieldValue('qseLabelOther')">
                <label class="block text-xs font-medium text-gray-600 mb-2">Autre QSE</label>
                <div class="bg-blue-50 p-3 rounded border border-blue-200">
                  <p class="text-sm text-blue-900 font-medium">
                    {{ getFieldValue('qseLabelOther') }}
                  </p>
                </div>
              </div>
            </div>

            <!-- RSE -->
            <div class="space-y-3">
              <div class="flex items-center gap-2 mb-3">
                <UIcon name="i-lucide-heart-handshake" class="w-5 h-5 text-purple-600" />
                <h5 class="font-semibold text-gray-900">Responsabilité Sociétale</h5>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-2">Labellisation principale</label>
                <div class="bg-white p-3 rounded border border-gray-200">
                  <p class="text-sm text-gray-900 font-medium">
                    {{ getFieldValue('rseLabelPresent') || 'Aucune démarche formalisée' }}
                  </p>
                </div>
              </div>
              <div v-if="getFieldValue('rseLabelOther')">
                <label class="block text-xs font-medium text-gray-600 mb-2">Autre RSE</label>
                <div class="bg-purple-50 p-3 rounded border border-purple-200">
                  <p class="text-sm text-purple-900 font-medium">
                    {{ getFieldValue('rseLabelOther') }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Commerce équitable -->
            <div class="space-y-3">
              <div class="flex items-center gap-2 mb-3">
                <UIcon name="i-lucide-handshake" class="w-5 h-5 text-orange-600" />
                <h5 class="font-semibold text-gray-900">Commerce Équitable</h5>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-2">Labellisation principale</label>
                <div class="bg-white p-3 rounded border border-gray-200">
                  <p class="text-sm text-gray-900 font-medium">
                    {{ getFieldValue('fairtradeLabelPresent') || 'Aucune certification' }}
                  </p>
                </div>
              </div>
              <div v-if="getFieldValue('fairtradeLabelOther')">
                <label class="block text-xs font-medium text-gray-600 mb-2">Autre équitable</label>
                <div class="bg-orange-50 p-3 rounded border border-orange-200">
                  <p class="text-sm text-orange-900 font-medium">
                    {{ getFieldValue('fairtradeLabelOther') }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </div>

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

    <!-- Slideover d'édition des groupes de champs -->
    <EntityFieldGroupEditor
      v-if="displayEntity"
      v-model:open="isFieldGroupEditorOpen"
      :entity-id="displayEntity.id"
      :group-key="selectedGroupKey"
      :fields="displayEntity.fields || []"
      @updated="handleRefreshEntity"
    />
</template>