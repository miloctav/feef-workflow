<template>
  <div class="bg-gray-50 rounded-b-lg p-6 min-h-[300px]">
    <div class="flex items-start gap-4 mb-6">
      <UIcon name="i-lucide-search" class="w-6 h-6 text-primary mt-1" />
      <div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Phase d'audit</h3>
        <p class="text-gray-600 text-sm">Suivi de l'audit réalisé par l'Organisme Évaluateur</p>
      </div>
    </div>
    
    <div class="grid grid-cols-2 gap-6">
      <!-- Revue documentaire -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-file-check" class="w-5 h-5 text-orange-500" />
            <h4 class="font-semibold">Revue documentaire</h4>
          </div>
        </template>
        
        <div class="space-y-4">
          <!-- Nombre de documents manquants -->
          <div class="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-orange-900">Documents manquants</span>
              <UBadge 
                :color="company.workflow.audit.revueDocumentaire.documentsManquants > 0 ? 'warning' : 'success'"
                variant="solid"
                size="sm"
              >
                {{ company.workflow.audit.revueDocumentaire.documentsManquants || 0 }}
              </UBadge>
            </div>
            <p class="text-xs text-orange-800">
              {{ company.workflow.audit.revueDocumentaire.documentsManquants > 0 ? 
                'Documents supplémentaires requis par l\'OE' : 
                'Dossier documentaire complet' 
              }}
            </p>
          </div>
          
          <!-- Dates de transmission -->
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">Date transmission :</span>
              <span class="text-sm font-medium">{{ company.workflow.audit.revueDocumentaire.dateTransmission || 'Non transmise' }}</span>
            </div>
            
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">Date partage :</span>
              <span class="text-sm font-medium">{{ company.workflow.audit.revueDocumentaire.datePartage || 'Non partagée' }}</span>
            </div>
          </div>
        </div>
      </UCard>
      
      <!-- Plan d'audit -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-calendar-clock" class="w-5 h-5 text-blue-500" />
            <h4 class="font-semibold">Plan d'audit</h4>
          </div>
        </template>
        
        <div class="space-y-4">
          <!-- Plan d'audit disponible -->
          <div class="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div class="flex items-center gap-3 mb-2">
              <UIcon name="i-lucide-file-text" class="w-4 h-4 text-blue-600" />
              <span class="text-sm font-medium text-blue-900">Plan d'audit détaillé</span>
            </div>
            <p class="text-xs text-blue-800 mb-2">
              Plan établi par l'Organisme Évaluateur incluant la méthodologie et le programme d'audit.
            </p>
            
            <!-- Date de dépôt du plan -->
            <div v-if="company.workflow.audit.dateTransmissionPlan" class="flex items-center gap-2 mb-3 text-xs text-blue-700">
              <UIcon name="i-lucide-calendar-plus" class="w-3 h-3" />
              <span>Déposé le {{ company.workflow.audit.dateTransmissionPlan }}</span>
            </div>
            
            <!-- Bouton pour consulter le plan -->
            <UButton 
              @click="viewAuditPlan"
              variant="outline" 
              color="primary" 
              size="xs"
              icon="i-lucide-eye"
              label="Consulter le plan d'audit"
              class="w-full"
            />
          </div>
          
          <!-- Auditeur assigné -->
          <div class="space-y-2">
            <h6 class="text-sm font-medium text-gray-700">Auditeur principal :</h6>
            <div class="p-2 bg-white rounded border">
              <div class="text-sm font-medium text-gray-900">
                {{ company.workflow.audit.auditeur?.prenom }} {{ company.workflow.audit.auditeur?.nom }}
              </div>
              <div class="text-xs text-gray-600">
                {{ company.workflow.audit.auditeur?.email }}
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </div>
    
    <!-- Dates et déroulement de l'audit -->
    <UCard class="mt-6">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-calendar-check" class="w-5 h-5 text-green-600" />
          <h4 class="font-semibold">Dates et déroulement de l'audit</h4>
        </div>
      </template>
      
      <div class="grid grid-cols-2 gap-6">
        <!-- Dates planifiées vs réelles -->
        <div class="space-y-4">
          <h5 class="font-medium text-gray-900 mb-3">Planning audit</h5>
          
          <div class="space-y-3">
            <div class="flex justify-between items-center py-2 border-b border-gray-100">
              <span class="text-sm text-gray-600">Dates prévues :</span>
              <span class="text-sm font-medium text-gray-900">
                {{ company.workflow.audit.dateDebutPlanifiee ? 
                  `${company.workflow.audit.dateDebutPlanifiee} - ${company.workflow.audit.dateFinPlanifiee}` : 
                  'Non planifiées' 
                }}
              </span>
            </div>
            
            <div class="flex justify-between items-center py-2 border-b border-gray-100">
              <span class="text-sm text-gray-600">Dates réelles :</span>
              <span class="text-sm font-medium" 
                    :class="company.workflow.audit.dateDebutReelle ? 'text-green-700' : 'text-gray-500'">
                {{ company.workflow.audit.dateDebutReelle ? 
                  `${company.workflow.audit.dateDebutReelle} - ${company.workflow.audit.dateFinReelle}` : 
                  'Audit non encore réalisé' 
                }}
              </span>
            </div>
            
            <div class="flex justify-between items-center py-2">
              <span class="text-sm text-gray-600">Statut audit :</span>
              <UBadge 
                :color="company.workflow.audit.dateDebutReelle ? 'success' : 'neutral'"
                variant="soft"
              >
                {{ company.workflow.audit.dateDebutReelle ? 'Audit terminé' : 'Planifié' }}
              </UBadge>
            </div>
          </div>
        </div>
        
        <!-- Informations auditeur -->
        <div class="space-y-4">
          <h5 class="font-medium text-gray-900 mb-3">Auditeur en charge</h5>
          
          <div class="p-4 bg-gray-50 rounded-lg">
            <div class="space-y-2">
              <div class="text-sm font-medium text-gray-900">
                {{ company.workflow.audit.auditeur?.prenom }} {{ company.workflow.audit.auditeur?.nom }}
              </div>
              <div class="text-xs text-gray-600">
                <UIcon name="i-lucide-mail" class="w-3 h-3 mr-1 inline" />
                {{ company.workflow.audit.auditeur?.email }}
              </div>
              <div v-if="company.workflow.audit.auditeur?.telephone" class="text-xs text-gray-600">
                <UIcon name="i-lucide-phone" class="w-3 h-3 mr-1 inline" />
                {{ company.workflow.audit.auditeur?.telephone }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- DocumentViewer pour consulter les documents d'audit -->
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

// Trouver le plan d'audit dans les documents
const auditPlanDocument = computed(() => {
  return DOCUMENTS.find(doc => doc.id === 'plan-audit')
})

// Fonction pour ouvrir le plan d'audit dans le DocumentViewer
const viewAuditPlan = () => {
  if (auditPlanDocument.value) {
    currentDocument.value = auditPlanDocument.value
    showDocumentViewer.value = true
  }
}
</script>
