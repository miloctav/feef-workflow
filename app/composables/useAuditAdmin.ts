import type {
  ActionPlanTypeType,
  AuditStatusType,
  AuditTypeType,
  FeefDecisionType,
  MonitoringModeType,
  OeOpinionType,
} from '#shared/types/enums'
import type { AuditWithRelations } from '~~/app/types/audits'

/**
 * Édition administrative d'un audit (FEEF uniquement).
 * `undefined` = champ non touché, `null` = effacement de la valeur.
 */
export interface AuditAdminBody {
  status?: AuditStatusType
  type?: AuditTypeType
  monitoringMode?: MonitoringModeType | null
  oeId?: number | null
  auditorId?: number | null
  externalAuditorName?: string | null
  plannedDate?: string | null
  actualStartDate?: string | null
  actualEndDate?: string | null
  globalScore?: number | null
  oeOpinion?: OeOpinionType | null
  oeOpinionArgumentaire?: string | null
  oeOpinionConditions?: string | null
  actionPlanType?: ActionPlanTypeType
  actionPlanDeadline?: string | null
  feefDecision?: FeefDecisionType | null
  labelExpirationDate?: string | null
  oeAccepted?: boolean | null
  oeRefusalReason?: string | null
  planRefusalReason?: string | null
  hasComplementaryAudit?: boolean
  complementaryStartDate?: string | null
  complementaryEndDate?: string | null
  complementaryGlobalScore?: number | null
  previousAuditId?: number | null
}

export interface AuditAdminChangeItem {
  field: keyof AuditAdminBody
  fieldLabel: string
  from: unknown
  to: unknown
  fromLabel: string
  toLabel: string
}

export interface AuditAdminPreviewResult {
  changes: AuditAdminChangeItem[]
  warnings: string[]
  blocked: { reason: string } | null
}

export interface AuditAdminApplyResult {
  success: boolean
  audit: AuditWithRelations
  changes: AuditAdminChangeItem[]
  warnings: string[]
}

export const useAuditAdmin = () => {
  const toast = useToast()
  const loading = useState('auditAdmin:loading', () => false)

  const previewChange = async (
    auditId: number,
    body: AuditAdminBody,
  ): Promise<{ success: boolean; data?: AuditAdminPreviewResult; error?: string }> => {
    try {
      const response = await $fetch<{ data: AuditAdminPreviewResult }>(
        `/api/audits/${auditId}/admin/preview`,
        { method: 'POST', body },
      )
      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors du calcul des impacts'
      toast.add({ title: 'Erreur', description: errorMessage, color: 'error' })
      return { success: false, error: errorMessage }
    }
  }

  const applyChange = async (
    auditId: number,
    body: AuditAdminBody,
  ): Promise<{ success: boolean; data?: AuditAdminApplyResult; error?: string }> => {
    loading.value = true
    try {
      const response = await $fetch<{ data: AuditAdminApplyResult }>(
        `/api/audits/${auditId}/admin`,
        { method: 'PUT', body },
      )
      toast.add({
        title: 'Succès',
        description: 'Audit modifié.',
        color: 'success',
      })
      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMessage = e.data?.message || e.message || 'Erreur lors de l\'application'
      toast.add({ title: 'Erreur', description: errorMessage, color: 'error' })
      return { success: false, error: errorMessage }
    } finally {
      loading.value = false
    }
  }

  return {
    loading: readonly(loading),
    previewChange,
    applyChange,
  }
}
