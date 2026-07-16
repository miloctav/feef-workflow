<template>
  <div
    class="relative rounded-lg border bg-white overflow-hidden transition-colors"
    :class="isDropTarget ? 'border-primary-400 ring-1 ring-primary-400' : 'border-gray-200'"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <!-- En-tête : déclencheur de repli à gauche, actions à droite -->
    <div class="flex items-center gap-2 pr-3">
      <button
        type="button"
        class="flex flex-1 items-center gap-3 px-3 py-3 text-left min-w-0"
        :aria-expanded="isOpen"
        @click="isOpen = !isOpen"
      >
        <UIcon
          name="i-lucide-chevron-right"
          class="w-4 h-4 flex-shrink-0 text-gray-400 transition-transform"
          :class="isOpen ? 'rotate-90' : ''"
        />
        <UIcon
          :name="icon"
          class="w-5 h-5 flex-shrink-0"
          :class="iconColor"
        />
        <span class="font-semibold text-sm text-gray-900 truncate">{{ title }}</span>
        <span class="text-xs text-gray-500 flex-shrink-0">
          {{ documents.length }} document{{ documents.length > 1 ? 's' : '' }}
        </span>

        <UBadge
          v-if="pendingCount > 0"
          color="warning"
          variant="soft"
          size="sm"
          class="flex-shrink-0"
        >
          {{ pendingCount }} en attente
        </UBadge>

        <UTooltip
          :text="`Accès : ${accessLabel}`"
          class="ml-auto flex-shrink-0"
        >
          <span class="flex items-center gap-1 text-xs text-gray-400">
            <UIcon
              name="i-lucide-users"
              class="w-3.5 h-3.5"
            />
            {{ accessLabel }}
          </span>
        </UTooltip>
      </button>

      <div class="flex-shrink-0">
        <slot name="actions" />
      </div>
    </div>

    <!-- Contenu -->
    <div
      v-show="isOpen"
      class="border-t border-gray-100"
    >
      <div
        v-if="documents.length === 0"
        class="px-4 py-8 text-center"
      >
        <UIcon
          name="i-lucide-inbox"
          class="w-8 h-8 mx-auto mb-2 text-gray-300"
        />
        <p class="text-sm text-gray-500">{{ emptyLabel }}</p>
        <p
          v-if="canDrop"
          class="text-xs text-gray-400 mt-1"
        >
          Glissez-déposez vos fichiers ici pour les ajouter
        </p>
      </div>

      <div
        v-else
        class="divide-y divide-gray-100"
      >
        <slot />
      </div>
    </div>

    <!-- Voile de glisser-déposer sur la section : crée un nouveau document -->
    <div
      v-if="isDropTarget"
      class="absolute inset-0 flex items-center justify-center bg-primary-50/90 pointer-events-none"
    >
      <span class="text-sm font-medium text-primary-700 flex items-center gap-2">
        <UIcon
          name="i-lucide-upload-cloud"
          class="w-5 h-5"
        />
        Déposer pour ajouter des documents dans « {{ title }} »
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string
  icon: string
  iconColor: string
  documents: unknown[]
  pendingCount?: number
  accessLabel: string
  canDrop?: boolean
  emptyLabel?: string
  defaultOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  pendingCount: 0,
  emptyLabel: 'Aucun document dans cette catégorie',
  defaultOpen: true,
})

const emit = defineEmits<{
  drop: [files: File[]]
}>()

const isOpen = ref(props.defaultOpen)

// Compteur de dragenter/dragleave : les enfants de la section génèrent leurs propres évènements
const dragDepth = ref(0)
const isDropTarget = computed(() => props.canDrop && dragDepth.value > 0)

function onDragEnter(event: DragEvent) {
  if (!props.canDrop || !hasFiles(event)) return
  dragDepth.value++
}

function onDragOver(event: DragEvent) {
  if (!props.canDrop || !event.dataTransfer) return
  event.dataTransfer.dropEffect = 'copy'
}

function onDragLeave() {
  if (dragDepth.value > 0) dragDepth.value--
}

function onDrop(event: DragEvent) {
  dragDepth.value = 0
  if (!props.canDrop) return

  const files = Array.from(event.dataTransfer?.files ?? [])
  if (files.length > 0) emit('drop', files)
}

function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files')
}
</script>
