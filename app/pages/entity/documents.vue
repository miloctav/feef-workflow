<template>
  <UDashboardPanel id="documentarity-review">
    <template #header>
      <NavBar />
    </template>
    <template #body>
      <UPage>
        <UPageHeader
          title="Mon espace documentaire"
          description="Gestion de tous vos documents liés au processus de labellisation"
        >
          <template #default>
            <!-- Afficher le bouton si les conditions sont remplies -->
            <UButton
              v-if="canMarkAsReady"
              color="primary"
              size="lg"
              icon="i-lucide-check-circle"
              @click="isModalOpen = true"
            >
              Ma revue documentaire est à jour
            </UButton>

            <!-- Afficher le badge si la revue documentaire est déjà marquée comme prête -->
            <div
              v-else-if="currentEntity?.documentaryReviewReadyAt"
              class="p-4 bg-green-50 rounded-lg border border-green-200"
            >
              <div class="flex items-center gap-3">
                <UIcon name="i-lucide-check-circle" class="w-6 h-6 text-green-600 flex-shrink-0" />
                <div class="flex-1">
                  <h5 class="font-medium text-green-800 mb-1">Revue documentaire validée</h5>
                  <p class="text-sm text-green-700">
                    Marquée comme prête le {{ formatDate(currentEntity.documentaryReviewReadyAt) }}
                    <span v-if="currentEntity.documentaryReviewReadyByAccount">
                      par {{ currentEntity.documentaryReviewReadyByAccount.firstname }} {{ currentEntity.documentaryReviewReadyByAccount.lastname }}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </template>
        </UPageHeader>

        <UPageBody>
          <DocumentaryReviewTab />
        </UPageBody>
      </UPage>
    </template>
  </UDashboardPanel>

  <!-- Modal de confirmation -->
  <MarkDocumentaryReviewReadyModal
    v-if="currentEntity"
    v-model:open="isModalOpen"
    :entity-id="currentEntity.id"
    @updated="handleUpdated"
  />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard-entity'
})

const { currentEntity, fetchEntity } = useEntities()

const isModalOpen = ref(false)

// Vérifier si le bouton peut être affiché
const canMarkAsReady = computed(() => {
  if (!currentEntity.value) return false

  // Vérifier que l'entity est en mode MASTER
  if (currentEntity.value.mode !== EntityMode.MASTER) return false

  // Vérifier que le dossier a été déposé (caseSubmittedAt n'est pas null)
  if (!currentEntity.value.caseSubmittedAt) return false

  // Vérifier que la revue documentaire n'est pas déjà marquée comme prête
  if (currentEntity.value.documentaryReviewReadyAt) return false

  return true
})

// Formater la date
const formatDate = (dateString: string | Date | null) => {
  if (!dateString) return ''

  const date = new Date(dateString)
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Gérer la mise à jour après confirmation
const handleUpdated = async () => {
  // Rafraîchir l'entity courante pour obtenir les nouvelles données
  if (currentEntity.value) {
    await fetchEntity(currentEntity.value.id)
  }

  // Fermer le modal
  isModalOpen.value = false
}
</script>
