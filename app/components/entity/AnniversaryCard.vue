<script setup lang="ts">
interface Props {
  anniversaryDate?: Date | string | null
  editable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  anniversaryDate: null,
  editable: false,
})

const emit = defineEmits<{
  edit: []
}>()

const hasDate = computed(() => props.anniversaryDate !== null && props.anniversaryDate !== undefined)

const parsedDate = computed(() => {
  if (!hasDate.value) return null
  return new Date(props.anniversaryDate!)
})

const formattedDate = computed(() => {
  if (!parsedDate.value) return ''
  return parsedDate.value.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
})

const daysUntil = computed(() => {
  if (!parsedDate.value) return null

  const today = new Date()
  const nextAnniversary = new Date(parsedDate.value)
  nextAnniversary.setFullYear(today.getFullYear())

  // Si l'anniversaire est déjà passé cette année, prendre l'année prochaine
  if (nextAnniversary < today) {
    nextAnniversary.setFullYear(today.getFullYear() + 1)
  }

  const diffTime = nextAnniversary.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
})
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-calendar-heart" class="w-5 h-5 text-primary" />
          <h3 class="font-semibold text-gray-900">Anniversaire de labellisation</h3>
        </div>
        <UButton
          v-if="editable"
          icon="i-lucide-pencil"
          variant="ghost"
          size="xs"
          color="neutral"
          @click="emit('edit')"
        />
      </div>
    </template>

    <!-- Date définie -->
    <div v-if="hasDate" class="space-y-2">
      <p class="text-2xl font-bold text-primary">{{ formattedDate }}</p>
      <p class="text-sm text-gray-600">
        <span v-if="daysUntil === 0">C'est aujourd'hui !</span>
        <span v-else-if="daysUntil === 1">C'est demain !</span>
        <span v-else>Dans {{ daysUntil }} jours</span>
      </p>
    </div>

    <!-- Pas de date -->
    <div v-else class="text-center py-4">
      <UIcon name="i-lucide-calendar-x" class="w-8 h-8 mx-auto mb-2 text-gray-400" />
      <p class="text-sm text-gray-500">Date d'anniversaire non définie</p>
    </div>
  </UCard>
</template>
