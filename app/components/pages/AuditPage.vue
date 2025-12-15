<script setup lang="ts">
import {
  getAuditTypeLabel,
  getAuditTypeColor,
  getAuditStatusLabel,
  getAuditStatusColor,
} from '#shared/types/enums'

const { user } = useAuth()

// Récupérer l'audit courant depuis le composable
const { currentAudit } = useAudits()
const { currentEntity, fetchEntity } = useEntities()

// Sélectionner l'onglet initial en fonction du statut de l'audit
const getInitialTab = () => {
  if (!currentAudit.value?.status) {
    return 'dossier' // Par défaut si pas de statut
  }

  const status = currentAudit.value.status

  // Si statut PENDING_CASE_APPROVAL ou PENDING_OE_CHOICE → onglet dossier
  if (status === AuditStatus.PENDING_CASE_APPROVAL || status === AuditStatus.PENDING_OE_CHOICE) {
    return 'dossier'
  }

  // Si statut PLANNING → onglet planification d'audit
  if (status === AuditStatus.PLANNING || status === AuditStatus.SCHEDULED || status === AuditStatus.PENDING_OE_ACCEPTANCE) {
    return 'audit'
  }

  // Sinon → onglet décision
  return 'decision'
}

const selectedTab = ref('dossier')

// Stocker l'entityId pr�c�dent pour �viter les refetch inutiles
const previousEntityId = ref<number | null>(null)

// Watcher pour charger l'entit� et s�lectionner l'onglet d�s que l'audit est disponible
watch(
  currentAudit,
  async (audit) => {
    if (audit?.entityId) {
      // Ne fetch l'entit� que si l'entityId a chang�
      if (previousEntityId.value !== audit.entityId) {
        console.log('Fetching entity for audit:', audit)
        await fetchEntity(audit.entityId)
        previousEntityId.value = audit.entityId
      }

      // Sélectionner l'onglet en fonction du statut
      selectedTab.value = getInitialTab()
    }
  },
  { immediate: true }
)

// Configuration des tabs
const tabItems = computed(() => {
  const tabs = [
    {
      label: 'Documents',
      icon: 'i-lucide-folder',
      slot: 'documents',
      value: 'documents',
    },
    {
      label: 'Dossier',
      icon: 'i-lucide-file-text',
      slot: 'dossier',
      value: 'dossier',
    },
  ]

  // Afficher les tabs "Planification d'audit" et "Décision" uniquement si un OE est affecté
  if (
    currentAudit.value?.status !== AuditStatus.PENDING_OE_CHOICE &&
    currentAudit.value?.status !== AuditStatus.PENDING_CASE_APPROVAL
  ) {
    tabs.push(
      {
        label: "Planification d'audit",
        icon: 'i-lucide-search',
        slot: 'audit',
        value: 'audit',
      },
      {
        label: 'Décision',
        icon: 'i-lucide-scale',
        slot: 'decision',
        value: 'decision',
      }
    )
  }

  return tabs
})

// Helper pour formater le type d'audit
const auditTypeLabel = computed(() => {
  if (!currentAudit.value) return 'Initial'
  return getAuditTypeLabel(currentAudit.value.type)
})

// Helper pour la couleur du badge
const auditTypeBadgeColor = computed(() => {
  if (!currentAudit.value) return 'primary'
  return getAuditTypeColor(currentAudit.value.type)
})

// Générer l'URL de la page entité en fonction du rôle
const getEntityPageUrl = () => {
  if (!currentAudit.value?.entity?.id) return '#'

  const entityId = currentAudit.value.entity.id

  // Redirection selon le rôle
  switch (user.value?.role) {
    case Role.FEEF:
      return `/feef/entities/${entityId}`
    case Role.OE:
      return `/oe/entities/${entityId}`
    case Role.ENTITY:
      return `/company/case`
    default:
      return '#'
  }
}

// Helper pour le label du statut
const auditStatusLabel = computed(() => {
  if (!currentAudit.value?.status) return 'En attente'
  return getAuditStatusLabel(currentAudit.value.status)
})

// Helper pour la couleur du badge statut
const auditStatusBadgeColor = computed(() => {
  if (!currentAudit.value?.status) return 'neutral'
  return getAuditStatusColor(currentAudit.value.status)
})

import ActionsList from '~/components/actions/ActionsList.vue'
import { useActions } from '~/composables/useActions'

// Actions liées à l'audit courant (réactif sur currentAudit)
const { actions, fetchLoading, fetchError } = useActions({
  auditId: computed(() => currentAudit.value?.id),
})

// S'assurer que actions est toujours un tableau
const safeActions = computed(() => actions.value || [])
</script>

<template>
  <div
    v-if="currentAudit"
    class="space-y-6"
  >
    <!-- Card principale avec informations du dossier -->
    <div class="px-6">
      <UCard class="mb-6">
        <div class="flex items-start gap-6">
          <!-- Icône dossier à gauche avec badges type et statut -->
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
            <UBadge
              variant="soft"
              :color="auditStatusBadgeColor"
              size="md"
            >
              {{ auditStatusLabel }}
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
                  <NuxtLink
                    v-if="user?.role !== Role.AUDITOR"
                    :to="getEntityPageUrl()"
                    class="text-gray-900 font-medium hover:text-primary hover:underline cursor-pointer"
                  >
                    {{ currentAudit?.entity?.name }}
                  </NuxtLink>
                  <span
                    v-else
                    class="text-gray-900 font-medium"
                  >
                    {{ currentAudit?.entity?.name }}
                  </span>
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
                  <UIcon
                    name="i-lucide-phone"
                    class="w-4 h-4 text-gray-500"
                  />
                  <span class="text-gray-900">01 23 45 67 89</span>
                </div>

                <div class="flex items-center gap-2">
                  <UIcon
                    name="i-lucide-mail"
                    class="w-4 h-4 text-gray-500"
                  />
                  <a
                    href="mailto:jean.dupont@example.com"
                    class="text-primary hover:underline"
                  >
                    jean.dupont@example.com
                  </a>
                </div>
              </div>
            </div>

            <!-- Colonne 3: Organisme Évaluateur -->
            <div>
              <h2 class="font-bold text-xl text-gray-900 mb-4">Organisme Évaluateur</h2>

              <div class="space-y-3">
                <div
                  v-if="currentAudit?.oe"
                  class="flex items-center gap-2"
                >
                  <span class="text-sm font-medium text-gray-600">OE:</span>
                  <span class="text-gray-900 font-medium">{{ currentAudit?.oe?.name }}</span>
                </div>
                <div
                  v-else
                  class="flex items-center gap-2"
                >
                  <span class="text-sm font-medium text-gray-600">OE:</span>
                  <span class="text-gray-500 italic">Non assigné</span>
                </div>

                <div
                  v-if="currentAudit?.auditor"
                  class="flex items-center gap-2"
                >
                  <span class="text-sm font-medium text-gray-600">Auditeur:</span>
                  <span class="text-gray-900"
                    >{{ currentAudit?.auditor?.firstname }}
                    {{ currentAudit?.auditor?.lastname }}</span
                  >
                </div>
                <div
                  v-else
                  class="flex items-center gap-2"
                >
                  <span class="text-sm font-medium text-gray-600">Auditeur:</span>
                  <span class="text-gray-500 italic">Non assigné</span>
                </div>

                <AssignAuditorModal
                  v-if="user?.role === Role.OE && currentAudit?.oeId"
                  :audit-id="currentAudit?.id"
                  :current-auditor-id="currentAudit?.auditorId"
                  :current-auditor-name="
                    currentAudit?.auditor
                      ? `${currentAudit.auditor.firstname} ${currentAudit.auditor.lastname}`
                      : null
                  "
                  :oe-id="currentAudit?.oeId"
                  class="mt-3"
                />
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Liste des actions liées à l'audit -->
    <div
      v-if="currentAudit?.id"
      class="px-6"
    >
      <ActionsList
        v-if="currentAudit.id"
        :key="`actions-list-${currentAudit.id}`"
        :actions="safeActions"
        :loading="fetchLoading"
        :error="fetchError"
      />
    </div>

    <!-- Tabs pour les différentes sections -->
    <div class="px-6">
      <UTabs
        v-model="selectedTab"
        :items="tabItems"
      >
        <template #documents>
          <div class="py-6">
            <DocumentaryReviewTab
              v-if="currentAudit"
              :entity-id="currentAudit.entityId"
            />
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
