<script setup lang="ts">
import { z } from 'zod'
import { EntityType, EntityMode } from '#shared/types/enums'

const props = defineProps<{
  entityId: number
  entityType: 'COMPANY' | 'GROUP'
  existingCount: number
  onCreated?: () => void | Promise<void>
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const { user } = useAuth()
const { createEntity, linkFollowerEntity } = useEntities()

// Le type à lier/créer est l'inverse du type de l'entité maître
const followerType = computed(() =>
  props.entityType === 'GROUP' ? EntityType.COMPANY : EntityType.GROUP
)

// FEEF peut choisir entre créer ou lier, ENTITY ne peut que créer
const isFEEF = computed(() => user.value?.role === Role.FEEF)
const mode = ref<'create' | 'link'>('create')

const canAdd = computed(() => {
  if (props.entityType === 'GROUP') {
    return props.existingCount < 10
  }
  return props.existingCount < 1
})

const limitMessage = computed(() => {
  if (props.entityType === 'GROUP') {
    return `${props.existingCount}/10 entreprises`
  }
  return props.existingCount >= 1 ? 'Groupe déjà lié' : '0/1 groupe'
})

// --- Mode sélection (FEEF) ---
const availableEntities = ref<Array<{ id: number; name: string; siren?: string | null }>>([])
const selectedEntityId = ref<number | undefined>(undefined)
const loadingEntities = ref(false)

const loadAvailableEntities = async () => {
  loadingEntities.value = true
  try {
    // Charger les entités FOLLOWER du bon type, non liées (parentGroupId = null pour COMPANY)
    const params = new URLSearchParams({
      mode: EntityMode.FOLLOWER,
      type: followerType.value,
      limit: '100'
    })

    // Pour les COMPANY, filtrer celles sans parentGroupId
    if (followerType.value === EntityType.COMPANY) {
      params.append('parentGroupId', 'null')
    }

    const response = await $fetch<{ data: Array<{ id: number; name: string; siren?: string | null; parentGroupId?: number | null }> }>(
      `/api/entities?${params.toString()}`
    )

    // Filtrer côté client pour les GROUP (ceux qui ne sont pas déjà liés)
    if (followerType.value === EntityType.GROUP) {
      availableEntities.value = response.data.filter(e => !e.parentGroupId)
    } else {
      availableEntities.value = response.data
    }
  } catch (e) {
    console.error('Erreur chargement entités:', e)
    availableEntities.value = []
  } finally {
    loadingEntities.value = false
  }
}

const entityItems = computed(() =>
  availableEntities.value.map(e => ({
    label: e.siren ? `${e.name} (${e.siren})` : e.name,
    value: e.id
  }))
)

// --- Mode création (ENTITY) ---
const schema = z.object({
  name: z.string().min(1, 'Le nom est requis').min(3, 'Le nom doit contenir au moins 3 caractères'),
  siren: z.string().length(9, 'Le SIREN doit contenir 9 chiffres').optional().or(z.literal('')),
  siret: z.string().length(14, 'Le SIRET doit contenir 14 chiffres').optional().or(z.literal('')),
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  name: '',
  siren: '',
  siret: '',
})

const form = ref()
const loading = ref(false)

const resetForm = () => {
  state.name = ''
  state.siren = ''
  state.siret = ''
  selectedEntityId.value = undefined
}

const handleSubmit = async () => {
  loading.value = true

  let result: { success: boolean }

  if (mode.value === 'link') {
    // Mode liaison (FEEF)
    if (!selectedEntityId.value) {
      loading.value = false
      return
    }
    result = await linkFollowerEntity(selectedEntityId.value, props.entityId)
  } else {
    // Mode création (ENTITY)
    try {
      await form.value.validate()
    } catch {
      loading.value = false
      return
    }

    const data: any = {
      name: state.name,
      type: followerType.value,
      mode: EntityMode.FOLLOWER,
    }

    if (followerType.value === EntityType.COMPANY) {
      data.parentGroupId = props.entityId
    }

    if (state.siren) data.siren = state.siren
    if (state.siret) data.siret = state.siret

    result = await createEntity(data)
  }

  loading.value = false

  if (result.success) {
    resetForm()
    isOpen.value = false
    if (props.onCreated) {
      await props.onCreated()
    }
  }
}

watch(isOpen, (open) => {
  if (open && isFEEF.value) {
    loadAvailableEntities()
  }
  if (!open) {
    resetForm()
    mode.value = 'create'
  }
})

watch(mode, (newMode) => {
  if (newMode === 'link' && availableEntities.value.length === 0) {
    loadAvailableEntities()
  }
})
</script>

<template>
  <UModal v-model:open="isOpen">
    <UButton
      v-if="canAdd"
      icon="i-lucide-plus"
      variant="outline"
      size="sm"
    >
      Ajouter {{ entityType === 'GROUP' ? 'une entreprise' : 'un groupe' }}
    </UButton>

    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">
              {{ mode === 'link' ? 'Lier' : 'Créer' }} {{ entityType === 'GROUP' ? 'une entreprise suiveuse' : 'un groupe' }}
            </h3>
            <UBadge variant="subtle" color="neutral" size="sm">
              {{ limitMessage }}
            </UBadge>
          </div>
        </template>

        <!-- Toggle pour FEEF -->
        <div v-if="isFEEF" class="flex gap-2 mb-4">
          <UButton
            :variant="mode === 'create' ? 'solid' : 'outline'"
            size="sm"
            @click="mode = 'create'"
          >
            Créer
          </UButton>
          <UButton
            :variant="mode === 'link' ? 'solid' : 'outline'"
            size="sm"
            @click="mode = 'link'"
          >
            Lier existante
          </UButton>
        </div>

        <!-- Mode liaison -->
        <div v-if="mode === 'link'" class="space-y-4">
          <UFormField :label="entityType === 'GROUP' ? 'Entreprise suiveuse' : 'Groupe suiveur'">
            <USelectMenu
              v-model="selectedEntityId"
              :items="entityItems"
              :loading="loadingEntities"
              value-key="value"
              placeholder="Sélectionner une entité..."
              searchable
              class="w-full"
            />
          </UFormField>
          <p v-if="entityItems.length === 0 && !loadingEntities" class="text-sm text-gray-500">
            Aucune entité suiveuse disponible
          </p>
        </div>

        <!-- Mode création -->
        <UForm v-if="mode === 'create'" ref="form" :schema="schema" :state="state" class="space-y-4">
          <UFormField label="Nom" name="name" required>
            <UInput v-model="state.name" :placeholder="entityType === 'GROUP' ? 'Nom de l\'entreprise' : 'Nom du groupe'" icon="i-lucide-building" />
          </UFormField>

          <UFormField label="SIREN" name="siren">
            <UInput v-model="state.siren" placeholder="123456789" icon="i-lucide-hash" />
          </UFormField>

          <UFormField label="SIRET" name="siret">
            <UInput v-model="state.siret" placeholder="12345678901234" icon="i-lucide-hash" />
          </UFormField>
        </UForm>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton label="Annuler" color="neutral" variant="outline" @click="isOpen = false" />
            <UButton
              :label="mode === 'link' ? 'Lier' : 'Créer'"
              color="primary"
              :loading="loading"
              :disabled="mode === 'link' && !selectedEntityId"
              @click="handleSubmit"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
