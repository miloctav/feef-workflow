<script setup lang="ts">
import { EntityType, getEntityTypeLabel } from '#shared/types/enums'

const props = defineProps<{
  entity: {
    id: number
    type: 'COMPANY' | 'GROUP'
    mode: 'MASTER' | 'FOLLOWER'
    parentGroupId?: number | null
    parentGroup?: {
      id: number
      name: string
      type: 'COMPANY' | 'GROUP'
      siren?: string | null
      mode?: 'MASTER' | 'FOLLOWER'
      oe?: { readonly id: number; readonly name: string } | null
    } | null
    childEntities?: readonly {
      id: number
      name: string
      type: 'COMPANY' | 'GROUP'
      siren?: string | null
      oe?: { readonly id: number; readonly name: string } | null
    }[]
  }
  onRefresh?: () => void | Promise<void>
}>()

const { user } = useAuth()

const isAddModalOpen = ref(false)

// Pour GROUP master: childEntities (les COMPANY suiveuses)
// Pour COMPANY master: parentGroup si c'est un GROUP en mode FOLLOWER
const followers = computed(() => {
  if (props.entity.type === EntityType.GROUP) {
    return props.entity.childEntities || []
  } else {
    // COMPANY master - vérifier si le parentGroup est un GROUP follower
    if (props.entity.parentGroup && props.entity.parentGroup.mode === 'FOLLOWER') {
      return [props.entity.parentGroup]
    }
    return []
  }
})

const existingCount = computed(() => {
  if (props.entity.type === EntityType.GROUP) {
    return props.entity.childEntities?.length || 0
  } else {
    // Pour COMPANY: 1 si déjà lié à un groupe, 0 sinon
    return props.entity.parentGroupId ? 1 : 0
  }
})

const canManageFollowers = computed(() =>
  user.value?.role === Role.FEEF || user.value?.role === Role.ENTITY
)

const sectionTitle = computed(() =>
  props.entity.type === EntityType.GROUP
    ? 'Entreprises suiveuses'
    : 'Groupe lié'
)

const emptyMessage = computed(() =>
  props.entity.type === EntityType.GROUP
    ? 'Aucune entreprise suiveuse'
    : 'Aucun groupe lié'
)

const handleCreated = async () => {
  if (props.onRefresh) {
    await props.onRefresh()
  }
}
</script>

<template>
  <UCard v-if="entity.mode === 'MASTER'">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon
            :name="entity.type === 'GROUP' ? 'i-lucide-building-2' : 'i-lucide-network'"
            class="w-5 h-5 text-primary"
          />
          <h3 class="font-semibold text-gray-900">{{ sectionTitle }}</h3>
          <UBadge v-if="followers.length > 0" variant="subtle" color="primary" size="sm">
            {{ followers.length }}
          </UBadge>
        </div>

        <AddFollowerModal
          v-if="canManageFollowers"
          v-model:open="isAddModalOpen"
          :entity-id="entity.id"
          :entity-type="entity.type"
          :existing-count="existingCount"
          :on-created="handleCreated"
        />
      </div>
    </template>

    <!-- Liste des entités suiveuses -->
    <div v-if="followers.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="follower in followers"
        :key="follower.id"
        class="group relative bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-primary hover:shadow-sm transition-all cursor-pointer"
        @click="navigateTo(`/entity/followers/${follower.id}`)"
      >
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0">
            <UIcon
              :name="follower.type === 'GROUP' ? 'i-lucide-network' : 'i-lucide-building'"
              class="w-8 h-8 text-gray-400 group-hover:text-primary transition-colors"
            />
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-medium text-gray-900 truncate">{{ follower.name }}</h4>
            <div class="mt-1 space-y-1">
              <UBadge
                :color="follower.type === 'GROUP' ? 'secondary' : 'neutral'"
                variant="soft"
                size="xs"
              >
                {{ getEntityTypeLabel(follower.type) }}
              </UBadge>
              <div v-if="follower.siren" class="text-xs text-gray-500">
                SIREN: {{ follower.siren }}
              </div>
              <div v-if="follower.oe" class="text-xs text-gray-500">
                OE: {{ follower.oe.name }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Message si aucune suiveuse -->
    <div v-else class="text-center py-8">
      <UIcon
        :name="entity.type === 'GROUP' ? 'i-lucide-building' : 'i-lucide-network'"
        class="w-12 h-12 text-gray-300 mx-auto mb-3"
      />
      <p class="text-gray-500">{{ emptyMessage }}</p>
      <p v-if="canManageFollowers" class="text-sm text-gray-400 mt-1">
        Cliquez sur "Ajouter" pour {{ entity.type === 'GROUP' ? 'ajouter une entreprise' : 'lier un groupe' }}
      </p>
    </div>
  </UCard>
</template>
