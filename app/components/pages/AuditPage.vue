<script setup lang="ts">
const { user } = useAuth()

// Récupérer l'audit courant depuis le composable
const { currentAudit } = useAudits()
const { currentEntity, fetchEntity } = useEntities()

onMounted(async () => {
  if (currentAudit.value) {
    console.log('Fetching entity for audit:', currentAudit.value)
    await fetchEntity(currentAudit.value.entityId)
  }
})

const selectedTab = ref('documents')

// Configuration des tabs
const tabItems = computed(() => {
  const tabs = [
    {
      label: 'Documents',
      icon: 'i-lucide-folder',
      slot: 'documents',
      value: 'documents'
    },
    {
      label: 'Dossier',
      icon: 'i-lucide-file-text',
      slot: 'dossier',
      value: 'dossier'
    }
  ]

  // Afficher les tabs "Planification d'audit" et "Décision" uniquement si un OE est affecté
  if (currentAudit.value?.oeId) {
    tabs.push(
      {
        label: "Planification d'audit",
        icon: 'i-lucide-search',
        slot: 'audit',
        value: 'audit'
      },
      {
        label: 'Décision',
        icon: 'i-lucide-scale',
        slot: 'decision',
        value: 'decision'
      }
    )
  }

  return tabs
})

// Helper pour formater le type d'audit
const auditTypeLabel = computed(() => {
  if (!currentAudit.value) return 'Initial'

  const typeLabels = {
    'INITIAL': 'Initial',
    'RENEWAL': 'Renouvellement',
    'MONITORING': 'Suivi'
  }

  return typeLabels[currentAudit.value.type] || currentAudit.value.type
})

// Helper pour la couleur du badge
const auditTypeBadgeColor = computed(() => {
  if (!currentAudit.value) return 'primary'

  const colorMapping = {
    [AuditType.INITIAL]: 'primary',
    [AuditType.RENEWAL]: 'warning',
    [AuditType.MONITORING]: 'info'
  }

  return colorMapping[currentAudit.value.type] || 'primary'
})

</script>

<template>
  <div v-if="currentAudit" class="space-y-6">
    <!-- Card principale avec informations du dossier -->
    <div class="px-6">
      <UCard class="mb-6">
        <div class="flex items-start gap-6">
          <!-- Icône dossier à gauche avec badge type -->
          <div class="flex-shrink-0 flex flex-col items-center gap-3">
            <UIcon
              name="i-lucide-folder-check"
              class="w-16 h-16 text-primary"
            />
            <UBadge
              variant="solid"
              :color="auditTypeBadgeColor"
              size="lg"
            >
              {{ auditTypeLabel }}
            </UBadge>
          </div>

          <!-- Informations principales -->
          <div class="flex-1 grid grid-cols-3 gap-6">
            <!-- Colonne 1: Entreprise -->
            <div>
              <h2 class="font-bold text-xl text-gray-900 mb-4">Entreprise</h2>

              <div class="space-y-3">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-gray-600">Nom:</span>
                  <NuxtLink :to="`/entity/${currentAudit?.entity?.id}`" class="text-gray-900 font-medium hover:text-primary hover:underline cursor-pointer">
                    {{ currentAudit?.entity?.name }}
                  </NuxtLink>
                </div>

                <div v-if="currentAudit?.entity?.siren" class="flex items-center gap-2">
                  <span class="text-sm font-medium text-gray-600">SIREN:</span>
                  <span class="text-gray-900">{{ currentAudit?.entity?.siren }}</span>
                </div>

                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-gray-600">Localisation:</span>
                  <span class="text-gray-900">Paris, Île-de-France</span>
                </div>
              </div>
            </div>

            <!-- Colonne 2: Pilote -->
            <div>
              <h2 class="font-bold text-xl text-gray-900 mb-4">Pilote démarche</h2>

              <div class="space-y-3">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-gray-600">Nom:</span>
                  <span class="text-gray-900 font-medium">Jean Dupont</span>
                </div>

                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-gray-600">Fonction:</span>
                  <span class="text-gray-900">Responsable Qualité</span>
                </div>

                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-phone" class="w-4 h-4 text-gray-500" />
                  <span class="text-gray-900">01 23 45 67 89</span>
                </div>

                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-mail" class="w-4 h-4 text-gray-500" />
                  <a href="mailto:jean.dupont@example.com" class="text-primary hover:underline">
                    jean.dupont@example.com
                  </a>
                </div>
              </div>
            </div>

            <!-- Colonne 3: Organisme Évaluateur -->
            <div>
              <h2 class="font-bold text-xl text-gray-900 mb-4">Organisme Évaluateur</h2>

              <div class="space-y-3">
                <div v-if="currentAudit?.oe" class="flex items-center gap-2">
                  <span class="text-sm font-medium text-gray-600">OE:</span>
                  <span class="text-gray-900 font-medium">{{ currentAudit?.oe?.name }}</span>
                </div>
                <div v-else class="flex items-center gap-2">
                  <span class="text-sm font-medium text-gray-600">OE:</span>
                  <span class="text-gray-500 italic">Non assigné</span>
                </div>

                <div v-if="currentAudit?.auditor" class="flex items-center gap-2">
                  <span class="text-sm font-medium text-gray-600">Auditeur:</span>
                  <span class="text-gray-900">{{ currentAudit?.auditor?.firstname }} {{ currentAudit?.auditor?.lastname }}</span>
                </div>
                <div v-else class="flex items-center gap-2">
                  <span class="text-sm font-medium text-gray-600">Auditeur:</span>
                  <span class="text-gray-500 italic">Non assigné</span>
                </div>

                <AssignAuditorModal
                  v-if="user?.role === Role.OE && currentAudit?.oeId"
                  :audit-id="currentAudit?.id"
                  :current-auditor-id="currentAudit?.auditorId"
                  :current-auditor-name="currentAudit?.auditor ? `${currentAudit.auditor.firstname} ${currentAudit.auditor.lastname}` : null"
                  :oe-id="currentAudit?.oeId"
                  class="mt-3"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Périmètre de labellisation -->
        <div class="mt-6 pt-4 border-t border-gray-200">
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-target" class="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 class="font-semibold text-gray-900 mb-2">Périmètre de labellisation</h3>
              <p class="text-gray-700 text-sm leading-relaxed">
                Production et distribution de produits alimentaires locaux, incluant la transformation, le conditionnement et la logistique associée.
              </p>
            </div>
          </div>
        </div>

      </UCard>
    </div>

    <!-- Tabs pour les différentes sections -->
    <div class="px-6">
      <UTabs v-model="selectedTab" :items="tabItems">
        <template #documents>
          <div class="py-6">
            <DocumentaryReviewTab v-if="currentAudit" :entity-id="currentAudit.entityId" />
          </div>
        </template>

        <template #dossier>
          <div class="py-6">
            <EntityCase />
          </div>
        </template>

        <template #audit>
          <div class="py-6">
            <AuditPlanificationTab
              v-if="currentAudit"
              :entity-id="currentAudit.entityId"
              :role="user?.role === Role.OE ? 'oe' : user?.role === Role.FEEF ? 'feef' : 'company'"
            />
          </div>
        </template>

        <template #decision>
          <div class="py-6">
            <DecisionTab v-if="currentAudit" />
          </div>
        </template>
      </UTabs>
    </div>
  </div>
</template>
