<template>
  <div :class="cardClass">
    <UIcon :name="icon" :class="iconClass" />
    <h5 class="text-sm font-medium text-gray-900 mb-1">{{ title }}</h5>
    <div class="space-y-1">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  icon: string
  iconClass?: string
  cardClass?: string
  title: string
}
const props = defineProps<Props>()
</script>
