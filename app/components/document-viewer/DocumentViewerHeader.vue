<template>
  <div class="flex flex-col gap-5 w-full">
    <!-- Ligne 1 : Titre/Desc + Boutons (Droite) -->
    <div class="flex justify-between items-start gap-4">
      <!-- Gauche : Titre et Description -->
      <div>
        <h2 class="text-xl font-bold text-gray-900 leading-tight">
          {{ documentTitle }}
        </h2>
        <p class="text-sm text-gray-500 mt-1">
          {{ documentDescription }}
        </p>
      </div>

      <!-- Droite : Actions (Télécharger / Ouvrir) -->
      <div
        v-if="hasVersions && selectedVersionData?.s3Key && currentSignedUrl"
        class="flex gap-2 shrink-0"
      >
        <UButton
          @click="$emit('download')"
          color="secondary"
          variant="solid"
          icon="i-lucide-download"
          label="Télécharger"
          size="sm"
        />
        <UButton
          :href="currentSignedUrl"
          target="_blank"
          color="primary"
          variant="solid"
          icon="i-lucide-external-link"
          label="Ouvrir"
          size="sm"
        />
      </div>
    </div>

    <!-- Ligne 2 : Contrôles (Gauche) + Métadonnées (Droite) -->
    <div class="flex items-center justify-between gap-4">
      <!-- Groupe Gauche : Version et demande de MAJ -->
      <div class="flex items-center gap-3">
        <template v-if="hasVersions">
          <!-- Sélecteur de version -->
          <USelect
            v-model="model"
            :items="versionSelectItems"
            size="sm"
            class="w-56"
            placeholder="Choisir une version"
            :disabled="fetchLoading"
            :ui="{ base: 'bg-white border-gray-300' }"
          />

          <!-- Bouton Importer (+) -->
          <div
            v-if="canUploadDocument"
            class="flex items-center"
          >
            <UTooltip text="Importer une nouvelle version">
              <UButton
                @click="$emit('trigger-file-input')"
                color="primary"
                variant="soft"
                icon="i-lucide-plus"
                size="sm"
                :loading="createLoading"
                :disabled="createLoading"
              />
            </UTooltip>
          </div>
        </template>

        <!-- Bouton Demander MAJ (Mis en valeur) -->
        <DocumentRequestUpdateModal
          v-if="
            documentType === 'documentaryReview' &&
            (user?.role === Role.FEEF || user?.role === Role.OE) &&
            !hasPendingRequestForDocument
          "
          :documentary-review-id="documentaryReview?.id"
          :contract-id="contract?.id"
          :document-title="documentTitle"
          button-label="Demander MAJ"
          color="orange"
          variant="solid"
        />
      </div>

      <!-- Droite : Métadonnées (Date / User) -->
      <div
        v-if="hasVersions && selectedVersionData"
        class="text-xs text-gray-400 text-right hidden sm:block"
      >
        <div class="flex items-center justify-end gap-1">
          <UIcon
            name="i-lucide-calendar"
            class="w-3 h-3"
          />
          <span>{{ formatDate(selectedVersionData.uploadAt) }}</span>
        </div>
        <div class="flex items-center justify-end gap-1 mt-0.5">
          <UIcon
            name="i-lucide-user"
            class="w-3 h-3"
          />
          <span
            >{{ selectedVersionData.uploadByAccount.firstname }}
            {{ selectedVersionData.uploadByAccount.lastname }}</span
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Role } from '#shared/types/roles'
import type { DocumentaryReview } from '~~/app/types/documentaryReviews'
import type { ContractWithRelations } from '~~/app/types/contracts'

interface Props {
  documentTitle: string
  documentDescription: string
  hasVersions: boolean
  selectedVersionData: any
  currentSignedUrl: string | null
  fetchLoading: boolean
  canUploadDocument: boolean
  createLoading: boolean
  documentType: string | null
  documentaryReview?: DocumentaryReview | null
  contract?: ContractWithRelations | null
  hasPendingRequestForDocument: boolean
  versionSelectItems: { label: string; value: number }[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  download: []
  'trigger-file-input': []
}>()

const model = defineModel<number | undefined>({ required: true })

const { user } = useUserSession()

// Fonction pour formater une date
function formatDate(date: Date | string): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
</script>
