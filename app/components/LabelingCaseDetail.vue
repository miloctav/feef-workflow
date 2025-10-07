<script setup lang="ts">
import type { Alert } from '~/utils/data'

interface Props {
  company: any
  role?: 'feef' | 'oe' | 'company' | 'auditeur'
}
const props = withDefaults(defineProps<Props>(), {
  role: 'feef'
})

// Configuration des tabs
const tabItems = ref([
  {
    label: 'Documents',
    icon: 'i-lucide-folder',
    slot: 'documents',
    value: 'documents'
  },
  {
    label: 'Dossier',
    icon: 'i-lucide-file-text',
    slot: 'dossier',
    value: 'dossier'
  },
  {
    label: 'Audit',
    icon: 'i-lucide-search',
    slot: 'audit',
    value: 'audit'
  },
  {
    label: 'Décision',
    icon: 'i-lucide-scale',
    slot: 'decision',
    value: 'decision'
  }
]);

// Mapping des types d'alertes vers les couleurs Nuxt UI - couleurs douces
const alertColorMapping: Record<string, 'warning' | 'info' | 'success'> = {
  warning: 'warning',
  info: 'info',
  success: 'success'
};

// Gestion des alertes
function dismissAlert(alertId: string) {
  if (props.company && props.company.workflow.alerts) {
    const index = props.company.workflow.alerts.findIndex((alert: Alert) => alert.id === alertId);
    if (index !== -1) {
      props.company.workflow.alerts.splice(index, 1);
    }
  }
}
</script>

<template>
  <!-- Container principal avec 80% de largeur -->
  <div class="w-4/5 mx-auto">
    <!-- Card principale avec informations du dossier -->
    <UCard class="mb-6">
      <div class="flex items-start gap-6">
        <!-- Icône dossier à gauche avec badge type -->
        <div class="flex-shrink-0 flex flex-col items-center gap-3">
          <UIcon
            name="i-lucide-folder-check"
            class="w-16 h-16 text-primary"
          />
          <UBadge
            :variant="company.workflow.type === 'Initial' ? 'solid' : 'outline'"
            :color="company.workflow.type === 'Initial' ? 'primary' : 'warning'"
            size="lg"
          >
            {{ company.workflow.type }}
          </UBadge>
        </div>

        <!-- Informations principales -->
        <div class="flex-1 grid grid-cols-3 gap-6">
          <!-- Colonne 1: Entreprise -->
          <div>
            <h1 class="font-bold text-xl text-gray-900 mb-4">Entreprise</h1>

            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-600">Nom:</span>
                <NuxtLink :to="`/${role}/companies/${company.id}`" class="text-gray-900 font-medium hover:text-primary hover:underline cursor-pointer">
                  {{ company.raisonSociale.nom }}
                </NuxtLink>
              </div>

              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-600">SIREN:</span>
                <span class="text-gray-900">{{ company.raisonSociale.siren }}</span>
              </div>

              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-600">Localisation:</span>
                <span class="text-gray-900">{{ company.raisonSociale.ville }}, {{ company.raisonSociale.region }}</span>
              </div>
            </div>
          </div>

          <!-- Colonne 2: Pilote -->
          <div>
            <h2 class="font-bold text-xl text-gray-900 mb-4">Pilote démarche</h2>

            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-600">Nom:</span>
                <span class="text-gray-900 font-medium">{{ company.pilote.prenom }} {{ company.pilote.nom }}</span>
              </div>

              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-600">Fonction:</span>
                <span class="text-gray-900">{{ company.pilote.fonction }}</span>
              </div>

              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-phone" class="w-4 h-4 text-gray-500" />
                <span class="text-gray-900">{{ company.pilote.telephone }}</span>
              </div>

              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-mail" class="w-4 h-4 text-gray-500" />
                <a :href="`mailto:${company.pilote.email}`" class="text-primary hover:underline">
                  {{ company.pilote.email }}
                </a>
              </div>
            </div>
          </div>

          <!-- Colonne 3: Organisme Évaluateur -->
          <div>
            <h2 class="font-bold text-xl text-gray-900 mb-4">Organisme Évaluateur</h2>

            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-600">OE:</span>
                <span class="text-gray-900 font-medium">{{ company.workflow.partageOE }}</span>
              </div>

              <div v-if="company.workflow.audit.auditeur.nom" class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-600">Auditeur:</span>
                <span class="text-gray-900">{{ company.workflow.audit.auditeur.prenom }} {{ company.workflow.audit.auditeur.nom }}</span>
              </div>


            </div>
          </div>
        </div>
      </div>

      <!-- Périmètre de labellisation -->
      <div v-if="company.perimetreLabellisation" class="mt-6 pt-4 border-t border-gray-200">
        <div class="flex items-start gap-3">
          <UIcon name="i-lucide-target" class="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <h3 class="font-semibold text-gray-900 mb-2">Périmètre de labellisation</h3>
            <p class="text-gray-700 text-sm leading-relaxed">
              {{ company.perimetreLabellisation }}
            </p>
          </div>
        </div>
      </div>

    </UCard>

    <!-- Section des alertes -->
    <div v-if="company.workflow.alerts && company.workflow.alerts.length > 0" class="mb-6">
      <div class="space-y-2">
        <UAlert
          v-for="alert in company.workflow.alerts"
          :key="alert.id"
          :color="alertColorMapping[alert.type]"
          variant="subtle"
          :description="alert.description"
          :icon="alert.icon"
          :close="alert.dismissible"
          @update:open="dismissAlert(alert.id)"
        />
      </div>
    </div>

  </div>

  <!-- Tabs pour les différentes sections -->
  <div class="w-full px-6 mb-6">
    <UTabs :items="tabItems" default-value="audit" class="w-full" orientation="horizontal">
      <template #documents>
        <DocumentsList :company="company" :role="role" />
      </template>

      <template #dossier>
        <CompanyDetail :company="company" :role="role" />
      </template>

      <template #audit>
        <AuditTab :company="company" />
      </template>

      <template #decision>
        <DecisionTab :company="company" />
      </template>
    </UTabs>
  </div>
</template>
