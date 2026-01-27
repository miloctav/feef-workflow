<script setup lang="ts">
// TODO: Remplacer cette date hardcodée par la vraie date de labellisation depuis la BDD
// Rechercher cette date dans entity.labeledAt ou audit.completedAt selon l'implémentation finale
const anniversaryDate = ref(new Date('2025-06-15'))

const formattedDate = computed(() => {
  return anniversaryDate.value.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
})

const daysUntil = computed(() => {
  const today = new Date()
  const nextAnniversary = new Date(anniversaryDate.value)
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
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-calendar-heart" class="w-5 h-5 text-primary" />
        <h3 class="font-semibold text-gray-900">Anniversaire de labellisation</h3>
      </div>
    </template>

    <div class="space-y-2">
      <p class="text-2xl font-bold text-primary">{{ formattedDate }}</p>
      <p class="text-sm text-gray-600">
        <span v-if="daysUntil === 0">C'est aujourd'hui ! 🎉</span>
        <span v-else-if="daysUntil === 1">C'est demain ! 🎉</span>
        <span v-else>Dans {{ daysUntil }} jours</span>
      </p>
    </div>
  </UCard>
</template>
