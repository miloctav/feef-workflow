<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-3 rounded-lg bg-purple-100">
            <UIcon name="i-lucide-briefcase" class="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 class="font-bold text-lg text-gray-900">Devis et contrats avec les Organismes Évaluateurs</h3>
            <p class="text-sm text-gray-600 mt-0.5">
              {{ contracts.length }} document{{ contracts.length > 1 ? 's' : '' }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            v-if="role === 'company'"
            icon="i-lucide-repeat"
            color="primary"
            variant="outline"
            size="sm"
          >
            Changer d'organisme évaluateur
          </UButton>
          <UButton
            v-if="role === 'oe'"
            color="primary"
            icon="i-lucide-upload"
            size="sm"
          >
            Mettre en ligne un devis
          </UButton>
        </div>
      </div>
    </template>

    <div class="space-y-3">
      <div
        v-for="contract in contracts"
        :key="contract.id"
        class="p-4 rounded-lg border-2 border-gray-200 hover:border-purple-400 hover:shadow-lg cursor-pointer bg-white transition-all duration-200 group"
        @click="openContract(contract)"
      >
        <div class="flex items-start gap-4">
          <!-- Icône du document -->
          <div class="flex-shrink-0">
            <div class="p-3 rounded-lg bg-purple-50">
              <UIcon
                :name="contract.type === 'quote' ? 'i-lucide-file-text' : 'i-lucide-file-check'"
                class="w-6 h-6 text-purple-500"
              />
            </div>
          </div>

          <!-- Informations du document -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <h4 class="font-semibold text-base flex items-center gap-2 text-gray-900 group-hover:text-purple-900">
                  {{ contract.name }}
                  <UIcon
                    name="i-lucide-external-link"
                    class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-purple-500"
                  />
                  <UBadge
                    :color="contract.status === 'signed' ? 'success' : contract.status === 'pending' ? 'warning' : contract.status === 'accepted' ? 'info' : 'neutral'"
                    variant="soft"
                    size="xs"
                  >
                    {{ getStatusLabel(contract.status) }}
                  </UBadge>
                </h4>
                <p class="text-sm text-gray-600 mt-1.5">
                  {{ contract.description }}
                </p>

                <!-- Métadonnées -->
                <div class="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
                  <span class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-building" class="w-3.5 h-3.5" />
                    {{ contract.oe }}
                  </span>
                  <span class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar" class="w-3.5 h-3.5" />
                    {{ contract.type === 'quote' ? 'Émis le' : 'Signé le' }} : {{ contract.date }}
                  </span>
                  <span v-if="contract.amount" class="flex items-center gap-1.5 font-medium text-purple-600">
                    <UIcon name="i-lucide-euro" class="w-3.5 h-3.5" />
                    {{ contract.amount }}
                  </span>
                  <span class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-file" class="w-3.5 h-3.5" />
                    PDF • {{ contract.fileSize }}
                  </span>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex-shrink-0">
                <UButton
                  color="neutral"
                  size="sm"
                  icon="i-lucide-download"
                  variant="ghost"
                  @click.stop="downloadContract(contract)"
                >
                  Télécharger
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Document Viewer Slide Over -->
    <DocumentViewer
      v-model:open="isViewerOpen"
      :document="selectedContract"
    />
  </UCard>
</template>

<script setup lang="ts">
import DocumentViewer from '~/components/DocumentViewer.vue'

interface Props {
  company: any
  role?: 'feef' | 'oe' | 'company'
}
const props = withDefaults(defineProps<Props>(), {
  role: 'feef'
})

interface OeContract {
  id: string
  name: string
  description: string
  status: string
  date: string
  amount?: string
  fileSize: string
  fileType: string
  type: 'quote' | 'contract'
  oe: string
  isAvailable: boolean
  dateUpload?: string
  uploadedBy?: string
}

// État pour le viewer
const isViewerOpen = ref(false)
const selectedContract = ref<OeContract | null>(null)

// Données fictives des contrats/devis avec les OE
const contracts = ref<OeContract[]>([
  {
    id: '4',
    name: 'Devis audit initial - Bureau Veritas',
    description: 'Devis pour l\'audit initial de labellisation FEEF',
    status: 'accepted',
    date: '05/12/2024',
    amount: '3 500 €',
    fileSize: '180 Ko',
    fileType: 'PDF',
    type: 'quote',
    oe: 'Bureau Veritas',
    isAvailable: true,
    dateUpload: '05/12/2024',
    uploadedBy: 'Bureau Veritas'
  },
  {
    id: '5',
    name: 'Contrat d\'audit - Bureau Veritas',
    description: 'Contrat d\'audit signé suite à l\'acceptation du devis',
    status: 'signed',
    date: '10/12/2024',
    amount: '3 500 €',
    fileSize: '320 Ko',
    fileType: 'PDF',
    type: 'contract',
    oe: 'Bureau Veritas',
    isAvailable: true,
    dateUpload: '10/12/2024',
    uploadedBy: 'Bureau Veritas'
  },
  {
    id: '6',
    name: 'Devis audit de surveillance 2025 - Bureau Veritas',
    description: 'Devis pour l\'audit de surveillance annuel 2025',
    status: 'pending',
    date: '15/01/2025',
    amount: '2 200 €',
    fileSize: '165 Ko',
    fileType: 'PDF',
    type: 'quote',
    oe: 'Bureau Veritas',
    isAvailable: true,
    dateUpload: '15/01/2025',
    uploadedBy: 'Bureau Veritas'
  },
  {
    id: '7',
    name: 'Devis audit complémentaire - SGS',
    description: 'Devis pour un audit complémentaire suite à l\'ajout d\'un nouveau site',
    status: 'pending',
    date: '20/03/2025',
    amount: '1 800 €',
    fileSize: '145 Ko',
    fileType: 'PDF',
    type: 'quote',
    oe: 'SGS France',
    isAvailable: true,
    dateUpload: '20/03/2025',
    uploadedBy: 'SGS France'
  }
])

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'signed': 'Signé',
    'pending': 'En attente',
    'accepted': 'Accepté',
    'draft': 'Brouillon'
  }
  return labels[status] || status
}

function openContract(contract: OeContract) {
  selectedContract.value = contract
  isViewerOpen.value = true
}

function downloadContract(contract: OeContract) {
  console.log('Téléchargement du contrat:', contract.name)
  // TODO: Implémenter le téléchargement du contrat
}
</script>
