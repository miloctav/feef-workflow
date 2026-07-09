<template>
  <UModal
    v-model:open="isOpen"
    title="Importer des rapports d'audit passés"
    description="Sélectionnez les rapports d'audit réalisés avant la mise en service de la plateforme. Chaque fichier est ajouté comme un document distinct, nommé d'après le fichier."
    :ui="{ footer: 'justify-end' }"
  >
    <UButton
      icon="i-lucide-upload"
      :size="props.buttonSize"
      :color="props.buttonColor"
      :variant="props.buttonVariant"
    >
      {{ props.buttonLabel }}
    </UButton>

    <template #body>
      <div class="space-y-4">
        <input
          ref="fileInput"
          type="file"
          multiple
          class="hidden"
          @change="handleFileSelect"
        >

        <UButton
          icon="i-lucide-file-plus"
          color="neutral"
          variant="outline"
          block
          :disabled="importing"
          @click="fileInput?.click()"
        >
          Sélectionner des fichiers
        </UButton>

        <div
          v-if="files.length === 0"
          class="text-center py-8 text-gray-500"
        >
          <UIcon
            name="i-lucide-inbox"
            class="w-12 h-12 mx-auto mb-2 text-gray-300"
          />
          <p class="text-sm">Aucun fichier sélectionné</p>
        </div>

        <div
          v-else
          class="space-y-2 max-h-72 overflow-y-auto"
        >
          <div
            v-for="(item, index) in files"
            :key="index"
            class="flex items-center gap-3 p-3 rounded-lg border border-gray-200"
          >
            <UIcon
              :name="statusIcon(item.status)"
              class="w-5 h-5 flex-shrink-0"
              :class="[statusColor(item.status), item.status === 'uploading' && 'animate-spin']"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">{{ item.file.name }}</p>
              <p
                v-if="item.error"
                class="text-xs text-red-600 mt-0.5"
              >
                {{ item.error }}
              </p>
            </div>
            <UButton
              v-if="!importing && item.status === 'pending'"
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="removeFile(index)"
            />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton
        label="Fermer"
        color="neutral"
        variant="outline"
        :disabled="importing"
        @click="isOpen = false"
      />
      <UButton
        label="Importer"
        color="primary"
        icon="i-lucide-upload"
        :loading="importing"
        :disabled="pendingFiles.length === 0"
        @click="handleImport"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { DocumentaryReview } from '~~/app/types/documentaryReviews'
import { DocumentaryReviewCategory } from '#shared/types/enums'

interface Props {
  entityId: number
  buttonLabel?: string
  buttonSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  buttonVariant?: 'solid' | 'outline' | 'soft' | 'subtle' | 'ghost' | 'link'
  buttonColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
}

const props = withDefaults(defineProps<Props>(), {
  buttonLabel: 'Importer des rapports',
  buttonSize: 'md',
  buttonVariant: 'solid',
  buttonColor: 'primary',
})

type ImportStatus = 'pending' | 'uploading' | 'done' | 'error'

interface ImportItem {
  file: File
  status: ImportStatus
  error?: string
}

const toast = useToast()
const { fetchDocumentaryReviews } = useDocumentaryReviews()

const isOpen = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const files = ref<ImportItem[]>([])
const importing = ref(false)

const pendingFiles = computed(() => files.value.filter(item => item.status === 'pending'))

// Réinitialiser la sélection à chaque ouverture du modal
watch(isOpen, (open) => {
  if (open) {
    files.value = []
  }
})

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files) return

  for (const file of Array.from(input.files)) {
    files.value.push({ file, status: 'pending' })
  }

  // Réinitialiser l'input pour permettre de resélectionner le même fichier
  input.value = ''
}

function removeFile(index: number) {
  files.value.splice(index, 1)
}

function statusIcon(status: ImportStatus): string {
  const icons: Record<ImportStatus, string> = {
    pending: 'i-lucide-file-text',
    uploading: 'i-lucide-loader-circle',
    done: 'i-lucide-check-circle',
    error: 'i-lucide-alert-circle',
  }
  return icons[status]
}

function statusColor(status: ImportStatus): string {
  const colors: Record<ImportStatus, string> = {
    pending: 'text-gray-400',
    uploading: 'text-primary',
    done: 'text-green-500',
    error: 'text-red-500',
  }
  return colors[status]
}

// Le titre du document reprend le nom du fichier, sans son extension
function buildTitle(filename: string): string {
  const withoutExtension = filename.replace(/\.[^.]+$/, '')
  return (withoutExtension || filename).slice(0, 255)
}

// Un fichier = une revue documentaire créée puis alimentée par sa première version
async function importFile(item: ImportItem) {
  const { data: documentaryReview } = await $fetch<{ data: DocumentaryReview }>(
    '/api/documentary-reviews',
    {
      method: 'POST',
      body: {
        entityId: props.entityId,
        title: buildTitle(item.file.name),
        category: DocumentaryReviewCategory.PAST_AUDIT_REPORT,
      },
    }
  )

  const formData = new FormData()
  formData.append('documentaryReviewId', documentaryReview.id.toString())
  formData.append('file', item.file)

  try {
    await $fetch('/api/documents-versions', { method: 'POST', body: formData })
  } catch (error) {
    // L'upload a échoué : ne pas laisser une revue documentaire sans fichier
    await $fetch(`/api/documentary-reviews/${documentaryReview.id}`, { method: 'DELETE' }).catch(
      () => {}
    )
    throw error
  }
}

async function handleImport() {
  importing.value = true

  let succeeded = 0
  let failed = 0

  for (const item of files.value) {
    if (item.status !== 'pending') continue

    item.status = 'uploading'
    item.error = undefined

    try {
      await importFile(item)
      item.status = 'done'
      succeeded++
    } catch (error: any) {
      item.status = 'error'
      item.error = error.data?.message || error.message || 'Erreur lors de l\'import'
      failed++
    }
  }

  importing.value = false

  if (succeeded > 0) {
    await fetchDocumentaryReviews(props.entityId)

    toast.add({
      title: 'Import terminé',
      description: `${succeeded} rapport${succeeded > 1 ? 's' : ''} importé${succeeded > 1 ? 's' : ''}`,
      color: 'success',
    })
  }

  if (failed > 0) {
    toast.add({
      title: 'Import incomplet',
      description: `${failed} fichier${failed > 1 ? 's n\'ont' : ' n\'a'} pas pu être importé${failed > 1 ? 's' : ''}`,
      color: 'error',
    })
  }

  // Fermer uniquement si tout est passé
  if (failed === 0 && succeeded > 0) {
    isOpen.value = false
  }
}
</script>
