import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import Papa from 'papaparse'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { eq, isNotNull } from 'drizzle-orm'
import { audits, entities, accounts, notifications, events, actions, auditNotation, documentVersions } from '../schema'

// ============================================================
// Mapping AUDIT_TYPE CSV → enums DB
// ============================================================

type AuditTypeEnum = 'INITIAL' | 'RENEWAL' | 'MONITORING'
type MonitoringModeEnum = 'PHYSICAL' | 'DOCUMENTARY'
type AuditStatusEnum = 'PLANNING' | 'SCHEDULED' | 'PENDING_REPORT' | 'PENDING_OE_OPINION' | 'PENDING_FEEF_DECISION' | 'COMPLETED'

function mapAuditType(raw: string): { type: AuditTypeEnum; monitoringMode: MonitoringModeEnum | null } {
  switch (raw.trim().toLowerCase()) {
    case 'initial inspection':
      return { type: 'INITIAL', monitoringMode: null }
    case 'renewal audit':
      return { type: 'RENEWAL', monitoringMode: null }
    case 'annual inspection':
      return { type: 'MONITORING', monitoringMode: 'PHYSICAL' }
    case 'documentary review':
      return { type: 'MONITORING', monitoringMode: 'DOCUMENTARY' }
    case 'additional inspection':
      return { type: 'MONITORING', monitoringMode: 'PHYSICAL' }
    default:
      return { type: 'MONITORING', monitoringMode: 'PHYSICAL' }
  }
}

function mapAuditStatus(csvStatus: string, actualEndDate: Date | null, plannedDate: Date | null): AuditStatusEnum {
  let status: AuditStatusEnum
  switch (csvStatus.trim().toLowerCase()) {
    case '4-certification finished':
      return 'COMPLETED'
    case '1-inspection order created':
    case '2-inspector\'s infoportal':
      status = 'PLANNING'
      break
    case '2-inspection order accepted':
      return 'SCHEDULED'
    case '2-inspection in progress': {
      if (actualEndDate && actualEndDate < new Date()) return 'PENDING_REPORT'
      return 'SCHEDULED'
    }
    case '3-inspection finished - pool':
      return 'PENDING_OE_OPINION'
    case '3-certification in progress':
    case '3-certification order accepted':
      return 'PENDING_FEEF_DECISION'
    default:
      status = 'PLANNING'
  }

  if (status === 'PLANNING' && plannedDate) return 'SCHEDULED'
  return status
}

// ============================================================
// Fonctions utilitaires
// ============================================================

function cleanSiret(raw: string): string {
  return raw.replace(/\s/g, '').trim()
}

function parseDatetime(raw: string): Date | null {
  if (!raw || raw.trim() === '') return null

  // Essayer le format ISO d'abord (ex: "2025-11-28 00:00:00.000")
  const iso = new Date(raw.trim())
  if (!isNaN(iso.getTime())) return iso

  // Essayer le format DD/MM/YYYY (ex: "26/11/2025")
  const parts = raw.trim().split('/')
  if (parts.length === 3) {
    const d = parseInt(parts[0])
    const m = parseInt(parts[1]) - 1
    const y = parseInt(parts[2])
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
      const date = new Date(y, m, d)
      if (!isNaN(date.getTime())) return date
    }
  }

  return null
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// ============================================================
// Rapport
// ============================================================

type ReportLine = {
  ligne: number | string
  siret: string
  nom: string
  saison: string
  type_audit: string
  statut_ecocert: string
  probleme: string
  details: string
}

function writeReport(lines: ReportLine[], dirPath: string) {
  if (lines.length === 0) {
    console.log('✅ Aucune anomalie à reporter.')
    return
  }

  const date = new Date().toISOString().slice(0, 10)
  const reportPath = resolve(dirPath, `rapport-audits-${date}.csv`)

  const csv = Papa.unparse(lines, { delimiter: ';' })
  writeFileSync(reportPath, '\uFEFF' + csv, 'utf-8') // BOM pour Excel
  console.log(`\n📄 Rapport écrit : ${reportPath}`)
  console.log(`   ${lines.length} anomalie(s) détectée(s)`)
}

// ============================================================
// Type CSV
// ============================================================

type AuditRow = {
  SEASON: string
  ECOCERT_ID: string
  CLIENT_NAME: string
  SIRET: string
  AUDIT_TYPE: string
  AUDIT_STATUT: string
  STATUT_CONTRAT: string
  DATE_LIMITE_AUDIT: string
  PLANNED_DATE: string
  DATE_AUDIT_DEBUT: string
  DATE_AUDIT_FIN: string
  AUDITOR_NAME: string
  DATE_DECISION: string
}

// ============================================================
// Script principal
// ============================================================

const ECOCERT_OE_ID = 1

async function seedAudits() {
  const pool = new Pool({
    connectionString: process.env.NUXT_DATABASE_URL,
  })
  const db = drizzle(pool)

  console.log('🌱 Import des audits Ecocert...\n')

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
  console.log(`🏢 OE Ecocert ID : ${ECOCERT_OE_ID}\n`)

  // ──────────────────────────────────────────────────────────
  // NETTOYAGE — Supprimer tous les audits et données liées
  // ──────────────────────────────────────────────────────────
  console.log('🧹 Nettoyage des audits existants...\n')

  await db.update(audits).set({ previousAuditId: null })
  await db.delete(notifications).where(isNotNull(notifications.auditId))
  await db.delete(events).where(isNotNull(events.auditId))
  await db.delete(actions).where(isNotNull(actions.auditId))
  await db.delete(auditNotation)
  await db.delete(documentVersions).where(isNotNull(documentVersions.auditId))
  await db.delete(audits)

  console.log('✅ Nettoyage terminé\n')

  const csvPath = resolve(import.meta.dirname, 'audits-ecocert.csv')
  const csvContent = readFileSync(csvPath, 'utf-8')

  const { data: rows, errors } = Papa.parse<AuditRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h) => h.trim(),
  })

  if (errors.length > 0) {
    console.warn(`⚠️  ${errors.length} erreur(s) CSV`)
    errors.slice(0, 3).forEach(e => console.warn(`   Ligne ${e.row}: ${e.message}`))
  }

  console.log(`📋 ${rows.length} lignes lues\n`)

  const report: ReportLine[] = []
  let created = 0
  let skippedNoSiret = 0
  let skippedNotFound = 0
  let errorCount = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2

    const baseReport = {
      ligne: rowNum,
      siret: row['SIRET'] ?? '',
      nom: row['CLIENT_NAME'] ?? '',
      saison: row['SEASON'] ?? '',
      type_audit: row['AUDIT_TYPE'] ?? '',
      statut_ecocert: row['AUDIT_STATUT'] ?? '',
    }

    const siret = cleanSiret(row['SIRET'] ?? '')
    if (!siret || siret.length < 9) {
      console.warn(`  [L${rowNum}] ⏭️  Pas de SIRET : "${row['CLIENT_NAME']}" → ignoré`)
      report.push({ ...baseReport, probleme: 'SIRET manquant', details: `SIRET brut : "${row['SIRET'] ?? ''}"` })
      skippedNoSiret++
      continue
    }

    const [entity] = await db
      .select()
      .from(entities)
      .where(eq(entities.siret, siret))
      .limit(1)

    if (!entity) {
      console.warn(`  [L${rowNum}] ⚠️  Entité introuvable : SIRET=${siret} (${row['CLIENT_NAME']})`)
      report.push({ ...baseReport, probleme: 'SIRET inconnu dans la base FEEF', details: `SIRET Ecocert : ${siret} — ID Ecocert : ${row['ECOCERT_ID'] ?? ''}` })
      skippedNotFound++
      continue
    }

    const { type, monitoringMode } = mapAuditType(row['AUDIT_TYPE'] ?? '')
    const plannedDate = parseDatetime(row['PLANNED_DATE'] ?? '')
    const actualStartDate = parseDatetime(row['DATE_AUDIT_DEBUT'] ?? '')
    const actualEndDate = parseDatetime(row['DATE_AUDIT_FIN'] ?? '')
    const dateLimite = parseDatetime(row['DATE_LIMITE_AUDIT'] ?? '')
    const auditorName = (row['AUDITOR_NAME'] ?? '').trim()
    const season = parseInt(row['SEASON'] ?? '0')

    const status = mapAuditStatus(row['AUDIT_STATUT'] ?? '', actualEndDate, plannedDate)
    const feefDecision = status === 'COMPLETED' ? 'ACCEPTED' : null

    const now = new Date()
    const createdAt = (dateLimite && dateLimite < now) ? dateLimite : now

    try {
      const [insertedAudit] = await db.insert(audits).values({
        entityId: entity.id,
        oeId: ECOCERT_OE_ID,
        type,
        ...(monitoringMode !== null ? { monitoringMode } : {}),
        status,
        ...(feefDecision ? { feefDecision } : {}),
        ...(auditorName ? { externalAuditorName: auditorName } : {}),
        ...(plannedDate ? { plannedDate: toDateString(plannedDate) } : {}),
        ...(actualStartDate ? { actualStartDate: toDateString(actualStartDate) } : {}),
        ...(actualEndDate ? { actualEndDate: toDateString(actualEndDate) } : {}),
        createdBy,
        updatedBy: createdBy,
        createdAt,
        updatedAt: now,
      }).returning({ id: audits.id })

      if (status === 'COMPLETED' && feefDecision === 'ACCEPTED') {
        const decisionDate = parseDatetime(row['DATE_DECISION'] ?? '')
        await db.insert(events).values({
          type: 'AUDIT_FEEF_DECISION_ACCEPTED',
          category: 'AUDIT',
          auditId: insertedAudit.id,
          entityId: entity.id,
          performedBy: createdBy,
          performedAt: decisionDate ?? actualEndDate ?? new Date(),
        })
      }

      console.log(`  [L${rowNum}] ✅ Créé : ${entity.name} — ${type}${monitoringMode ? ` (${monitoringMode})` : ''} ${season} → ${status}`)
      created++
    }
    catch (error) {
      console.error(`  [L${rowNum}] ❌ Erreur : ${entity.name} — ${error}`)
      report.push({ ...baseReport, probleme: 'Erreur technique lors de l\'insertion', details: String(error) })
      errorCount++
    }
  }

  console.log('\n─── Résumé ────────────────────────────')
  console.log(`✅ Créés           : ${created}`)
  console.log(`⏭️  Sans SIRET      : ${skippedNoSiret}`)
  console.log(`⚠️  Entité inconnue : ${skippedNotFound}`)
  console.log(`❌ Erreurs         : ${errorCount}`)
  console.log('────────────────────────────────────────')

  writeReport(report, import.meta.dirname)

  await pool.end()
  console.log('🏁 Import terminé')
}

seedAudits().catch((error) => {
  console.error(error)
  process.exit(1)
})
