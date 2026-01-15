<template>
  <div class="flex-1 relative min-h-[500px] bg-gray-900 flex items-center justify-center">
    <!-- Loading state (attente URL signée) -->
    <div
      v-if="!currentSignedUrl"
      class="absolute inset-0 flex items-center justify-center bg-gray-900 z-20"
    >
      <UIcon
        name="i-heroicons-arrow-path"
        class="animate-spin w-8 h-8 text-white"
      />
    </div>

    <!-- Image viewer (seulement si URL disponible) -->
    <template v-else>
      <!-- Loading overlay (chargement de l'image) -->
      <div
        v-if="imageLoading"
        class="absolute inset-0 flex items-center justify-center bg-gray-900 z-20"
      >
        <UIcon
          name="i-heroicons-arrow-path"
          class="animate-spin w-8 h-8 text-white"
        />
      </div>

      <!-- Error state -->
      <div
        v-if="imageError"
        class="absolute inset-0 flex items-center justify-center text-center text-white p-8 z-20"
      >
        <div>
          <UIcon
            name="i-lucide-image-off"
            class="w-16 h-16 mx-auto mb-4 opacity-50"
          />
          <p class="text-sm mb-4">Impossible de charger l'image</p>
          <UButton
            @click="retryImageLoad"
            color="white"
            variant="outline"
            size="sm"
          >
            Réessayer
          </UButton>
        </div>
      </div>

      <!-- Image (toujours rendue pour que @load fonctionne) -->
      <div
        class="relative w-full h-full flex items-center justify-center p-8"
        :style="{ transform: `scale(${zoomLevel})`, transition: 'transform 0.2s' }"
      >
        <img
          :key="`image-${selectedVersionId}-${imageRetryCount}`"
          :src="currentSignedUrl"
          :alt="documentTitle"
          class="max-w-full max-h-full object-contain"
          :class="{ 'opacity-0': imageLoading || imageError }"
          @load="imageLoading = false"
          @error="handleImageError"
        />
      </div>

      <!-- Zoom controls -->
      <div
        v-if="!imageLoading && !imageError"
        class="absolute bottom-4 right-4 flex gap-2 bg-black/50 rounded-lg p-2 z-10"
      >
        <UButton
          @click="zoomOut"
          icon="i-lucide-zoom-out"
          color="white"
          variant="ghost"
          size="sm"
          :disabled="zoomLevel <= 0.5"
        />
        <UButton
          @click="resetZoom"
          color="white"
          variant="ghost"
          size="sm"
        >
          {{ Math.round(zoomLevel * 100) }}%
        </UButton>
        <UButton
          @click="zoomIn"
          icon="i-lucide-zoom-in"
          color="white"
          variant="ghost"
          size="sm"
          :disabled="zoomLevel >= 3"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
interface Props {
  currentSignedUrl: string | null
  documentTitle: string
  selectedVersionId: number | undefined
}

const props = defineProps<Props>()

// États réactifs pour le viewer d'images
const imageLoading = ref(false)
const imageError = ref(false)
const zoomLevel = ref(1)
const imageRetryCount = ref(0)

// Fonctions pour le viewer d'images
function zoomIn() {
  zoomLevel.value = Math.min(zoomLevel.value + 0.25, 3)
}

function zoomOut() {
  zoomLevel.value = Math.max(zoomLevel.value - 0.25, 0.5)
}

function resetZoom() {
  zoomLevel.value = 1
}

function handleImageError() {
  imageLoading.value = false
  imageError.value = true
}

function retryImageLoad() {
  imageError.value = false
  imageLoading.value = true
  imageRetryCount.value++
}

// Watchers
watch(
  () => props.selectedVersionId,
  () => {
    zoomLevel.value = 1
    imageLoading.value = true
    imageError.value = false
    imageRetryCount.value = 0
  }
)
</script>
