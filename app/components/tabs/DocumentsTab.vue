<template>
  <div class="bg-gray-50 rounded-b-lg p-6 min-h-[300px]">
    <!-- Header avec bouton Tout télécharger -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-start gap-4">
        <UIcon name="i-lucide-folder" class="w-6 h-6 text-primary mt-1" />
        <div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Documents du dossier</h3>
          <p class="text-gray-600 text-sm">Gestion des documents liés au processus de labellisation</p>
          <p class="text-blue-600 text-xs mt-1 flex items-center gap-1">
            <UIcon name="i-lucide-info" class="w-3 h-3" />
            Cliquez sur les documents disponibles pour les consulter
          </p>
        </div>
      </div>
      <UButton 
        color="primary" 
        size="lg" 
        icon="i-lucide-download" 
        @click="downloadAllDocuments"
        class="shadow-lg"
      >
        Tout télécharger
      </UButton>
    </div>
    
    <!-- Documents organisés par phase avec accordion -->
    <UAccordion 
      type="multiple" 
      :items="accordionItems" 
      :default-value="defaultOpenValues"
    >
      <template #leading="{ item }">
        <div class="flex items-center gap-3">
          <UIcon :name="item.icon" class="w-5 h-5" :class="item.iconColor" />
          <UBadge :color="item.badgeColor" variant="soft" size="sm">
            {{ item.documents.length }} document{{ item.documents.length > 1 ? 's' : '' }}
          </UBadge>
        </div>
      </template>
      
      <template #content="{ item }">
        <div class="bg-gray-50 rounded-lg border border-gray-100">
          <!-- Liste des documents de la phase -->
          <div class="divide-y divide-gray-100">
            <div 
              v-for="document in item.documents" 
              :key="document.id"
              class="p-4 transition-all duration-200 group"
              :class="document.isAvailable ? 'hover:bg-white hover:shadow-sm cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500' : 'opacity-75'"
              @click="document.isAvailable ? openDocument(document) : null"
            >
              <div class="flex items-center gap-4 w-full">
                <UIcon 
                  :name="getDocumentIcon(document)" 
                  class="w-5 h-5 flex-shrink-0" 
                  :class="getDocumentIconColor(document)" 
                />
                
                <!-- Nom et badge -->
                <div class="flex items-center gap-2 min-w-0 flex-shrink-0" style="width: 280px;">
                  <p class="font-medium truncate flex items-center gap-2" :class="document.isAvailable ? 'text-gray-900 group-hover:text-blue-900' : 'text-gray-500'">
                    {{ document.name }}
                    <UIcon 
                      v-if="document.isAvailable" 
                      name="i-lucide-external-link" 
                      class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" 
                    />
                  </p>
                </div>
                
                <!-- Description -->
                <div class="flex-1 min-w-0 px-4">
                  <p class="text-sm text-gray-600 truncate">
                    {{ document.description }}
                  </p>
                </div>
                
                <!-- Informations de mise en ligne ou bouton de mise en ligne -->
                <div class="flex items-center gap-6 flex-shrink-0 text-xs text-gray-500">
                  <template v-if="document.isAvailable">
                    <span class="flex items-center gap-1 whitespace-nowrap">
                      <UIcon name="i-lucide-calendar" class="w-3 h-3" />
                      {{ document.dateUpload }}
                    </span>
                    <span class="flex items-center gap-1 whitespace-nowrap" v-if="document.fileSize">
                      <UIcon name="i-lucide-file" class="w-3 h-3" />
                      {{ document.fileType }} • {{ document.fileSize }}
                    </span>
                    <span class="flex items-center gap-1 whitespace-nowrap" v-if="document.uploadedBy">
                      <UIcon name="i-lucide-user" class="w-3 h-3" />
                      {{ document.uploadedBy }}
                    </span>
                  </template>
                  <template v-else>
                    <span class="flex items-center gap-1 whitespace-nowrap text-orange-600" v-if="document.dateLimiteDepot">
                      <UIcon name="i-lucide-clock" class="w-3 h-3" />
                      À remettre avant le {{ document.dateLimiteDepot }}
                    </span>
                    <span class="text-gray-400 italic whitespace-nowrap mr-4" v-else>
                      Non disponible
                    </span>
                    <!-- Bouton pour mettre en ligne -->
                    <UButton 
                      color="primary" 
                      size="xs"
                      icon="i-lucide-upload"
                      @click.stop="uploadDocument(document)"
                      class="ml-2"
                    >
                      Mettre en ligne
                    </UButton>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UAccordion>

    <!-- Document Viewer Slide Over -->
    <DocumentViewer 
      v-model:open="isViewerOpen" 
      :document="selectedDocument" 
    />
    
  </div>
</template>

<script setup lang="ts">
import { DOCUMENTS, labelingCaseState } from '~/utils/data'
import DocumentViewer from '~/components/DocumentViewer.vue'

interface Props {
  company: any
}

const props = defineProps<Props>()

// Organiser les documents par phase de labellisation
const documentsByPhase = computed(() => {
  const phases: Record<string, typeof DOCUMENTS> = {}
  
  Object.values(labelingCaseState).forEach(state => {
    phases[state] = DOCUMENTS.filter(doc => doc.labelingCaseState === state)
  })
  
  // Supprimer les phases vides
  return Object.fromEntries(
    Object.entries(phases).filter(([_, docs]) => docs.length > 0)
  )
})

// Préparer les items pour l'accordion
const accordionItems = computed(() => {
  return Object.entries(documentsByPhase.value).map(([phaseKey, documents]) => ({
    label: getPhaseLabel(phaseKey),
    icon: getPhaseIcon(phaseKey),
    iconColor: getPhaseIconColor(phaseKey),
    badgeColor: getPhaseColor(phaseKey),
    value: phaseKey,
    documents: documents
  }))
})

// Valeurs par défaut pour ouvrir tous les accordéons
const defaultOpenValues = computed(() => {
  return Object.keys(documentsByPhase.value)
})

// Fonctions utilitaires pour les phases
function getPhaseLabel(phaseKey: string): string {
  const labels: Record<string, string> = {
    [labelingCaseState.candidacy]: 'Phase de candidature',
    [labelingCaseState.engagement]: 'Phase d\'engagement',
    [labelingCaseState.audit]: 'Phase d\'audit',
    [labelingCaseState.decision]: 'Phase de décision',
    [labelingCaseState.labeled]: 'Phase de labellisation'
  }
  return labels[phaseKey] || phaseKey
}

function getPhaseIcon(phaseKey: string): string {
  const icons: Record<string, string> = {
    [labelingCaseState.candidacy]: 'i-lucide-file-text',
    [labelingCaseState.engagement]: 'i-lucide-handshake',
    [labelingCaseState.audit]: 'i-lucide-search',
    [labelingCaseState.decision]: 'i-lucide-scale',
    [labelingCaseState.labeled]: 'i-lucide-award'
  }
  return icons[phaseKey] || 'i-lucide-folder'
}

function getPhaseIconColor(phaseKey: string): string {
  const colors: Record<string, string> = {
    [labelingCaseState.candidacy]: 'text-blue-500',
    [labelingCaseState.engagement]: 'text-purple-500',
    [labelingCaseState.audit]: 'text-orange-500',
    [labelingCaseState.decision]: 'text-green-500',
    [labelingCaseState.labeled]: 'text-yellow-500'
  }
  return colors[phaseKey] || 'text-gray-500'
}

function getPhaseColor(phaseKey: string): "primary" | "secondary" | "success" | "info" | "warning" | "error" | "neutral" {
  const colors: Record<string, "primary" | "secondary" | "success" | "info" | "warning" | "error" | "neutral"> = {
    [labelingCaseState.candidacy]: 'info',
    [labelingCaseState.engagement]: 'primary',
    [labelingCaseState.audit]: 'warning',
    [labelingCaseState.decision]: 'secondary',
    [labelingCaseState.labeled]: 'success'
  }
  return colors[phaseKey] || 'neutral'
}

// Fonctions utilitaires pour les documents
function getDocumentStatus(document: any): string {
  // Simuler le statut basé sur la phase actuelle du workflow
  const currentState = props.company.workflow.state
  const docState = document.labelingCaseState
  
  if (currentState === docState) {
    return 'Requis'
  } else if (isPhaseCompleted(docState, currentState)) {
    return 'Complété'
  } else {
    return 'À venir'
  }
}

function getDocumentStatusColor(document: any): "primary" | "secondary" | "success" | "info" | "warning" | "error" | "neutral" {
  const status = getDocumentStatus(document)
  switch (status) {
    case 'Complété': return 'success'
    case 'Requis': return 'warning'
    case 'À venir': return 'neutral'
    default: return 'neutral'
  }
}

function isPhaseCompleted(docState: string, currentState: string): boolean {
  const stateOrder = [
    labelingCaseState.candidacy,
    labelingCaseState.engagement,
    labelingCaseState.audit,
    labelingCaseState.decision,
    labelingCaseState.labeled
  ]
  
  const docIndex = stateOrder.indexOf(docState)
  const currentIndex = stateOrder.indexOf(currentState)
  
  return docIndex < currentIndex
}

// Fonctions utilitaires pour les documents - disponibilité
function getDocumentIcon(document: any): string {
  if (!document.isAvailable) {
    return 'i-lucide-file-x'
  }
  
  switch (document.fileType?.toLowerCase()) {
    case 'pdf': return 'i-lucide-file-text'
    case 'doc':
    case 'docx': return 'i-lucide-file-text'
    case 'xls':
    case 'xlsx': return 'i-lucide-file-spreadsheet'
    default: return 'i-lucide-file'
  }
}

function getDocumentIconColor(document: any): string {
  if (!document.isAvailable) {
    return 'text-gray-400'
  }
  return 'text-blue-500'
}

function getDocumentAvailabilityColor(document: any): "primary" | "secondary" | "success" | "info" | "warning" | "error" | "neutral" {
  return document.isAvailable ? 'success' : 'neutral'
}

// Fonctions pour gérer les dates limites
function getDeadlineUrgency(dateLimiteDepot: string): 'normal' | 'urgent' | 'critical' {
  if (!dateLimiteDepot) return 'normal'
  
  const today = new Date()
  const deadline = parseDate(dateLimiteDepot)
  const diffTime = deadline.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return 'critical' // Dépassé
  if (diffDays <= 7) return 'urgent'  // Dans 7 jours ou moins
  return 'normal'
}

function parseDate(dateStr: string): Date {
  const parts = dateStr.split('/')
  const day = parts[0] || '1'
  const month = parts[1] || '1'
  const year = parts[2] || '2025'
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
}

function getDeadlineColor(dateLimiteDepot: string): string {
  const urgency = getDeadlineUrgency(dateLimiteDepot)
  switch (urgency) {
    case 'critical': return 'text-red-600'
    case 'urgent': return 'text-orange-600'
    default: return 'text-blue-600'
  }
}

function getDeadlineIcon(dateLimiteDepot: string): string {
  const urgency = getDeadlineUrgency(dateLimiteDepot)
  switch (urgency) {
    case 'critical': return 'i-lucide-alert-triangle'
    case 'urgent': return 'i-lucide-clock'
    default: return 'i-lucide-calendar'
  }
}

// État pour le slide over du viewer
const isViewerOpen = ref(false)
const selectedDocument = ref<any>(null)

// Actions
function downloadAllDocuments() {
  console.log('Téléchargement de tous les documents disponibles...')
  // TODO: Implémenter le téléchargement de tous les documents disponibles
}

function openDocument(document: any) {
  if (document.isAvailable) {
    selectedDocument.value = document
    isViewerOpen.value = true
  }
}

function uploadDocument(document: any) {
  console.log('Mise en ligne du document:', document.name)
  // TODO: Implémenter la logique de mise en ligne du document
  // Ici on pourrait ouvrir un modal de téléchargement ou déclencher un processus de mise en ligne
}
</script>
