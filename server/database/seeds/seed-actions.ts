import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { eq, isNull, and, notInArray } from 'drizzle-orm'
import { audits, accounts, actions } from '../schema'
import { ACTION_TYPE_REGISTRY, type ActionTypeType } from '../../../shared/types/actions'

// ============================================================
// Seed des actions (tâches utilisateur) pour les audits en cours.
//
// À lancer EN DERNIER, après seed-entities puis seed-audits : les deux
// purgent déjà la table actions, donc ce script reconstruit les actions
// à partir de l'état final et cohérent de la base.
//
// Principe : pour chaque audit NON TERMINAL, on recrée la (les) action(s)
// que la state machine aurait posée(s) à l'entrée de son statut courant.
// La source de vérité est le ACTION_TYPE_REGISTRY (rôles assignés + durée),
// via le trigger triggers.onAuditStatus, exactement comme la fonction de
// prod createActionsForAuditStatus. On n'appelle pas createAction() : ce
// dernier dépend du runtime Nuxt (auto-imports h3) et enverrait de vrais
// emails de notification, ce qui n'a pas lieu d'être dans un seed.
// ============================================================

// Statuts terminaux : aucune action en attente n'y est associée.
const TERMINAL_STATUSES = ['COMPLETED', 'REFUSED_BY_OE', 'REFUSED_PLAN'] as const

// ============================================================
// Helpers de dates
// ============================================================

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/** Fin de journée, pour homogénéiser les deadlines (comme en prod). */
function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

/** Parse une colonne date Drizzle (string 'YYYY-MM-DD' ou Date) en Date. */
function toDate(value: string | Date | null): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return isNaN(d.getTime()) ? null : d
}

type AuditRef = {
  id: number
  entityId: number
  status: string
  plannedDate: string | null
  actualStartDate: string | null
  actualEndDate: string | null
  actionPlanType: string | null
  actionPlanDeadline: Date | null
}

/**
 * Calcule la deadline d'une action à partir des dates RÉELLES de l'audit,
 * avec repli sur « aujourd'hui + durée par défaut » si la date utile manque.
 *
 * On cale la deadline sur le jalon métier pertinent pour le statut :
 *   - planification : avant la date d'audit prévue ;
 *   - revue documentaire : 7 jours avant le début (comme en prod) ;
 *   - rapport / avis / décision : après la fin d'audit + la durée allouée ;
 *   - plan correctif : la date limite stockée sur l'audit.
 */
function computeDeadline(audit: AuditRef, type: ActionTypeType, durationDays: number): Date {
  const planned = toDate(audit.plannedDate)
  const start = toDate(audit.actualStartDate)
  const end = toDate(audit.actualEndDate)
  const fallback = addDays(new Date(), durationDays)

  switch (type) {
    case 'SET_AUDIT_DATES':
    case 'UPLOAD_AUDIT_PLAN':
      // Le plan/les dates doivent être prêts pour le jour de l'audit.
      return endOfDay(planned ?? start ?? fallback)

    case 'ENTITY_MARK_DOCUMENTARY_REVIEW_READY': {
      // 7 jours avant le début de l'audit (logique identique à la prod).
      const ref = start ?? planned
      return endOfDay(ref ? addDays(ref, -7) : fallback)
    }

    case 'UPLOAD_AUDIT_REPORT':
    case 'UPLOAD_LABELING_OPINION':
    case 'FEEF_VALIDATE_LABELING_DECISION': {
      // Après la réalisation de l'audit + la durée allouée pour produire le livrable.
      const ref = end ?? start
      return endOfDay(ref ? addDays(ref, durationDays) : fallback)
    }

    case 'ENTITY_UPLOAD_CORRECTIVE_PLAN':
      return endOfDay(audit.actionPlanDeadline ?? fallback)

    default: {
      // Cas génériques (audit complémentaire, validation de plan...) :
      // ancrage sur la dernière date connue, sinon repli.
      const ref = end ?? start ?? planned
      return endOfDay(ref ? addDays(ref, durationDays) : fallback)
    }
  }
}

// ============================================================
// Script principal
// ============================================================

async function seedActions() {
  const pool = new Pool({ connectionString: process.env.NUXT_DATABASE_URL })
  const db = drizzle(pool)

  console.log('🌱 Génération des actions pour les audits en cours...\n')

  const [feefAdmin] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.role, 'FEEF'))
    .limit(1)

  if (!feefAdmin) {
    console.error('❌ Aucun compte FEEF trouvé. Lancez "npm run db:seed" d\'abord.')
    await pool.end()
    process.exit(1)
  }

  const createdBy = feefAdmin.id
  console.log(`👤 Compte FEEF : ${feefAdmin.email}`)

  // ──────────────────────────────────────────────────────────
  // NETTOYAGE | Ce script est le propriétaire de la table actions :
  // on repart d'une table vide pour rester idempotent et rejouable seul.
  // ──────────────────────────────────────────────────────────
  console.log('🧹 Nettoyage des actions existantes...')
  await db.delete(actions)
  console.log('✅ Nettoyage terminé\n')

  // ──────────────────────────────────────────────────────────
  // Audits en cours = tous les audits non supprimés dont le statut
  // n'est pas terminal. Ce sont les seuls à porter des actions en attente.
  // ──────────────────────────────────────────────────────────
  const ongoingAudits: AuditRef[] = await db
    .select({
      id: audits.id,
      entityId: audits.entityId,
      status: audits.status,
      plannedDate: audits.plannedDate,
      actualStartDate: audits.actualStartDate,
      actualEndDate: audits.actualEndDate,
      actionPlanType: audits.actionPlanType,
      actionPlanDeadline: audits.actionPlanDeadline,
    })
    .from(audits)
    .where(and(isNull(audits.deletedAt), notInArray(audits.status, [...TERMINAL_STATUSES]))) as AuditRef[]

  console.log(`📋 ${ongoingAudits.length} audit(s) en cours à traiter\n`)

  // Compteur d'actions créées par type, pour le résumé final.
  const createdByType = new Map<string, number>()
  let created = 0

  for (const audit of ongoingAudits) {
    // Pour ce statut, on cherche tous les types d'action que la state
    // machine déclencherait (même critère que createActionsForAuditStatus).
    for (const [actionType, definition] of Object.entries(ACTION_TYPE_REGISTRY)) {
      if (!definition.triggers.onAuditStatus?.includes(audit.status as never)) continue

      const type = actionType as ActionTypeType
      const durationDays = definition.defaultDurationDays
      const deadline = computeDeadline(audit, type, durationDays)
      // createdAt cohérent avec deadline = createdAt + durationDays.
      const createdAt = addDays(deadline, -durationDays)

      // Métadonnées du plan correctif, comme en prod.
      const metadata = type === 'ENTITY_UPLOAD_CORRECTIVE_PLAN' && audit.actionPlanDeadline
        ? { actionPlanType: audit.actionPlanType, originalDeadline: audit.actionPlanDeadline.toISOString() }
        : null

      await db.insert(actions).values({
        type,
        entityId: audit.entityId,
        auditId: audit.id,
        assignedRoles: definition.assignedRoles,
        status: 'PENDING',
        durationDays,
        deadline,
        metadata,
        createdBy,
        updatedBy: createdBy,
        createdAt,
        updatedAt: new Date(),
      })

      createdByType.set(type, (createdByType.get(type) ?? 0) + 1)
      created++
    }
  }

  console.log('─── Résumé ────────────────────────────')
  console.log(`✅ Actions créées : ${created}`)
  for (const [type, count] of Array.from(createdByType.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`   ↪ ${type} : ${count}`)
  }
  console.log('────────────────────────────────────────')

  await pool.end()
  console.log('🏁 Génération terminée')
}

seedActions().catch((error) => {
  console.error(error)
  process.exit(1)
})
