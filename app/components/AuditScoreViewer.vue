<template>
  <USlideover
    v-model:open="isOpen"
    title="Notation de l'audit RSE"
    side="right"
    class="w-full max-w-5xl"
    close-icon="i-lucide-x"
    :dismissible="false"
    :close="true"
  >
    <template #body>
      <!-- Header avec info audit et bouton enregistrer -->
      <div class="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-gray-200">
        <div class="flex-1">
          <p class="text-sm text-gray-600">
            {{ audit.entity.name }} - {{ audit.type }}
          </p>
        </div>

        <!-- Bouton Enregistrer (OE uniquement) -->
        <UButton
          v-if="canEdit"
          @click="handleSave"
          color="primary"
          icon="i-lucide-save"
          label="Enregistrer"
          :loading="updateLoading"
          :disabled="!hasChanges || updateLoading"
        />
      </div>

      <!-- Contenu principal -->
      <div class="flex flex-col space-y-6 pb-20">
        <!-- Score global sur 100 (en premier, bien visible) -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-target" class="w-5 h-5 text-blue-600" />
              <h4 class="font-semibold">Score global</h4>
            </div>
          </template>

          <!-- Mode édition (OE) -->
          <div v-if="canEdit" class="space-y-2">
            <UInput
              v-model.number="localGlobalScore"
              type="number"
              min="0"
              max="100"
              placeholder="Score sur 100"
              size="lg"
              :ui="{ base: 'text-2xl font-bold text-center' }"
              @input="hasChanges = true"
            />
            <p class="text-xs text-gray-500 text-center">
              Saisissez le score global de l'audit (0 à 100)
            </p>
          </div>

          <!-- Mode lecture seule -->
          <div v-else class="text-center">
            <div class="text-4xl font-bold text-blue-600">
              {{ localGlobalScore ?? '-' }}{{ localGlobalScore !== null ? '%' : '' }}
            </div>
            <p class="text-sm text-gray-600 mt-2">Score global de l'audit</p>
          </div>
        </UCard>

        <!-- Accordéons par thème -->
        <div class="space-y-4">
          <div v-for="[theme, criteria] in groupedCriteria" :key="theme">
            <UAccordion
              :items="[{
                label: getThemeLabel(theme),
                icon: 'i-lucide-chevron-right',
                slot: `theme-${theme}`
              }]"
              default-value="0"
            >
              <template #[`theme-${theme}`]>
                <div class="space-y-6 py-4">
                  <!-- Liste des critères du thème -->
                  <div
                    v-for="criterion in criteria"
                    :key="criterion.key"
                    class="border-b border-gray-200 last:border-0 pb-4 last:pb-0"
                  >
                    <!-- Layout horizontal : description + radio buttons -->
                    <div class="flex items-start gap-4">
                      <!-- Description du critère -->
                      <p class="text-sm text-gray-700 flex-1">
                        {{ criterion.description }}
                      </p>

                      <!-- Boutons radio A/B/C/D (OE) -->
                      <URadioGroup
                        v-if="canEdit"
                        :model-value="localScores[criterion.key]"
                        @update:model-value="setScore(criterion.key, $event)"
                        :items="[
                          { value: scoreLetterToValue['A'], label: 'A' },
                          { value: scoreLetterToValue['B'], label: 'B' },
                          { value: scoreLetterToValue['C'], label: 'C' },
                          { value: scoreLetterToValue['D'], label: 'D' }
                        ]"
                        orientation="horizontal"
                        class="shrink-0"
                      />

                      <!-- Affichage lecture seule -->
                      <div v-else class="shrink-0">
                        <UBadge
                          v-if="localScores[criterion.key]"
                          :color="getScoreColor(localScores[criterion.key])"
                          size="md"
                          variant="soft"
                        >
                          {{ scoreValueToLetter[localScores[criterion.key]] }}
                        </UBadge>
                        <span v-else class="text-gray-400 text-sm">Non attribué</span>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </UAccordion>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import { Role } from '#shared/types/roles'
import type { AuditWithRelations } from '~~/app/types/audits'
import type { ScoreInput } from '~~/app/types/auditNotation'
import {
  scoreLetterToValue,
  scoreValueToLetter,
  AuditScoreThemeLabels,
  getScoresByTheme,
  type AuditScoreTheme
} from '~~/server/config/auditNotation.config'

interface Props {
  audit: AuditWithRelations
  open?: boolean
}

const props = defineProps<Props>()

// Composables
const { user } = useAuth()
const { auditNotations, fetchAuditNotations, updateAuditNotations, updateLoading: notationUpdateLoading } = useAuditNotation()
const { fetchAudit, updateAudit, updateLoading: auditUpdateLoading } = useAudits()
const { triggerActionRefresh } = useActionRefresh()

// Inject isAuditEditable from parent
const isAuditEditable = inject<Ref<boolean>>('isAuditEditable', ref(true))

// État open avec v-model
const isOpen = defineModel<boolean>('open', { default: false })

// État local pour les scores
const localScores = ref<Record<number, number>>({})
const localGlobalScore = ref<number | null>(null)
const hasChanges = ref(false)

// Loading consolidé
const updateLoading = computed(() => notationUpdateLoading.value || auditUpdateLoading.value)

// Permissions
const canEdit = computed(() => {
  return user.value?.role === Role.OE && isAuditEditable.value
})

// Grouper les critères par thème
const groupedCriteria = computed(() => {
  return getScoresByTheme()
})

// Nombre de critères notés
const scoredCriteriaCount = computed(() => {
  return Object.keys(localScores.value).length
})

// Vérifier si tous les critères sont notés
const isComplete = computed(() => {
  return scoredCriteriaCount.value === 21
})

// Helper pour obtenir le label d'un thème
function getThemeLabel(theme: AuditScoreTheme): string {
  return AuditScoreThemeLabels[theme]
}

// Helper pour obtenir la couleur d'un score
function getScoreColor(scoreValue: number): string {
  if (scoreValue === 1) return 'success' // A
  if (scoreValue === 2) return 'primary' // B
  if (scoreValue === 3) return 'warning' // C
  return 'error' // D
}

// Initialiser les scores depuis l'audit
async function initializeScores() {
  // Charger les notations existantes
  await fetchAuditNotations(props.audit.id)

  // Initialiser localScores depuis les notations
  localScores.value = {}
  auditNotations.value.forEach(notation => {
    localScores.value[notation.criterionKey] = notation.score
  })

  // Initialiser localGlobalScore depuis l'audit
  localGlobalScore.value = props.audit.globalScore ?? null

  hasChanges.value = false
}

// Définir un score pour un critère
function setScore(criterionKey: number, scoreValue: number) {
  localScores.value[criterionKey] = scoreValue
  hasChanges.value = true
}

// Sauvegarder les modifications
async function handleSave() {
  let success = true

  // 1. Enregistrer les notations (si des scores sont définis)
  const scores: ScoreInput[] = Object.entries(localScores.value).map(([key, score]) => ({
    criterionKey: parseInt(key),
    score,
  }))

  if (scores.length > 0) {
    const notationResult = await updateAuditNotations(props.audit.id, scores)
    if (!notationResult.success) {
      success = false
    }
  }

  // 2. Enregistrer le globalScore (si modifié)
  if (localGlobalScore.value !== props.audit.globalScore) {
    const auditResult = await updateAudit(props.audit.id, {
      globalScore: localGlobalScore.value,
    })
    if (!auditResult.success) {
      success = false
    }
  }

  // 3. Rafraîchir l'audit parent si tout s'est bien passé
  if (success) {
    await fetchAudit(props.audit.id)
    hasChanges.value = false

    // Déclencher le rafraîchissement des actions
    // La saisie du score peut compléter des actions et déclencher des transitions
    triggerActionRefresh({
      auditId: props.audit.id.toString(),
      entityId: props.audit.entityId.toString(),
    })

    // Fermer le slideover après la sauvegarde
    isOpen.value = false
  }
}

// Initialiser au montage et à chaque ouverture
watchEffect(() => {
  if (isOpen.value) {
    initializeScores()
  }
})
</script>
