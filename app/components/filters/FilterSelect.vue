<template>
  <UFormField :label="label">
    <USelect :model-value="modelValue" :items="items" :placeholder="placeholder" :class="class" :disabled="disabled"
      :loading="loading" @update:model-value="handleChange" />
  </UFormField>

</template>

<script setup lang="ts">
interface Props {
  modelValue: any
  items: Array<{ label: string; value: any }>
  placeholder?: string
  label?: string
  class?: string
  disabled?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: undefined,
  class: 'w-full',
  disabled: false,
  loading: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

const handleChange = (value: any) => {
  emit('update:modelValue', value)
}
</script>
