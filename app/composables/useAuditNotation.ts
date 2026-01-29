import type { AuditScoreLetter } from '~~/server/config/auditNotation.config'
import type {
  AuditNotationWithEnrichment,
  ScoreInput,
  UpdateAuditNotationData,
} from '~~/app/types/auditNotation'
import { AuditPhase, type AuditPhaseType } from '#shared/types/enums'

export const useAuditNotation = () => {
  const toast = useToast()

  // State pour la liste des notations
  const auditNotations = useState<AuditNotationWithEnrichment[]>('auditNotations:list', () => [])

  // États de chargement pour les opérations
  const fetchLoading = useState('auditNotations:fetchLoading', () => false)
  const updateLoading = useState('auditNotations:updateLoading', () => false)

  // Erreur de fetch
  const fetchError = useState<string | null>('auditNotations:fetchError', () => null)

  /**
   * Récupérer tous les scores de notation d'un audit
   * @param auditId - ID de l'audit
   * @param phase - Phase optionnelle (PHASE_1 ou PHASE_2), si non fourni retourne tous les scores
   */
  const fetchAuditNotations = async (auditId: number, phase?: AuditPhaseType) => {
    fetchLoading.value = true
    fetchError.value = null

    try {
      const url = phase
        ? `/api/audits/${auditId}/notation?phase=${phase}`
        : `/api/audits/${auditId}/notation`

      const response = await $fetch<{ data: AuditNotationWithEnrichment[] }>(url)

      auditNotations.value = response.data

      return { success: true, data: response.data }
    }
    catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de la récupération des scores'

      fetchError.value = errorMessage

      toast.add({
        title: 'Erreur',
        description: errorMessage,
        color: 'error',
      })

      return { success: false, error: errorMessage }
    }
    finally {
      fetchLoading.value = false
    }
  }

  /**
   * Mettre à jour les scores de notation d'un audit (upsert complet)
   * Remplace tous les scores existants de la phase par les nouveaux
   * @param auditId - ID de l'audit
   * @param scores - Liste des scores à enregistrer
   * @param phase - Phase (PHASE_1 par défaut)
   */
  const updateAuditNotations = async (auditId: number, scores: ScoreInput[], phase: AuditPhaseType = AuditPhase.PHASE_1) => {
    updateLoading.value = true

    try {
      const body: UpdateAuditNotationData = { scores, phase }

      const response = await $fetch<{ data: AuditNotationWithEnrichment[] }>(`/api/audits/${auditId}/notation`, {
        method: 'POST',
        body,
      })

      // Rafraîchir la liste après la mise à jour (même phase)
      await fetchAuditNotations(auditId, phase)

      toast.add({
        title: 'Succès',
        description: `${scores.length} score(s) enregistré(s) avec succès`,
        color: 'success',
      })

      return { success: true, data: response.data }
    }
    catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de l\'enregistrement des scores'

      toast.add({
        title: 'Erreur',
        description: errorMessage,
        color: 'error',
      })

      return { success: false, error: errorMessage }
    }
    finally {
      updateLoading.value = false
    }
  }

  /**
   * Rafraîchir la liste des notations
   */
  const refresh = async (auditId: number) => {
    return await fetchAuditNotations(auditId)
  }

  /**
   * Réinitialiser le state
   */
  const reset = () => {
    auditNotations.value = []
    fetchError.value = null
  }

  /**
   * Obtenir un score par criterionKey
   */
  const getScoreByCriterion = (criterionKey: number): AuditNotationWithEnrichment | undefined => {
    return auditNotations.value.find(n => n.criterionKey === criterionKey)
  }

  /**
   * Obtenir tous les scores d'un thème
   */
  const getScoresByTheme = (theme: number): AuditNotationWithEnrichment[] => {
    return auditNotations.value.filter(n => n.theme === theme)
  }

  /**
   * Vérifier si tous les critères ont un score
   * (21 critères au total : 0-20)
   */
  const isComplete = computed(() => {
    return auditNotations.value.length === 21
  })

  /**
   * Calculer le score moyen
   */
  const averageScore = computed(() => {
    if (auditNotations.value.length === 0) return 0

    const sum = auditNotations.value.reduce((acc, notation) => acc + notation.score, 0)
    return sum / auditNotations.value.length
  })

  /**
   * Calculer le score global (A/B/C/D) basé sur la moyenne
   */
  const globalScore = computed<AuditScoreLetter | null>(() => {
    if (auditNotations.value.length === 0) return null

    const avg = averageScore.value

    if (avg <= 1.5) return 'A'
    if (avg <= 2.5) return 'B'
    if (avg <= 3.5) return 'C'
    return 'D'
  })

  return {
    // Liste des notations (readonly)
    auditNotations: readonly(auditNotations),

    // États de chargement
    fetchLoading: readonly(fetchLoading),
    fetchError: readonly(fetchError),
    updateLoading: readonly(updateLoading),

    // Computed properties
    isComplete,
    averageScore,
    globalScore,

    // Actions
    fetchAuditNotations,
    updateAuditNotations,
    getScoreByCriterion,
    getScoresByTheme,
    refresh,
    reset,
  }
}
