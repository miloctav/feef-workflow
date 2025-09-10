<template>
  <div class="bg-gray-50 rounded-b-lg p-6 min-h-[300px]">
    <div class="flex items-start gap-4 mb-6">
      <UIcon name="i-lucide-handshake" class="w-6 h-6 text-primary mt-1" />
      <div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Phase d'engagement</h3>
        <p class="text-gray-600 text-sm">Suivi du contrat avec l'Organisme Évaluateur</p>
      </div>
    </div>
    
    <!-- Contrat Organisme Évaluateur - Vue détaillée -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-file-signature" class="w-5 h-5 text-blue-500" />
          <h4 class="font-semibold">Devis Organisme Évaluateur</h4>
        </div>
      </template>
      
      <div class="grid grid-cols-2 gap-8">
        <!-- Informations générales -->
        <div class="space-y-4">
          <h5 class="font-medium text-gray-900 mb-3">Informations générales</h5>
          
          <div class="space-y-3">
            <div class="flex justify-between items-center py-2 border-b border-gray-100">
              <span class="text-sm text-gray-600">Organisme Évaluateur :</span>
              <span class="text-sm font-medium text-gray-900">{{ company.workflow.partageOE }}</span>
            </div>
            
            <div class="flex justify-between items-center py-2 border-b border-gray-100">
              <span class="text-sm text-gray-600">Type d'audit :</span>
              <span class="text-sm font-medium text-gray-900">{{ company.workflow.audit.type || 'Non précisé' }}</span>
            </div>
            
            <div class="flex justify-between items-center py-2 border-b border-gray-100">
              <span class="text-sm text-gray-600">Audit souhaité :</span>
              <span class="text-sm font-medium text-gray-900">{{ company.auditSouhaite.moisAudit || 'Non précisé' }}</span>
            </div>
          </div>
        </div>
        
        <!-- Statut du contrat -->
        <div class="space-y-4">
          <h5 class="font-medium text-gray-900 mb-3">Statut du devis</h5>
          
          <div class="space-y-4">
            <!-- Statut signature -->
            <div class="p-4 bg-white rounded-lg border border-gray-200">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-700">Signature du devis</span>
                <UBadge 
                  :color="company.workflow.contratOE.contratSigne ? 'success' : 'warning'"
                  variant="solid"
                  size="sm"
                >
                  {{ company.workflow.contratOE.contratSigne ? 'Signé' : 'En attente' }}
                </UBadge>
              </div>
              
              <div class="space-y-2 mb-3">
                <p class="text-xs text-gray-600">
                  {{ company.workflow.contratOE.contratSigne ? 
                    `Signé le ${company.workflow.contratOE.contratSigne}` : 
                    'Devis en attente de signature par l\'entreprise' 
                  }}
                </p>
                
                <p v-if="company.workflow.contratOE.signePar" class="text-xs text-gray-600">
                  <UIcon name="i-lucide-user-check" class="w-3 h-3 mr-1 inline" />
                  Signataire : <span class="font-medium">{{ company.workflow.contratOE.signePar }}</span>
                </p>
              </div>
              
              <!-- Bouton pour consulter le devis -->
              <UButton 
                @click="viewContract"
                variant="outline" 
                color="primary" 
                size="xs"
                icon="i-lucide-file-text"
                label="Consulter le devis"
                class="w-full"
              />
            </div>
            
          </div>
        </div>
      </div>
    </UCard>

    <!-- DocumentViewer pour consulter le contrat -->
    <DocumentViewer
      :document="currentDocument"
      v-model:open="showDocumentViewer"
    />

  </div>
</template>

<script setup lang="ts">
import { DOCUMENTS } from '~/utils/data'
import type { Documents } from '~/utils/data'

interface Props {
  company: any
}

const props = defineProps<Props>()

// État pour le DocumentViewer
const showDocumentViewer = ref(false)
const currentDocument = ref<Documents | undefined>()

// Trouver le devis OE dans les documents
const contractDocument = computed(() => {
  return DOCUMENTS.find(doc => doc.id === 'contrat-labellisation')
})

// Fonction pour ouvrir le devis dans le DocumentViewer
const viewContract = () => {
  if (contractDocument.value) {
    currentDocument.value = contractDocument.value
    showDocumentViewer.value = true
  }
}
</script>
