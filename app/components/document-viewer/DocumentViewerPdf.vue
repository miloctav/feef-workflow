<template>
  <div class="flex-1 relative min-h-[500px]">
    <iframe
      :key="currentSignedUrl"
      :src="currentSignedUrl + '#toolbar=1&navpanes=1&scrollbar=1&page=1&view=FitH'"
      class="w-full h-full border-0 absolute inset-0 bg-white"
      type="application/pdf"
      loading="lazy"
      title="Visualiseur PDF"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  currentSignedUrl: string
}

defineProps<Props>()
</script>
