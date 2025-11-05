<template>
  <UCard class="overflow-hidden">
    <UAccordion
      type="single"
      :items="[accordionItem]"
      :default-value="[accordionItem.value]"
    >
      <template #leading>
        <div class="flex items-center gap-4">
          <div :class="iconContainerClass">
            <UIcon :name="icon" class="w-6 h-6" :class="iconClass" />
          </div>
          <div>
            <div class="flex items-center gap-3">
              <h3 class="font-bold text-lg text-gray-900">{{ title }}</h3>
              <slot name="badges" />
            </div>
            <p class="text-sm text-gray-600 mt-0.5">
              {{ contracts.length }} contrat{{ contracts.length > 1 ? 's' : '' }}
            </p>
          </div>
        </div>
      </template>

      <template #content>
        <div class="px-6 pb-6 pt-4">
          <!-- État vide -->
          <div v-if="contracts.length === 0" class="text-center py-8 text-gray-500">
            <UIcon name="i-lucide-inbox" class="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>{{ emptyMessage }}</p>
          </div>

          <!-- Liste des contrats -->
          <div v-else class="space-y-3">
            <div
              v-for="contract in contracts"
              :key="contract.id"
              class="p-4 rounded-lg border-2 transition-all duration-200 group border-gray-200 hover:border-blue-400 hover:shadow-lg bg-white cursor-pointer"
              @click="$emit('contract-click', contract)"
            >
              <div class="flex items-start gap-4">
                <!-- Icône du contrat -->
                <div class="flex-shrink-0">
                  <div class="p-3 rounded-lg bg-blue-50">
                    <UIcon
                      name="i-lucide-file-text"
                      class="w-6 h-6 text-blue-500"
                    />
                  </div>
                </div>

                <!-- Informations du contrat -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-4">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <h4 class="font-semibold text-base text-gray-900 group-hover:text-blue-900">
                          {{ contract.title }}
                        </h4>
                        <UIcon name="i-lucide-eye" class="w-4 h-4 text-gray-400 group-hover:text-blue-500" />

                        <!-- Badge statut de signature -->
                        <UBadge
                          v-if="contract.requiresSignature"
                          :color="getSignatureStatusColor(contract.signatureStatus)"
                          variant="subtle"
                          size="sm"
                        >
                          {{ getSignatureStatusLabel(contract.signatureStatus) }}
                        </UBadge>
                      </div>
                      <p v-if="contract.description" class="text-sm text-gray-600 mt-1.5">
                        {{ contract.description }}
                      </p>

                      <!-- Métadonnées -->
                      <div class="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
                        <span class="flex items-center gap-1.5">
                          <UIcon name="i-lucide-calendar" class="w-3.5 h-3.5" />
                          Créé le {{ formatDate(contract.createdAt) }}
                        </span>
                        <span v-if="contract.updatedAt && contract.updatedAt !== contract.createdAt" class="flex items-center gap-1.5">
                          <UIcon name="i-lucide-refresh-cw" class="w-3.5 h-3.5" />
                          Modifié le {{ formatDate(contract.updatedAt) }}
                        </span>
                      </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex-shrink-0 flex gap-2">
                      <!-- Bouton Signer -->
                      <UButton
                        v-if="canSignContract(contract)"
                        icon="i-lucide-pen-line"
                        size="sm"
                        color="primary"
                        variant="soft"
                        @click.stop="$emit('sign-click', contract)"
                      >
                        Signer
                      </UButton>

                      <!-- Actions existantes -->
                      <slot v-if="canEditContract(contract)" name="contract-actions" :contract="contract" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UAccordion>
  </UCard>
</template>

<script setup lang="ts">
interface Props {
  title: string
  contracts: any[]
  accordionValue: string
  color?: 'blue' | 'purple'
  icon: string
  emptyMessage?: string
}

interface Emits {
  (e: 'contract-click', contract: any): void
  (e: 'sign-click', contract: any): void
}

const props = withDefaults(defineProps<Props>(), {
  color: 'blue',
  emptyMessage: 'Aucun contrat'
})

defineEmits<Emits>()

const { user } = useAuth()

// Classes CSS calculées selon la couleur
const iconContainerClass = computed(() => {
  const baseClasses = 'p-3 rounded-lg'
  return `${baseClasses} ${props.color === 'blue' ? 'bg-blue-100' : 'bg-purple-100'}`
})

const iconClass = computed(() => {
  return props.color === 'blue' ? 'text-blue-500' : 'text-purple-500'
})

// Item pour l'accordéon
const accordionItem = computed(() => ({
  value: props.accordionValue,
  contracts: props.contracts,
}))

// Fonction pour vérifier si l'utilisateur peut éditer un contrat
function canEditContract(contract: any): boolean {
  if (!user.value) return false
  return contract.createdBy === user.value.id
}

// Fonction pour vérifier si l'utilisateur peut signer un contrat
function canSignContract(contract: any): boolean {
  if (!user.value || !contract.requiresSignature) return false

  // ENTITY peut signer si le statut est PENDING_ENTITY
  if (user.value.role === 'ENTITY' && contract.signatureStatus === 'PENDING_ENTITY') {
    return true
  }

  // FEEF peut signer si le statut est PENDING_FEEF
  if (user.value.role === 'FEEF' && contract.signatureStatus === 'PENDING_FEEF') {
    return true
  }

  return false
}

// Fonction pour obtenir la couleur du badge de statut
function getSignatureStatusColor(status: string | null): string {
  switch (status) {
    case 'DRAFT':
      return 'neutral'
    case 'PENDING_ENTITY':
      return 'amber'
    case 'PENDING_FEEF':
      return 'orange'
    case 'COMPLETED':
      return 'green'
    default:
      return 'neutral'
  }
}

// Fonction pour obtenir le label du badge de statut
function getSignatureStatusLabel(status: string | null): string {
  switch (status) {
    case 'DRAFT':
      return 'Brouillon'
    case 'PENDING_ENTITY':
      return 'En attente Entity'
    case 'PENDING_FEEF':
      return 'En attente FEEF'
    case 'COMPLETED':
      return 'Signé'
    default:
      return 'Inconnu'
  }
}

// Fonction utilitaire pour formater les dates
function formatDate(date: Date | string): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
</script>