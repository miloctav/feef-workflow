<template>
  <span @click.stop>
    <UButton
      :icon="props.icon"
      :size="props.size"
      :color="props.color"
      :variant="props.variant"
      :loading="props.loading"
      :disabled="props.loading"
      @click="fileInput?.click()"
    >
      {{ props.label }}
    </UButton>

    <!-- Sélecteur de fichiers masqué : alternative au glisser-déposer -->
    <input
      ref="fileInput"
      type="file"
      multiple
      class="hidden"
      @change="onFilesSelected"
    >
  </span>
</template>

<script setup lang="ts">
interface Props {
  label?: string
  icon?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'solid' | 'outline' | 'soft' | 'subtle' | 'ghost' | 'link'
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Importer des fichiers',
  icon: 'i-lucide-upload',
  size: 'xs',
  variant: 'soft',
  color: 'primary',
})

const emit = defineEmits<{
  select: [files: File[]]
}>()

const fileInput = ref<HTMLInputElement | null>(null)

function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])

  if (files.length > 0) emit('select', files)

  // Réinitialiser l'input pour permettre de resélectionner les mêmes fichiers
  input.value = ''
}
</script>
