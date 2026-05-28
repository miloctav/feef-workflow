<script setup lang="ts">
import { EntityType, EntityMode } from '#shared/types/enums'
import type { EntityTypeType, EntityModeType } from '#shared/types/enums'
import type { AdminChangeBody } from '~~/app/composables/useEntityAdmin'

/**
 * Menu déroulant compact d'administration FEEF, à insérer dans le header
 * de la carte entité. Affiché uniquement pour le rôle FEEF.
 *
 * Regroupe toutes les opérations administratives sensibles : conversion de
 * mode, changement de type, gestion des liens parent/enfant.
 */

const props = defineProps<{
  entity: {
    id: number
    name: string
    type: EntityTypeType
    mode: EntityModeType
    parentGroupId?: number | null
    parentGroup?: {
      id: number
      name: string
      type: EntityTypeType
      mode?: EntityModeType
    } | null
    siret: string
    oeId?: number | null
    oe?: { id: number; name: string } | null
    allowOeDocumentsAccess?: boolean
  }
  onRefresh?: () => void | Promise<void>
}>()

const { user } = useAuth()

const isFEEF = computed(() => user.value?.role === Role.FEEF)

// --- États des modales ---
const isModeConvertModalOpen = ref(false)
const isConfirmModalOpen = ref(false)
const isSelectParentModalOpen = ref(false)
const isSiretModalOpen = ref(false)
const isOeModalOpen = ref(false)

const confirmBody = ref<AdminChangeBody | null>(null)
const confirmTitle = ref('')
const confirmLabel = ref<string | undefined>(undefined)
const selectParentTitle = ref('')

const isMaster = computed(() => props.entity.mode === EntityMode.MASTER)
const isFollower = computed(() => props.entity.mode === EntityMode.FOLLOWER)
const hasParent = computed(() => !!props.entity.parentGroupId)

const parentTypeForLink = computed<EntityTypeType>(() =>
  props.entity.type === EntityType.GROUP ? EntityType.COMPANY : EntityType.GROUP,
)

const handleRefresh = async () => {
  if (props.onRefresh) {
    await props.onRefresh()
  }
}

// --- Conversion de mode ---
const convertToMaster = () => {
  if (hasParent.value) {
    isModeConvertModalOpen.value = true
  } else {
    confirmBody.value = { mode: EntityMode.MASTER }
    confirmTitle.value = `Convertir « ${props.entity.name} » en Maître`
    confirmLabel.value = 'Convertir'
    isConfirmModalOpen.value = true
  }
}

const convertToFollower = () => {
  confirmBody.value = { mode: EntityMode.FOLLOWER }
  confirmTitle.value = `Convertir « ${props.entity.name} » en Suiveuse`
  confirmLabel.value = 'Convertir'
  isConfirmModalOpen.value = true
}

// --- Changement de type ---
const changeType = () => {
  const newType = props.entity.type === EntityType.COMPANY ? EntityType.GROUP : EntityType.COMPANY
  confirmBody.value = { type: newType }
  confirmTitle.value = `Changer le type de « ${props.entity.name} »`
  confirmLabel.value = 'Changer le type'
  isConfirmModalOpen.value = true
}

// --- Délier ---
const unlink = () => {
  confirmBody.value = { parentGroupId: null }
  confirmTitle.value = `Délier « ${props.entity.name} »`
  confirmLabel.value = 'Délier'
  isConfirmModalOpen.value = true
}

// --- Sélection d'un parent (lier / transférer) ---
const openSelectParent = (action: 'link' | 'transfer') => {
  selectParentTitle.value =
    action === 'link'
      ? `Lier « ${props.entity.name} » à un maître`
      : `Transférer « ${props.entity.name} » vers un autre maître`
  isSelectParentModalOpen.value = true
}

// --- Modification SIRET / OE ---
const openSiretModal = () => {
  isSiretModalOpen.value = true
}

const openOeModal = () => {
  isOeModalOpen.value = true
}

// --- Items du menu déroulant (Nuxt UI v4) ---
const items = computed(() => {
  const groups: Array<Array<{ label: string; icon: string; onSelect: () => void }>> = []

  // Groupe 1 : conversion de mode
  groups.push([
    isFollower.value
      ? {
          label: 'Convertir en Maître',
          icon: 'i-lucide-arrow-up-circle',
          onSelect: convertToMaster,
        }
      : {
          label: 'Convertir en Suiveuse',
          icon: 'i-lucide-arrow-down-circle',
          onSelect: convertToFollower,
        },
    {
      label: `Changer en ${props.entity.type === EntityType.COMPANY ? 'Groupe' : 'Entreprise'}`,
      icon: 'i-lucide-replace',
      onSelect: changeType,
    },
  ])

  // Groupe 2 : gestion des liens (uniquement pour les FOLLOWER)
  if (isFollower.value) {
    const linkActions: Array<{ label: string; icon: string; onSelect: () => void }> = []
    if (hasParent.value) {
      linkActions.push({
        label: 'Délier du parent',
        icon: 'i-lucide-unlink',
        onSelect: unlink,
      })
      linkActions.push({
        label: 'Transférer vers un autre maître',
        icon: 'i-lucide-shuffle',
        onSelect: () => openSelectParent('transfer'),
      })
    } else {
      linkActions.push({
        label: 'Lier à un maître',
        icon: 'i-lucide-link',
        onSelect: () => openSelectParent('link'),
      })
    }
    groups.push(linkActions)
  }

  // Groupe 3 : informations administratives sensibles (SIRET, OE rattaché)
  groups.push([
    {
      label: 'Modifier le SIRET',
      icon: 'i-lucide-hash',
      onSelect: openSiretModal,
    },
    {
      label: props.entity.oeId ? 'Modifier l\'OE rattaché' : 'Assigner un OE',
      icon: 'i-lucide-shield-check',
      onSelect: openOeModal,
    },
  ])

  return groups
})
</script>

<template>
  <div v-if="isFEEF" class="inline-flex">
    <UDropdownMenu :items="items">
      <UButton
        icon="i-lucide-ellipsis-vertical"
        color="neutral"
        variant="ghost"
        size="sm"
        :aria-label="`Administration FEEF de ${entity.name}`"
      />
    </UDropdownMenu>

    <!-- Modale : conversion de mode avec choix détacher/inverser -->
    <EntityModeConvertModal
      v-model:open="isModeConvertModalOpen"
      :entity="entity"
      :on-applied="handleRefresh"
    />

    <!-- Modale : confirmation générique -->
    <EntityAdminConfirmModal
      v-model:open="isConfirmModalOpen"
      :entity-id="entity.id"
      :body="confirmBody"
      :title="confirmTitle"
      :confirm-label="confirmLabel"
      :on-applied="handleRefresh"
    />

    <!-- Modale : sélection d'un parent (lier/transférer) -->
    <EntitySelectParentModal
      v-model:open="isSelectParentModalOpen"
      :entity="entity"
      :parent-type="parentTypeForLink"
      :title="selectParentTitle"
      :on-applied="handleRefresh"
    />

    <!-- Modale : modification du SIRET -->
    <EntityAdminSiretModal
      v-model:open="isSiretModalOpen"
      :entity="{ id: entity.id, name: entity.name, siret: entity.siret }"
      :on-applied="handleRefresh"
    />

    <!-- Modale : modification de l'OE rattaché -->
    <EntityAdminOeModal
      v-model:open="isOeModalOpen"
      :entity="{
        id: entity.id,
        name: entity.name,
        oeId: entity.oeId,
        oe: entity.oe,
        allowOeDocumentsAccess: entity.allowOeDocumentsAccess,
      }"
      :on-applied="handleRefresh"
    />
  </div>
</template>
