<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-3 rounded-lg bg-blue-100">
            <UIcon name="i-lucide-award" class="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 class="font-bold text-lg text-gray-900">Contrats avec la FEEF</h3>
            <p class="text-sm text-gray-600 mt-0.5">
              {{ contracts.length }} contrat{{ contracts.length > 1 ? 's' : '' }}
            </p>
          </div>
        </div>
        <UButton
          v-if="role === 'feef'"
          color="primary"
          icon="i-lucide-upload"
          size="sm"
        >
          Mettre en ligne un contrat
        </UButton>
      </div>
    </template>

    <div class="space-y-3">
      <div
        v-for="contract in contracts"
        :key="contract.id"
        class="p-4 rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg cursor-pointer bg-white transition-all duration-200 group"
        @click="openContract(contract)"
      >
        <div class="flex items-start gap-4">
          <!-- Icône du contrat -->
          <div class="flex-shrink-0">
            <div class="p-3 rounded-lg bg-blue-50">
              <UIcon
                name="i-lucide-file-text"
                class="w-6 h-6 text-blue-500"
              />
            </div>
          </div>

          <!-- Informations du contrat -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <h4 class="font-semibold text-base flex items-center gap-2 text-gray-900 group-hover:text-blue-900">
                  {{ contract.name }}
                  <UIcon
                    name="i-lucide-external-link"
                    class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500"
                  />
                  <UBadge
                    :color="contract.status === 'signed' ? 'success' : contract.status === 'pending' ? 'warning' : 'neutral'"
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
                    <UIcon name="i-lucide-calendar" class="w-3.5 h-3.5" />
                    Date de signature : {{ contract.signatureDate }}
                  </span>
                  <span v-if="contract.validityDate" class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-calendar-check" class="w-3.5 h-3.5" />
                    Valide jusqu'au : {{ contract.validityDate }}
                  </span>
                  <span class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-file" class="w-3.5 h-3.5" />
                    PDF • {{ contract.fileSize }}
                  </span>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex-shrink-0 flex gap-2">
                <UButton
                  v-if="role === 'company' && contract.status === 'pending'"
                  color="primary"
                  size="sm"
                  icon="i-lucide-pen"
                  @click.stop="signContract(contract)"
                >
                  Signer
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

interface Contract {
  id: string
  name: string
  description: string
  status: string
  signatureDate: string
  validityDate?: string
  fileSize: string
  fileType: string
  type: string
  isAvailable: boolean
  dateUpload?: string
  uploadedBy?: string
}

// État pour le viewer
const isViewerOpen = ref(false)
const selectedContract = ref<Contract | null>(null)

// Données fictives des contrats FEEF
const contracts = ref<Contract[]>([
  {
    id: '1',
    name: 'Contrat de labellisation FEEF 2025',
    description: 'Contrat principal pour la labellisation "Entreprise et Engagement de France" pour l\'année 2025',
    status: 'signed',
    signatureDate: '15/01/2025',
    validityDate: '31/12/2025',
    fileSize: '256 Ko',
    fileType: 'PDF',
    type: 'contract',
    isAvailable: true,
    dateUpload: '15/01/2025',
    uploadedBy: 'FEEF'
  },
  {
    id: '2',
    name: 'Avenant au contrat de labellisation',
    description: 'Modification des conditions suite à l\'ajout d\'un nouveau site de production',
    status: 'signed',
    signatureDate: '10/03/2025',
    validityDate: '31/12/2025',
    fileSize: '128 Ko',
    fileType: 'PDF',
    type: 'amendment',
    isAvailable: true,
    dateUpload: '10/03/2025',
    uploadedBy: 'FEEF'
  },
  {
    id: '3',
    name: 'Contrat de renouvellement 2026',
    description: 'Contrat de renouvellement pour la labellisation FEEF pour l\'année 2026',
    status: 'pending',
    signatureDate: 'En attente',
    validityDate: '31/12/2026',
    fileSize: '245 Ko',
    fileType: 'PDF',
    type: 'contract',
    isAvailable: false
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

function openContract(contract: Contract) {
  selectedContract.value = contract
  isViewerOpen.value = true
}

function signContract(contract: Contract) {
  console.log('Signature du contrat:', contract.name)
  // TODO: Implémenter la signature du contrat
}

function downloadContract(contract: Contract) {
  console.log('Téléchargement du contrat:', contract.name)
  // TODO: Implémenter le téléchargement du contrat
}
</script>
