<template>
  <div class="h-full overflow-y-auto">
    <UContainer class="py-8">
      <UPage>
        <UPageHeader
          title="Mon espace documentaire"
          description="Gestion de tous vos documents liés au processus de labellisation"
        >
          <template #icon>
            <UIcon name="i-lucide-folder-open" class="w-8 h-8 text-primary" />
          </template>
          <template #actions>
            <UButton
              color="primary"
              size="lg"
              icon="i-lucide-download"
              @click="downloadAllDocuments"
            >
              Tout télécharger
            </UButton>
          </template>
        </UPageHeader>

        <UPageBody>
          <DocumentsList :company="mockCompany" role="company" />
        </UPageBody>
      </UPage>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import DocumentsList from '~/components/DocumentsList.vue'
import { COMPANIES } from '~/utils/data'

definePageMeta({
  layout: 'dashboard-company'
})

// Mock company data - dans un vrai cas, cela viendrait de l'authentification
const mockCompany = COMPANIES[0]

// Action pour télécharger tous les documents
function downloadAllDocuments() {
  console.log('Téléchargement de tous les documents disponibles...')
  // TODO: Implémenter le téléchargement de tous les documents disponibles
}
</script>
