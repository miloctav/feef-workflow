<template>
  <div class="flex-1 relative min-h-[500px] bg-white overflow-hidden flex flex-col">
    <!-- Loading state -->
    <div
      v-if="loading"
      class="flex-1 flex items-center justify-center"
    >
      <UIcon
        name="i-heroicons-arrow-path"
        class="animate-spin w-8 h-8 text-primary"
      />
    </div>

    <!-- Error state -->
    <div
      v-else-if="error"
      class="flex-1 flex items-center justify-center"
    >
      <div class="text-center p-8">
        <UIcon
          name="i-lucide-file-warning"
          class="w-16 h-16 mx-auto mb-4 text-orange-500"
        />
        <p class="text-gray-600 mb-2">{{ errorMessage }}</p>
        <UButton
          @click="$emit('retry')"
          color="primary"
          variant="outline"
          size="sm"
        >
          Réessayer
        </UButton>
      </div>
    </div>

    <!-- Text content -->
    <div
      v-else
      class="flex-1 overflow-auto relative"
    >
      <!-- Copy button -->
      <div class="absolute top-4 right-4 z-10">
        <UButton
          @click="copyTextContent"
          :icon="textCopied ? 'i-lucide-check' : 'i-lucide-copy'"
          color="primary"
          variant="soft"
          size="sm"
          :label="textCopied ? 'Copié !' : 'Copier'"
        />
      </div>

      <!-- Text display with line numbers -->
      <div class="flex font-mono text-sm">
        <!-- Line numbers -->
        <div
          class="bg-gray-100 px-4 py-4 text-gray-500 text-right select-none border-r border-gray-200"
        >
          <div
            v-for="(line, index) in textLines"
            :key="index"
            class="leading-6"
          >
            {{ index + 1 }}
          </div>
        </div>

        <!-- Content -->
        <pre class="flex-1 p-4 whitespace-pre-wrap break-words"><code>{{ content }}</code></pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  content: string
  loading: boolean
  error: boolean
  errorMessage: string
}

const props = defineProps<Props>()

defineEmits<{
  retry: []
}>()

const textCopied = ref(false)

const textLines = computed(() => {
  return props.content ? props.content.split('\n') : []
})

async function copyTextContent() {
  try {
    await navigator.clipboard.writeText(props.content)
    textCopied.value = true
    setTimeout(() => (textCopied.value = false), 2000)
  } catch (error) {
    console.error('Erreur lors de la copie:', error)
  }
}
</script>
