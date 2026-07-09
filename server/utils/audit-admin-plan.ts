import { and, eq, isNull, ne } from 'drizzle-orm'
import { db } from '~~/server/database'
import { audits, accounts, oes } from '~~/server/database/schema'
import {
  ActionPlanType,
  ActionPlanTypeLabels,
  AuditStatus,
  AuditStatusLabels,
  AuditType,
  AuditTypeLabels,
  FeefDecision,
  FeefDecisionLabels,
  MonitoringMode,
  MonitoringModeLabels,
  OeOpinion,
  OeOpinionLabels,
} from '~~/shared/types/enums'
import type {
  ActionPlanTypeType,
  AuditStatusType,
  AuditTypeType,
  FeefDecisionType,
  MonitoringModeType,
  OeOpinionType,
} from '~~/shared/types/enums'
import { Role } from '~~/shared/types/roles'
import type { Audit } from '~~/server/database/schema'

/**
 * Édition administrative d'un audit par la FEEF.
 *
 * Contrairement au PUT métier (`/api/audits/:id`), ce plan ne rejoue aucun
 * automatisme : pas de state machine, pas de checkAutoTransition, pas de
 * recalcul du type de plan d'action. La FEEF écrit exactement ce qu'elle saisit.
 * Seules les incohérences structurelles (référence inexistante, score hors
 * bornes, dates inversées) sont bloquées ; le reste remonte en avertissement.
 */

/** Seuil en dessous duquel un plan d'action correctif est normalement requis. */
const ACTION_PLAN_SCORE_THRESHOLD = 65

/** Statuts terminaux : les modifier relève d'une correction exceptionnelle. */
const TERMINAL_STATUSES: AuditStatusType[] = [
  AuditStatus.COMPLETED,
  AuditStatus.REFUSED_BY_OE,
  AuditStatus.REFUSED_PLAN,
]

/**
 * Corps de la requête admin. `undefined` = champ non touché.
 * `null` sur un champ nullable = effacement de la valeur.
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

export type AuditAdminField = keyof AuditAdminBody

export interface AuditAdminChangeItem {
  field: AuditAdminField
  fieldLabel: string
  from: unknown
  to: unknown
  fromLabel: string
  toLabel: string
}

export interface AuditAdminPlan {
  changes: AuditAdminChangeItem[]
  warnings: string[]
  blocked: { reason: string } | null
  /** Valeurs à écrire telles quelles sur la ligne audit. */
  set: Record<string, unknown>
  /** Statut cible si le statut change (déclenche la resynchro des actions). */
  statusChange: { from: AuditStatusType; to: AuditStatusType } | null
}

export const AUDIT_ADMIN_FIELD_LABELS: Record<AuditAdminField, string> = {
  status: 'Statut',
  type: "Type d'audit",
  monitoringMode: 'Mode de suivi',
  oeId: 'Organisme évaluateur',
  auditorId: 'Auditeur',
  externalAuditorName: 'Auditeur externe',
  plannedDate: 'Date prévisionnelle',
  actualStartDate: 'Date de début réelle',
  actualEndDate: 'Date de fin réelle',
  globalScore: 'Score global',
  oeOpinion: "Avis de l'OE",
  oeOpinionArgumentaire: "Argumentaire de l'avis OE",
  oeOpinionConditions: "Conditions de l'avis OE",
  actionPlanType: "Type de plan d'action",
  actionPlanDeadline: "Échéance du plan d'action",
  feefDecision: 'Décision FEEF',
  labelExpirationDate: "Date d'expiration du label",
  oeAccepted: "Acceptation par l'OE",
  oeRefusalReason: "Motif de refus de l'OE",
  planRefusalReason: 'Motif de refus du plan',
  hasComplementaryAudit: 'Audit complémentaire',
  complementaryStartDate: 'Début audit complémentaire',
  complementaryEndDate: 'Fin audit complémentaire',
  complementaryGlobalScore: 'Score audit complémentaire',
  previousAuditId: 'Audit précédent',
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime())
}

/** Normalise une valeur de date d'audit (colonne `date`) en 'YYYY-MM-DD' ou null. */
function normalizeDate(value: string | Date | null): string | null {
  if (value === null) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return value.slice(0, 10)
}

function emptyToNull(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function formatDateLabel(value: string | null): string {
  if (!value) return 'aucune'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function formatBooleanLabel(value: boolean | null): string {
  if (value === null) return 'non renseigné'
  return value ? 'oui' : 'non'
}

function formatTextLabel(value: string | null): string {
  if (!value) return 'aucun'
  return value.length > 60 ? `${value.slice(0, 57)}...` : value
}

/**
 * Compare deux valeurs scalaires en traitant `undefined` comme « non fourni ».
 */
function hasChanged(current: unknown, next: unknown): boolean {
  if (next === undefined) return false
  return current !== next
}

export async function loadAuditForAdmin(auditId: number): Promise<Audit | null> {
  const audit = await db.query.audits.findFirst({
    where: and(eq(audits.id, auditId), isNull(audits.deletedAt)),
  })
  return audit ?? null
}

/**
 * Calcule le plan de modification administrative d'un audit.
 * Partagé par l'endpoint de preview (dry-run) et l'endpoint d'application.
 */
export async function planAuditAdminChange(
  audit: Audit,
  body: AuditAdminBody,
): Promise<AuditAdminPlan> {
  const changes: AuditAdminChangeItem[] = []
  const warnings: string[] = []
  const set: Record<string, unknown> = {}
  let statusChange: AuditAdminPlan['statusChange'] = null

  const blocked = (reason: string): AuditAdminPlan => ({
    changes,
    warnings,
    blocked: { reason },
    set: {},
    statusChange: null,
  })

  const track = (
    field: AuditAdminField,
    from: unknown,
    to: unknown,
    fromLabel: string,
    toLabel: string,
  ) => {
    changes.push({
      field,
      fieldLabel: AUDIT_ADMIN_FIELD_LABELS[field],
      from,
      to,
      fromLabel,
      toLabel,
    })
    set[field] = to
  }

  // --- Statut ---
  if (body.status !== undefined && body.status !== audit.status) {
    if (!Object.values(AuditStatus).includes(body.status)) {
      return blocked(`Statut invalide : ${body.status}.`)
    }
    const currentStatus = audit.status as AuditStatusType
    statusChange = { from: currentStatus, to: body.status }
    track(
      'status',
      currentStatus,
      body.status,
      AuditStatusLabels[currentStatus] ?? currentStatus,
      AuditStatusLabels[body.status],
    )

    warnings.push(
      'Le statut est forcé sans passer par le workflow : les actions en cours de cet audit seront annulées, puis les actions du nouveau statut seront créées.',
    )
    if (TERMINAL_STATUSES.includes(currentStatus)) {
      warnings.push(
        `Cet audit est dans un état terminal (${AuditStatusLabels[currentStatus]}). Le rouvrir peut rendre incohérentes les pièces déjà émises (attestation, avis).`,
      )
    }
    if (body.status === AuditStatus.COMPLETED) {
      warnings.push(
        "Le passage manuel en Terminé ne génère pas d'attestation et ne calcule pas la date d'expiration du label : renseignez-la si nécessaire.",
      )
    }
  }

  // --- Type et mode de suivi ---
  const futureType: AuditTypeType = body.type ?? (audit.type as AuditTypeType)

  if (body.type !== undefined && body.type !== audit.type) {
    if (!Object.values(AuditType).includes(body.type)) {
      return blocked(`Type d'audit invalide : ${body.type}.`)
    }
    track(
      'type',
      audit.type,
      body.type,
      AuditTypeLabels[audit.type as AuditTypeType] ?? String(audit.type),
      AuditTypeLabels[body.type],
    )
  }

  if (body.monitoringMode !== undefined && body.monitoringMode !== audit.monitoringMode) {
    if (body.monitoringMode !== null && !Object.values(MonitoringMode).includes(body.monitoringMode)) {
      return blocked(`Mode de suivi invalide : ${body.monitoringMode}.`)
    }
    if (body.monitoringMode !== null && futureType !== AuditType.MONITORING) {
      return blocked(
        `Le mode de suivi est réservé aux audits de type ${AuditTypeLabels[AuditType.MONITORING]}.`,
      )
    }
    track(
      'monitoringMode',
      audit.monitoringMode,
      body.monitoringMode,
      audit.monitoringMode
        ? MonitoringModeLabels[audit.monitoringMode as MonitoringModeType]
        : 'aucun',
      body.monitoringMode ? MonitoringModeLabels[body.monitoringMode] : 'aucun',
    )
  }

  // Un audit de suivi sans mode de suivi est incohérent pour les écrans métier.
  const futureMonitoringMode =
    body.monitoringMode !== undefined ? body.monitoringMode : audit.monitoringMode
  if (futureType === AuditType.MONITORING && !futureMonitoringMode) {
    warnings.push(
      "Cet audit de suivi n'a pas de mode de suivi (physique ou documentaire) : certains écrans peuvent l'afficher de façon incomplète.",
    )
  }
  if (futureType !== AuditType.MONITORING && futureMonitoringMode) {
    warnings.push(
      "Le mode de suivi renseigné sera ignoré : il ne s'applique qu'aux audits de suivi.",
    )
  }

  // --- Organisme évaluateur ---
  let futureOeId = audit.oeId
  if (body.oeId !== undefined && body.oeId !== audit.oeId) {
    let toLabel = "aucun (appel d'offre)"
    if (body.oeId !== null) {
      const targetOe = await db.query.oes.findFirst({
        where: and(eq(oes.id, body.oeId), isNull(oes.deletedAt)),
        columns: { id: true, name: true },
      })
      if (!targetOe) {
        return blocked('Organisme évaluateur cible introuvable ou supprimé.')
      }
      toLabel = `${targetOe.name} (#${targetOe.id})`
    }

    let fromLabel = 'aucun'
    if (audit.oeId) {
      const currentOe = await db.query.oes.findFirst({
        where: eq(oes.id, audit.oeId),
        columns: { id: true, name: true },
      })
      fromLabel = currentOe ? `${currentOe.name} (#${currentOe.id})` : `OE #${audit.oeId}`
    }

    track('oeId', audit.oeId, body.oeId, fromLabel, toLabel)
    futureOeId = body.oeId
  }

  // --- Auditeur (compte interne ou auditeur externe) ---
  const futureAuditorId = body.auditorId !== undefined ? body.auditorId : audit.auditorId
  const normalizedExternalName = emptyToNull(body.externalAuditorName)
  const futureExternalName =
    normalizedExternalName !== undefined ? normalizedExternalName : audit.externalAuditorName

  if (futureAuditorId && futureExternalName) {
    return blocked(
      'Un audit ne peut pas avoir à la fois un auditeur interne et un auditeur externe. Videz l\'un des deux champs.',
    )
  }

  if (body.auditorId !== undefined && body.auditorId !== audit.auditorId) {
    let toLabel = 'aucun'
    if (body.auditorId !== null) {
      const auditor = await db.query.accounts.findFirst({
        where: and(eq(accounts.id, body.auditorId), isNull(accounts.deletedAt)),
        columns: { id: true, firstname: true, lastname: true, role: true },
      })
      if (!auditor) {
        return blocked('Compte auditeur introuvable ou supprimé.')
      }
      if (auditor.role !== Role.AUDITOR) {
        return blocked(`Le compte #${auditor.id} n'a pas le rôle Auditeur.`)
      }
      toLabel = `${auditor.firstname} ${auditor.lastname} (#${auditor.id})`
    }

    let fromLabel = 'aucun'
    if (audit.auditorId) {
      const currentAuditor = await db.query.accounts.findFirst({
        where: eq(accounts.id, audit.auditorId),
        columns: { id: true, firstname: true, lastname: true },
      })
      fromLabel = currentAuditor
        ? `${currentAuditor.firstname} ${currentAuditor.lastname} (#${currentAuditor.id})`
        : `Compte #${audit.auditorId}`
    }

    track('auditorId', audit.auditorId, body.auditorId, fromLabel, toLabel)
  }

  if (normalizedExternalName !== undefined && normalizedExternalName !== audit.externalAuditorName) {
    track(
      'externalAuditorName',
      audit.externalAuditorName,
      normalizedExternalName,
      formatTextLabel(audit.externalAuditorName),
      formatTextLabel(normalizedExternalName),
    )
  }

  if (futureAuditorId && !futureOeId) {
    warnings.push(
      "Un auditeur est assigné alors qu'aucun organisme évaluateur ne l'est : vérifiez la cohérence du dossier.",
    )
  }

  // --- Dates d'audit ---
  const dateFields: Array<{
    field: 'plannedDate' | 'actualStartDate' | 'actualEndDate' | 'complementaryStartDate' | 'complementaryEndDate' | 'labelExpirationDate'
  }> = [
    { field: 'plannedDate' },
    { field: 'actualStartDate' },
    { field: 'actualEndDate' },
    { field: 'complementaryStartDate' },
    { field: 'complementaryEndDate' },
    { field: 'labelExpirationDate' },
  ]

  for (const { field } of dateFields) {
    const raw = emptyToNull(body[field] as string | null | undefined)
    if (raw === undefined) continue
    if (raw !== null && !isValidDate(raw)) {
      return blocked(`${AUDIT_ADMIN_FIELD_LABELS[field]} invalide : format attendu AAAA-MM-JJ.`)
    }
    const current = normalizeDate(audit[field] as string | Date | null)
    if (raw !== current) {
      track(field, current, raw, formatDateLabel(current), formatDateLabel(raw))
    }
  }

  const futureStart =
    'actualStartDate' in set
      ? (set.actualStartDate as string | null)
      : normalizeDate(audit.actualStartDate as string | Date | null)
  const futureEnd =
    'actualEndDate' in set
      ? (set.actualEndDate as string | null)
      : normalizeDate(audit.actualEndDate as string | Date | null)
  if (futureStart && futureEnd && futureEnd < futureStart) {
    return blocked('La date de fin réelle ne peut pas être antérieure à la date de début réelle.')
  }

  const futureCompStart =
    'complementaryStartDate' in set
      ? (set.complementaryStartDate as string | null)
      : normalizeDate(audit.complementaryStartDate as string | Date | null)
  const futureCompEnd =
    'complementaryEndDate' in set
      ? (set.complementaryEndDate as string | null)
      : normalizeDate(audit.complementaryEndDate as string | Date | null)
  if (futureCompStart && futureCompEnd && futureCompEnd < futureCompStart) {
    return blocked(
      "La date de fin de l'audit complémentaire ne peut pas être antérieure à sa date de début.",
    )
  }

  // --- Échéance du plan d'action (timestamp) ---
  const rawDeadline = emptyToNull(body.actionPlanDeadline)
  if (rawDeadline !== undefined) {
    let nextDeadline: Date | null = null
    if (rawDeadline !== null) {
      if (!isValidDate(rawDeadline)) {
        return blocked("Échéance du plan d'action invalide : format attendu AAAA-MM-JJ.")
      }
      nextDeadline = new Date(`${rawDeadline}T00:00:00.000Z`)
    }
    const currentDeadline = audit.actionPlanDeadline
      ? normalizeDate(audit.actionPlanDeadline)
      : null
    if (rawDeadline !== currentDeadline) {
      track(
        'actionPlanDeadline',
        currentDeadline,
        nextDeadline,
        formatDateLabel(currentDeadline),
        formatDateLabel(rawDeadline),
      )
    }
  }

  // --- Scores ---
  const scoreFields: Array<'globalScore' | 'complementaryGlobalScore'> = [
    'globalScore',
    'complementaryGlobalScore',
  ]
  for (const field of scoreFields) {
    const value = body[field]
    if (value === undefined) continue
    if (value !== null && (!Number.isInteger(value) || value < 0 || value > 100)) {
      return blocked(`${AUDIT_ADMIN_FIELD_LABELS[field]} invalide : entier entre 0 et 100 attendu.`)
    }
    if (hasChanged(audit[field], value)) {
      track(
        field,
        audit[field],
        value,
        audit[field] === null ? 'aucun' : `${audit[field]}/100`,
        value === null ? 'aucun' : `${value}/100`,
      )
    }
  }

  // --- Avis de l'OE ---
  if (body.oeOpinion !== undefined && body.oeOpinion !== audit.oeOpinion) {
    if (body.oeOpinion !== null && !Object.values(OeOpinion).includes(body.oeOpinion)) {
      return blocked(`Avis de l'OE invalide : ${body.oeOpinion}.`)
    }
    track(
      'oeOpinion',
      audit.oeOpinion,
      body.oeOpinion,
      audit.oeOpinion ? OeOpinionLabels[audit.oeOpinion as OeOpinionType] : 'aucun',
      body.oeOpinion ? OeOpinionLabels[body.oeOpinion] : 'aucun',
    )
  }

  for (const field of ['oeOpinionArgumentaire', 'oeOpinionConditions', 'oeRefusalReason', 'planRefusalReason'] as const) {
    const value = emptyToNull(body[field])
    if (value === undefined) continue
    if (value !== audit[field]) {
      track(field, audit[field], value, formatTextLabel(audit[field]), formatTextLabel(value))
    }
  }

  // --- Plan d'action ---
  if (body.actionPlanType !== undefined && body.actionPlanType !== audit.actionPlanType) {
    if (!Object.values(ActionPlanType).includes(body.actionPlanType)) {
      return blocked(`Type de plan d'action invalide : ${body.actionPlanType}.`)
    }
    track(
      'actionPlanType',
      audit.actionPlanType,
      body.actionPlanType,
      ActionPlanTypeLabels[audit.actionPlanType as ActionPlanTypeType] ?? 'aucun',
      ActionPlanTypeLabels[body.actionPlanType],
    )
  }

  const futureScore = 'globalScore' in set ? (set.globalScore as number | null) : audit.globalScore
  const futureActionPlanType =
    body.actionPlanType !== undefined ? body.actionPlanType : audit.actionPlanType
  if (
    futureScore !== null
    && futureScore < ACTION_PLAN_SCORE_THRESHOLD
    && futureActionPlanType === ActionPlanType.NONE
  ) {
    warnings.push(
      `Le score global (${futureScore}/100) est inférieur à ${ACTION_PLAN_SCORE_THRESHOLD} mais aucun plan d'action n'est défini. Le type de plan d'action n'est pas recalculé automatiquement en mode administrateur.`,
    )
  }

  // --- Décision FEEF ---
  if (body.feefDecision !== undefined && body.feefDecision !== audit.feefDecision) {
    if (body.feefDecision !== null && !Object.values(FeefDecision).includes(body.feefDecision)) {
      return blocked(`Décision FEEF invalide : ${body.feefDecision}.`)
    }
    track(
      'feefDecision',
      audit.feefDecision,
      body.feefDecision,
      audit.feefDecision ? FeefDecisionLabels[audit.feefDecision as FeefDecisionType] : 'aucune',
      body.feefDecision ? FeefDecisionLabels[body.feefDecision] : 'aucune',
    )
  }

  const futureDecision = body.feefDecision !== undefined ? body.feefDecision : audit.feefDecision
  const futureExpiration =
    'labelExpirationDate' in set
      ? (set.labelExpirationDate as string | null)
      : normalizeDate(audit.labelExpirationDate as string | Date | null)
  if (futureDecision === FeefDecision.ACCEPTED && !futureExpiration) {
    warnings.push(
      "La décision FEEF est Accepté mais aucune date d'expiration du label n'est renseignée : l'entité n'apparaîtra pas comme labellisée dans les indicateurs.",
    )
  }

  // --- Acceptation OE ---
  if (body.oeAccepted !== undefined && body.oeAccepted !== audit.oeAccepted) {
    track(
      'oeAccepted',
      audit.oeAccepted,
      body.oeAccepted,
      formatBooleanLabel(audit.oeAccepted),
      formatBooleanLabel(body.oeAccepted),
    )
  }

  // --- Audit complémentaire ---
  if (
    body.hasComplementaryAudit !== undefined
    && body.hasComplementaryAudit !== audit.hasComplementaryAudit
  ) {
    track(
      'hasComplementaryAudit',
      audit.hasComplementaryAudit,
      body.hasComplementaryAudit,
      formatBooleanLabel(audit.hasComplementaryAudit),
      formatBooleanLabel(body.hasComplementaryAudit),
    )
  }

  // --- Audit précédent ---
  if (body.previousAuditId !== undefined && body.previousAuditId !== audit.previousAuditId) {
    let toLabel = 'aucun'
    if (body.previousAuditId !== null) {
      if (body.previousAuditId === audit.id) {
        return blocked('Un audit ne peut pas être son propre audit précédent.')
      }
      const previous = await db.query.audits.findFirst({
        where: and(
          eq(audits.id, body.previousAuditId),
          isNull(audits.deletedAt),
          ne(audits.id, audit.id),
        ),
        columns: { id: true, entityId: true, previousAuditId: true },
      })
      if (!previous) {
        return blocked('Audit précédent introuvable ou supprimé.')
      }
      if (previous.entityId !== audit.entityId) {
        return blocked("L'audit précédent doit appartenir à la même entité.")
      }
      if (previous.previousAuditId === audit.id) {
        return blocked('Cette liaison créerait une boucle entre les deux audits.')
      }
      toLabel = `Audit #${previous.id}`
    }
    track(
      'previousAuditId',
      audit.previousAuditId,
      body.previousAuditId,
      audit.previousAuditId ? `Audit #${audit.previousAuditId}` : 'aucun',
      toLabel,
    )
  }

  if (changes.length === 0) {
    return blocked('Aucun changement à appliquer.')
  }

  return { changes, warnings, blocked: null, set, statusChange }
}
