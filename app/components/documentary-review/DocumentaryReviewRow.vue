<template>
  <div
    class="group relative flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors"
    :class="[
      isDropTarget ? 'bg-primary-50 ring-1 ring-inset ring-primary-400' : 'hover:bg-gray-50',
      uploading ? 'opacity-60 pointer-events-none' : '',
    ]"
    @click="emit('open', document)"
    @dragenter.prevent.stop="onDragEnter"
    @dragover.prevent.stop="onDragOver"
    @dragleave.stop="onDragLeave"
    @drop.prevent.stop="onDrop"
  >
    <!-- Icône du fichier, teintée selon le statut -->
    <div
      class="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-md"
      :class="iconBackgroundClass"
    >
      <UIcon
        :name="fileIcon"
        class="w-4 h-4"
        :class="iconColorClass"
      />
    </div>

    <!-- Titre, statut et métadonnées -->
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <span class="font-medium text-sm text-gray-900 truncate">{{ document.title }}</span>
        <UBadge
          :color="statusMeta.color"
          :icon="statusMeta.icon"
          variant="soft"
          size="sm"
          class="flex-shrink-0"
        >
          {{ statusMeta.label }}
        </UBadge>
      </div>

      <p class="text-xs text-gray-500 truncate mt-0.5">
        <template v-if="latestVersion">
          Déposé le {{ formatDateShort(latestVersion.uploadAt) }}
          <template v-if="uploaderName"> par {{ uploaderName }}</template>
          <template v-if="uploadedVersions.length > 1">
            | {{ uploadedVersions.length }} versions
          </template>
        </template>
        <template v-else-if="pendingRequest">
          Demandé le {{ formatDateShort(pendingRequest.askedAt ?? pendingRequest.uploadAt) }}
          <template v-if="requesterName"> par {{ requesterName }}</template>
        </template>
        <template v-else> Aucun fichier déposé </template>
      </p>
    </div>

    <!-- Actions, révélées au survol ou au focus clavier -->
    <div
      class="flex-shrink-0 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
      @click.stop
    >
      <DocumentRequestUpdateModal
        v-if="canRequestUpdate && !pendingRequest"
        :documentary-review-id="document.id"
        :document-title="document.title"
        button-label="Demander une mise à jour"
        button-size="xs"
        color="neutral"
        variant="ghost"
        icon-only
        @update-requested="emit('updateRequested')"
      />

      <UTooltip
        v-if="canUpload"
        text="Déposer un fichier"
      >
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-lucide-upload"
          :loading="uploading"
          aria-label="Déposer un fichier"
          @click="triggerFilePicker"
        />
      </UTooltip>

      <UTooltip
        v-if="canDelete"
        text="Supprimer le document"
      >
        <UButton
          color="error"
          variant="ghost"
          size="xs"
          icon="i-lucide-trash-2"
          :loading="deleteLoading"
          aria-label="Supprimer le document"
          @click="emit('delete', document)"
        />
      </UTooltip>
    </div>

    <UIcon
      name="i-lucide-chevron-right"
      class="w-4 h-4 flex-shrink-0 text-gray-300 group-hover:text-gray-500"
    />

    <!-- Sélecteur de fichier masqué, piloté par le bouton d'upload -->
    <input
      ref="fileInput"
      type="file"
      class="hidden"
      @change="onFileSelected"
    >

    <!-- Voile affiché pendant un glisser-déposer sur la ligne -->
    <div
      v-if="isDropTarget"
      class="absolute inset-0 flex items-center justify-center bg-primary-50/90 pointer-events-none"
    >
      <span class="text-xs font-medium text-primary-700 flex items-center gap-1.5">
        <UIcon
          name="i-lucide-upload-cloud"
          class="w-4 h-4"
        />
        Déposer pour ajouter une version
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DocumentaryReview } from '~~/app/types/documentaryReviews'
import DocumentRequestUpdateModal from '~/components/DocumentRequestUpdateModal.vue'
import { getFileTypeIcon } from '~~/app/utils/documentMimeTypes'
import { formatDateShort } from '~~/app/utils/dates'
import {
  DocumentaryReviewStatusMeta,
  formatAccountName,
  getDocumentaryReviewStatus,
  getPendingRequest,
  getUploadedVersions,
} from '~~/app/utils/documentaryReviewStatus'

interface Props {
  document: DocumentaryReview
  canDelete?: boolean
  canRequestUpdate?: boolean
  canUpload?: boolean
  deleteLoading?: boolean
  uploading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  open: [document: DocumentaryReview]
  delete: [document: DocumentaryReview]
  upload: [document: DocumentaryReview, file: File]
  updateRequested: []
}>()

const fileInput = ref<HTMLInputElement | null>(null)

// Compteur de dragenter/dragleave : les enfants de la ligne génèrent leurs propres évènements
const dragDepth = ref(0)
const isDropTarget = computed(() => props.canUpload && dragDepth.value > 0)

const uploadedVersions = computed(() => getUploadedVersions(props.document))
const latestVersion = computed(() => uploadedVersions.value[0])
const pendingRequest = computed(() => getPendingRequest(props.document))
const statusMeta = computed(() => DocumentaryReviewStatusMeta[getDocumentaryReviewStatus(props.document)])

const uploaderName = computed(() => formatAccountName(latestVersion.value?.uploadByAccount))
const requesterName = computed(() => formatAccountName(pendingRequest.value?.askedByAccount))

const fileIcon = computed(() =>
  latestVersion.value ? getFileTypeIcon(latestVersion.value.mimeType) : 'i-lucide-file-plus'
)

const iconBackgroundClass = computed(() => {
  if (pendingRequest.value) return 'bg-amber-50'
  return latestVersion.value ? 'bg-blue-50' : 'bg-gray-100'
})

const iconColorClass = computed(() => {
  if (pendingRequest.value) return 'text-amber-600'
  return latestVersion.value ? 'text-blue-600' : 'text-gray-400'
})

function onDragEnter(event: DragEvent) {
  if (!props.canUpload || !hasFiles(event)) return
  dragDepth.value++
}

function onDragOver(event: DragEvent) {
  if (!props.canUpload || !event.dataTransfer) return
  event.dataTransfer.dropEffect = 'copy'
}

function onDragLeave() {
  if (dragDepth.value > 0) dragDepth.value--
}

function onDrop(event: DragEvent) {
  dragDepth.value = 0
  if (!props.canUpload) return

  const file = event.dataTransfer?.files?.[0]
  if (file) emit('upload', props.document, file)
}

function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files')
}

function triggerFilePicker() {
  fileInput.value?.click()
}

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('upload', props.document, file)
  input.value = ''
}
</script>
