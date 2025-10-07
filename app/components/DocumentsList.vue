<template>
  <div class="space-y-6">
    <!-- Documents organisés par phase -->
    <div class="space-y-4">
      <UCard v-for="phase in accordionItems" :key="phase.value" class="overflow-hidden">
        <UAccordion
          type="single"
          :items="[phase]"
          :default-value="[phase.value]"
        >
          <template #leading="{ item }">
            <div class="flex items-center gap-4">
              <div class="p-3 rounded-lg" :class="getPhaseBackgroundClass(item.badgeColor)">
                <UIcon :name="item.icon" class="w-6 h-6" :class="item.iconColor" />
              </div>
              <div>
                <h3 class="font-bold text-lg text-gray-900">{{ item.title }}</h3>
                <p class="text-sm text-gray-600 mt-0.5">
                  {{ item.documents.length }} document{{ item.documents.length > 1 ? 's' : '' }}
                  <span v-if="getPhaseAvailableCount(item) > 0" class="text-green-600 font-medium">
                    • {{ getPhaseAvailableCount(item) }} disponible{{ getPhaseAvailableCount(item) > 1 ? 's' : '' }}
                  </span>
                  <span v-if="getPhasePendingCount(item) > 0" class="text-orange-600 font-medium">
                    • {{ getPhasePendingCount(item) }} en attente
                  </span>
                </p>
              </div>
            </div>
          </template>

          <template #trailing="{ item }">
            <UButton
              v-if="item.title === 'Phase de candidature' || item.title === 'Phase d\'audit'"
              icon="i-lucide-plus"
              size="sm"
              color="primary"
              variant="soft"
              @click.stop="addDocument(item)"
            >
              Ajouter
            </UButton>
          </template>

          <template #content="{ item }">
            <!-- Liste des documents -->
            <div class="px-6 pb-6 pt-4">
              <div class="space-y-3">
                <div
                  v-for="document in item.documents"
                  :key="document.id"
                  class="p-4 rounded-lg border-2 transition-all duration-200 group"
                  :class="getDocumentClass(document)"
                  @click="handleDocumentClick(document)"
                >
                  <div class="flex items-start gap-4">
                    <!-- Icône du document -->
                    <div class="flex-shrink-0">
                      <div class="p-3 rounded-lg" :class="document.isAvailable ? 'bg-blue-50' : 'bg-gray-100'">
                        <UIcon
                          :name="getDocumentIcon(document)"
                          class="w-6 h-6"
                          :class="getDocumentIconColor(document)"
                        />
                      </div>
                    </div>

                    <!-- Informations du document -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-start justify-between gap-4">
                        <div class="flex-1 min-w-0">
                          <h4 class="font-semibold text-base flex items-center gap-2" :class="document.isAvailable ? 'text-gray-900 group-hover:text-blue-900' : 'text-gray-500'">
                            {{ document.name }}
                            <UIcon
                              v-if="document.isAvailable && isDocumentAccessible(document)"
                              name="i-lucide-external-link"
                              class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500"
                            />
                            <UBadge
                              v-if="document.isAvailable && isDocumentAccessible(document)"
                              color="success"
                              variant="soft"
                              size="xs"
                            >
                              Disponible
                            </UBadge>
                            <UBadge
                              v-else-if="document.isAvailable && !isDocumentAccessible(document)"
                              color="neutral"
                              variant="soft"
                              size="xs"
                            >
                              Non consultable
                            </UBadge>
                            <UBadge
                              v-else-if="document.dateLimiteDepot"
                              color="warning"
                              variant="soft"
                              size="xs"
                            >
                              En attente
                            </UBadge>
                          </h4>
                          <p class="text-sm text-gray-600 mt-1.5">
                            {{ document.description }}
                          </p>

                          <!-- Switcher de visibilité OE (mode company seulement) -->
                          <div v-if="props.role === 'company' && document.isAvailable" class="mt-3">
                            <div class="flex items-center gap-2">
                              <USwitch
                                :model-value="document.visibleByOE !== false"
                                @update:model-value="toggleVisibility(document)"
                                size="xs"
                              />
                              <span class="text-xs" :class="document.visibleByOE !== false ? 'text-gray-600' : 'text-gray-500'">
                                {{ document.visibleByOE !== false ? 'Visible par l\'OE' : 'Non visible par l\'OE' }}
                              </span>
                            </div>
                          </div>

                          <!-- Alerte nouvelle version demandée (mode company) -->
                          <div v-if="props.role === 'company' && document.requestedNewVersion && document.newVersionRequest" class="mt-3">
                            <UAlert
                              color="warning"
                              variant="soft"
                              title="Nouvelle version demandée"
                              icon="i-lucide-alert-circle"
                            >
                              <template #description>
                                <div class="space-y-2">
                                  <p class="text-sm">
                                    Demandée par <span class="font-semibold">{{ document.newVersionRequest.requestedBy }}</span> le {{ document.newVersionRequest.requestedDate }}
                                  </p>
                                  <div class="mt-2 p-3 bg-white/50 rounded-md border border-warning-200">
                                    <p class="text-sm italic text-gray-700">
                                      "{{ document.newVersionRequest.comment }}"
                                    </p>
                                  </div>
                                </div>
                              </template>
                            </UAlert>
                          </div>

                          <!-- Métadonnées -->
                          <div class="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
                            <template v-if="document.isAvailable">
                              <span class="flex items-center gap-1.5">
                                <UIcon name="i-lucide-calendar" class="w-3.5 h-3.5" />
                                Mis en ligne le {{ document.dateUpload }}
                              </span>
                              <span v-if="document.fileSize" class="flex items-center gap-1.5">
                                <UIcon name="i-lucide-file" class="w-3.5 h-3.5" />
                                {{ document.fileType }} • {{ document.fileSize }}
                              </span>
                              <span v-if="document.uploadedBy" class="flex items-center gap-1.5">
                                <UIcon name="i-lucide-user" class="w-3.5 h-3.5" />
                                {{ document.uploadedBy }}
                              </span>
                              <!-- Indicateur discret pour FEEF -->
                              <span v-if="props.role === 'feef' && document.visibleByOE === false" class="flex items-center gap-1.5 text-gray-400">
                                <UIcon name="i-lucide-eye-off" class="w-3.5 h-3.5" />
                                Non visible OE
                              </span>
                            </template>
                            <template v-else>
                              <span v-if="document.dateLimiteDepot" class="flex items-center gap-1.5 text-orange-600 font-medium">
                                <UIcon name="i-lucide-clock" class="w-3.5 h-3.5" />
                                À remettre avant le {{ document.dateLimiteDepot }}
                              </span>
                            </template>
                          </div>
                        </div>

                        <!-- Actions -->
                        <div class="flex-shrink-0 flex gap-2">
                          <!-- Bouton de demande d'accès pour OE -->
                          <UButton
                            v-if="props.role === 'oe' && document.isAvailable && !isDocumentAccessible(document)"
                            color="warning"
                            size="sm"
                            icon="i-lucide-eye"
                            variant="soft"
                            @click.stop="requestAccess(document)"
                          >
                            Demander l'accès
                          </UButton>

                          <!-- Bouton upload (seulement pour FEEF et Company) -->
                          <UButton
                            v-if="!document.isAvailable && (props.role === 'feef' || props.role === 'company')"
                            color="primary"
                            size="sm"
                            icon="i-lucide-upload"
                            @click.stop="uploadDocument(document)"
                          >
                            Mettre en ligne
                          </UButton>

                                          <!-- Bouton demander nouvelle version (FEEF et OE) -->
                          <UButton
                            v-if="document.isAvailable && (props.role === 'feef' || props.role === 'oe') && isDocumentAccessible(document) && !document.requestedNewVersion"
                            color="warning"
                            size="sm"
                            icon="i-lucide-refresh-cw"
                            variant="soft"
                            @click.stop="requestNewVersion(document)"
                          >
                            Demander nouvelle version
                          </UButton>

                          <!-- Bouton annuler demande nouvelle version (FEEF et OE) -->
                          <UButton
                            v-if="document.isAvailable && (props.role === 'feef' || props.role === 'oe') && isDocumentAccessible(document) && document.requestedNewVersion"
                            color="neutral"
                            size="sm"
                            icon="i-lucide-x-circle"
                            variant="soft"
                            @click.stop="cancelNewVersionRequest(document)"
                          >
                            Annuler la demande
                          </UButton>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </UAccordion>
      </UCard>
    </div>

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
  role?: 'feef' | 'oe' | 'company'
}
const props = withDefaults(defineProps<Props>(), {
  role: 'feef'
})

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
    title: getPhaseLabel(phaseKey),
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

// État pour le slide over du viewer
const isViewerOpen = ref(false)
const selectedDocument = ref<any>(null)

// Fonctions utilitaires pour les statistiques de phase
function getPhaseAvailableCount(phase: any) {
  return phase.documents.filter((doc: any) => doc.isAvailable).length
}

function getPhasePendingCount(phase: any) {
  return phase.documents.filter((doc: any) => !doc.isAvailable).length
}

function getPhaseBackgroundClass(color: string) {
  const colorMap: Record<string, string> = {
    'info': 'bg-blue-100',
    'primary': 'bg-purple-100',
    'warning': 'bg-orange-100',
    'secondary': 'bg-green-100',
    'success': 'bg-yellow-100',
    'neutral': 'bg-gray-100'
  }
  return colorMap[color] || 'bg-gray-100'
}

// Actions
function downloadDocument(document: any) {
  console.log('Téléchargement du document:', document.name)
  // TODO: Implémenter le téléchargement du document
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
}

function addDocument(phase: any) {
  console.log('Ajouter un document pour la phase:', phase.title)
  // TODO: Implémenter la logique d'ajout de document
}

// Gestion de la visibilité des documents
function isDocumentAccessible(document: any): boolean {
  // En mode OE, le document n'est accessible que s'il est visible par l'OE
  if (props.role === 'oe') {
    return document.visibleByOE !== false
  }
  // En mode company et feef, tous les documents disponibles sont accessibles
  return true
}

function getDocumentClass(document: any): string {
  const isAccessible = isDocumentAccessible(document)

  if (!document.isAvailable) {
    return 'border-gray-200 bg-gray-50'
  }

  if (props.role === 'oe' && !isAccessible) {
    return 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-75'
  }

  return 'border-gray-200 hover:border-blue-400 hover:shadow-lg cursor-pointer bg-white'
}

function handleDocumentClick(document: any) {
  if (document.isAvailable && isDocumentAccessible(document)) {
    openDocument(document)
  }
}

function toggleVisibility(document: any) {
  console.log('Toggle visibility pour document:', document.name)
  // TODO: Implémenter la logique de changement de visibilité
}

function requestAccess(document: any) {
  console.log('Demande d\'accès pour document:', document.name)
  // TODO: Implémenter la logique de demande d'accès
}

function requestNewVersion(document: any) {
  console.log('Demande de nouvelle version pour document:', document.name)
  // TODO: Implémenter la logique de demande de nouvelle version
}

function cancelNewVersionRequest(document: any) {
  console.log('Annulation de la demande de nouvelle version pour document:', document.name)
  // TODO: Implémenter la logique d'annulation de demande de nouvelle version
}
</script>
