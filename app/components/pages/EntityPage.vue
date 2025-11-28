<template>
  <div v-if="currentEntity" class="space-y-6">
    <!-- En-tête avec le nom de l'entreprise -->
    <div class="bg-white border-b">
      <div class="px-6 py-4">
        <div class="flex items-center gap-4">
          <UIcon name="i-lucide-building-2" class="w-10 h-10 text-primary" />
          <div>
            <h1 class="text-2xl font-bold text-gray-900">{{ currentEntity.name }}</h1>
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
            <EntityCase />
          </div>
        </template>

        <!-- Tab Espace documentaire -->
        <template v-if="currentEntity.mode === EntityMode.MASTER" #espacedoc>
          <div class="py-6">
            <DocumentaryReviewTab />
          </div>
        </template>

        <!-- Tab Comptes -->
        <template v-if="currentEntity.mode === EntityMode.MASTER" #comptes>
          <AccountsTable :entity-id="currentEntity.id" />
        </template>

        <!-- Tab Contrats -->
        <template v-if="currentEntity.mode === EntityMode.MASTER" #contrats>
          <div class="py-6">
            <ContractsList />
          </div>
        </template>

        <!-- Tab Audits -->
        <template v-if="currentEntity.mode === EntityMode.MASTER" #audits>
          <div class="py-6">
            <AuditsTable v-if="currentEntity" :has-filters="false" :entity-id="currentEntity.id" />
          </div>
        </template>
      </UTabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import DocumentaryReviewTab from '~/components/tabs/DocumentaryReviewTab.vue'
import AuditsTable from '../tables/AuditsTable.vue'

const { user } = useAuth()

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
    }
  ]

  if (currentEntity.value?.mode === EntityMode.MASTER) {
    baseTabs.push({
      slot: 'espacedoc',
      value: "espacedoc",
      label: 'Espace documentaire',
      icon: 'i-lucide-files'
    })
  }

  // Ajouter l'onglet Comptes uniquement pour le rôle FEEF
  if (user.value?.role === Role.FEEF && currentEntity.value?.mode === EntityMode.MASTER) {
    baseTabs.push({
      slot: 'comptes',
      value: "comptes",
      label: 'Comptes',
      icon: 'i-lucide-users'
    })
  }

  if (currentEntity.value?.mode === EntityMode.MASTER) {
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
  }

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
