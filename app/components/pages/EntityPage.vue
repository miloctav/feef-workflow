<template>
  <div v-if="currentEntity" class="space-y-6">
    <!-- En-tête avec le nom de l'entreprise -->
    <div class="bg-white border-b">
      <div class="px-6 py-4">
        <div class="flex items-center gap-4">
          <UIcon name="i-lucide-building-2" class="w-10 h-10 text-primary" />
          <div>
            <h1 class="text-2xl font-bold text-gray-900">{{ currentEntity.name }}</h1>
            <p class="text-sm text-gray-600">SIREN: {{ currentEntity.siren }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Onglets -->
    <div class="px-6">
      <UTabs v-model="selectedTab" :items="tabs">
        <!-- Tab Dossier -->
        <template #dossier>
          <div class="py-6">
            <!-- <CompanyDetail :company="company" :role="role" /> -->
          </div>
        </template>

        <!-- Tab Espace documentaire -->
        <template #espacedoc>
          <div class="py-6">
            <DocumentaryReviewTab :role="role" />
          </div>
        </template>

        <!-- Tab Comptes -->
        <template #comptes>
          <!-- <div class="py-6">
            <UCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <UIcon name="i-lucide-users" class="w-6 h-6 text-primary" />
                    <h2 class="font-bold text-xl text-gray-900">Gestion des comptes</h2>
                  </div>
                  <UButton
                    icon="i-lucide-user-plus"
                    size="sm"
                    color="primary"
                    @click="addAccount"
                  >
                    Ajouter un compte
                  </UButton>
                </div>
              </template>

              <div class="text-gray-600 text-center py-8">
                <UIcon name="i-lucide-users" class="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Tableau de gestion des comptes à venir</p>
              </div>
            </UCard>
          </div> -->
        </template>

        <!-- Tab Contrats -->
        <template #contrats>
          <div class="py-6 space-y-6">
            <!-- Affiche les contrats FEEF si le role est feef -->
            <!-- <FeefContractsList v-if="role === 'feef'" :role="role" /> -->

            <!-- Affiche les contrats OE si le role est oe -->
            <!-- <OeContractsList v-if="role === 'oe'" :role="role" /> -->
          </div>
        </template>

        <!-- Tab Audits -->
        <template #audits>
          <!-- <div class="py-6">
            <UCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <UIcon name="i-lucide-clipboard-list" class="w-6 h-6 text-primary" />
                    <h2 class="font-bold text-xl text-gray-900">Audit</h2>
                  </div>
                  <UButton
                    v-if="role === 'feef'"
                    icon="i-lucide-plus"
                    size="sm"
                    color="primary"
                    @click="addLabelingCase"
                  >
                    Nouvel Audit
                  </UButton>
                </div>
              </template>

              <LabelingCasesTable :company-id="entity.id" :role="role" :with-filters="false"/>
            </UCard>
          </div> -->
        </template>
      </UTabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import DocumentaryReviewTab from '~/components/tabs/DocumentaryReviewTab.vue'

interface Props {
  role?: 'feef' | 'oe' | 'company'
}

const props = withDefaults(defineProps<Props>(), {
  role: 'feef'
})

// Récupérer l'entité courante depuis le composable
const { currentEntity } = useEntities()

const selectedTab = ref('dossier')

const tabs = computed(() => {
  const baseTabs = [
    {
      slot: 'dossier',
      value: "dossier",
      label: 'Dossier',
      icon: 'i-lucide-folder'
    },
    {
      slot: 'espacedoc',
      value: "espacedoc",
      label: 'Espace documentaire',
      icon: 'i-lucide-files'
    }
  ]

  // Ajouter l'onglet Comptes uniquement pour le rôle FEEF
  if (props.role === 'feef') {
    baseTabs.push({
      slot: 'comptes',
      value: "comptes",
      label: 'Comptes',
      icon: 'i-lucide-users'
    })
  }

  baseTabs.push(
    {
      slot: 'contrats',
      value: "contrats",
      label: 'Contrats',
      icon: 'i-lucide-file-text'
    },
    {
      slot: 'audits',
      value: "audits",
      label: 'Audits',
      icon: 'i-lucide-clipboard-list'
    }
  )

  return baseTabs
})

// Actions
function addAccount() {
  console.log('Ajouter un compte')
  // TODO: Implémenter l'ajout de compte
}

function addLabelingCase() {
  console.log('Ajouter un audit')
  // TODO: Implémenter l'ajout d'audit
}
</script>
