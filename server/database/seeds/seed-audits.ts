import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import Papa from 'papaparse'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { eq, isNull, isNotNull } from 'drizzle-orm'
import { audits, entities, accounts, oes, notifications, events, actions, auditNotation, documentVersions } from '../schema'
import { normalizeSiret, isUsableSiret } from './read-completed-xlsx'

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
    case '3-inspection finished - pool':
      return 'PENDING_OE_OPINION'
    case '3-certification in progress':
    case '3-certification order accepted':
      return 'PENDING_FEEF_DECISION'
    case '2-inspection in progress':
      if (actualEndDate && actualEndDate < new Date()) return 'PENDING_REPORT'
      status = 'SCHEDULED'
      break
    default:
      status = 'PLANNING'
  }

  if (status === 'PLANNING' && plannedDate) return 'SCHEDULED'
  if (status === 'SCHEDULED' && !plannedDate) return 'PLANNING'
  return status
}

// ============================================================
// Fonctions utilitaires
// ============================================================

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

/** Normalise un nom d'entreprise pour le rapprochement (majuscules, sans accent). */
function normalizeName(raw: string): string {
  return (raw ?? '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
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

  // OE Ecocert : on récupère son id en base, ou on le crée s'il manque.
  const [existingOe] = await db
    .select({ id: oes.id })
    .from(oes)
    .where(eq(oes.name, 'Ecocert'))
    .limit(1)
  let ECOCERT_OE_ID: number
  if (existingOe) {
    ECOCERT_OE_ID = existingOe.id
  }
  else {
    const [createdOe] = await db
      .insert(oes)
      .values({ name: 'Ecocert', createdBy })
      .returning({ id: oes.id })
    ECOCERT_OE_ID = createdOe.id
    console.log('🏢 OE Ecocert créé en base')
  }
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

  // ──────────────────────────────────────────────────────────
  // Table ECOCERT_ID → SIRET, par auto-jointure de audits-ecocert.csv.
  //
  // L'ECOCERT_ID est le numéro de dossier Ecocert d'une entreprise : il
  // est stable d'une saison à l'autre et identifie l'entité. Certains
  // audits n'ont pas de SIRET renseigné, mais un autre audit partageant
  // le même ECOCERT_ID en a un : on récupère ainsi le SIRET réel.
  // Un ECOCERT_ID lié à plusieurs SIRET distincts est écarté (ambigu).
  // ──────────────────────────────────────────────────────────
  const siretsByEcocert = new Map<string, Set<string>>()
  for (const row of rows) {
    const eco = (row['ECOCERT_ID'] ?? '').trim()
    const s = normalizeSiret(row['SIRET'] ?? '')
    if (!eco || !isUsableSiret(s)) continue
    if (!siretsByEcocert.has(eco)) siretsByEcocert.set(eco, new Set())
    siretsByEcocert.get(eco)!.add(s)
  }
  const ecocertToSiret = new Map<string, string>()
  for (const [eco, set] of siretsByEcocert) {
    if (set.size === 1) ecocertToSiret.set(eco, [...set][0])
  }
  console.log(`🔖 ${ecocertToSiret.size} correspondances ECOCERT_ID → SIRET\n`)

  // ──────────────────────────────────────────────────────────
  // Overrides de rattachement validés par la FEEF.
  //
  // Certains audits Ecocert ne sont rattachables ni par SIRET, ni par
  // SIREN, ni par nom : SIRET radié, tronqué, ou labellisation portée
  // par une autre personne morale. La FEEF a tranché ces cas un par un
  // (voir audits-rattachement-overrides.csv) : l'ECOCERT_ID y est
  // associé au SIRET de l'entité cible, qui prime sur la cascade.
  // ──────────────────────────────────────────────────────────
  const ecocertOverrides = new Map<string, string>()
  try {
    const overridePath = resolve(import.meta.dirname, 'audits-rattachement-overrides.csv')
    const overrideRows = Papa.parse<{ ecocertId: string; siretCible: string }>(
      readFileSync(overridePath, 'utf-8'),
      { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() },
    ).data
    for (const o of overrideRows) {
      const eco = (o.ecocertId ?? '').trim()
      const cible = normalizeSiret(o.siretCible ?? '')
      if (eco && isUsableSiret(cible)) ecocertOverrides.set(eco, cible)
    }
  }
  catch {
    // Fichier d'overrides absent : on continue sur la cascade seule.
  }
  console.log(`🎯 ${ecocertOverrides.size} override(s) de rattachement FEEF\n`)

  // ──────────────────────────────────────────────────────────
  // Index des entités en base pour le rapprochement des audits.
  // On indexe les entités non supprimées par SIRET exact, par SIREN
  // (9 premiers chiffres) et par nom normalisé. Les audits sont
  // rattachés en cascade : SIRET exact → SIREN → nom.
  // ──────────────────────────────────────────────────────────
  type EntityRef = { id: number; name: string; siret: string; ecocertIdDb: string | null }
  const liveEntities = await db
    .select({
      id: entities.id,
      name: entities.name,
      siret: entities.siret,
      ecocertIdDb: entities.ecocertId,
    })
    .from(entities)
    .where(isNull(entities.deletedAt))

  const entityBySiret = new Map<string, EntityRef>()
  const entitiesBySiren = new Map<string, EntityRef[]>()
  const entitiesByName = new Map<string, EntityRef[]>()
  for (const e of liveEntities) {
    entityBySiret.set(e.siret, e)
    const siren = e.siret.replace(/\D/g, '').slice(0, 9)
    if (siren.length === 9) {
      if (!entitiesBySiren.has(siren)) entitiesBySiren.set(siren, [])
      entitiesBySiren.get(siren)!.push(e)
    }
    const nn = normalizeName(e.name)
    if (nn) {
      if (!entitiesByName.has(nn)) entitiesByName.set(nn, [])
      entitiesByName.get(nn)!.push(e)
    }
  }
  console.log(`🏢 ${liveEntities.length} entités actives indexées (SIRET / SIREN / nom)\n`)

  type MatchVia = 'override' | 'siret' | 'siren' | 'ecocert' | 'nom'

  /** Cherche une entité par SIRET exact, puis par SIREN. */
  function findBySiret(siret: string): { entity: EntityRef; via: MatchVia } | null {
    if (!isUsableSiret(siret)) return null
    const exact = entityBySiret.get(siret)
    if (exact) return { entity: exact, via: 'siret' }
    const sirenCandidates = entitiesBySiren.get(siret.slice(0, 9)) ?? []
    if (sirenCandidates.length === 1) return { entity: sirenCandidates[0], via: 'siren' }
    return null
  }

  /**
   * Rattache une ligne d'audit à une entité, en cascade :
   *   1. SIRET exact
   *   2. SIREN (autre établissement de la même personne morale)
   *   3. ECOCERT_ID (SIRET réel déduit de l'auto-jointure du CSV)
   *   4. nom d'entreprise normalisé
   * Renvoie l'entité trouvée et le critère utilisé, ou null.
   */
  function matchEntity(siret: string, ecocertId: string, clientName: string): { entity: EntityRef; via: MatchVia } | null {
    // 0. Override FEEF : l'ECOCERT_ID impose le SIRET de l'entité cible.
    if (ecocertId) {
      const forced = ecocertOverrides.get(ecocertId)
      if (forced) {
        const byForced = findBySiret(forced)
        if (byForced) return { entity: byForced.entity, via: 'override' }
      }
    }

    // 1-2. SIRET exact puis SIREN.
    const bySiret = findBySiret(siret)
    if (bySiret) return bySiret

    // En cas de plusieurs établissements pour ce SIREN, on départage
    // par le nom avant de passer aux autres critères.
    if (isUsableSiret(siret)) {
      const sirenCandidates = entitiesBySiren.get(siret.slice(0, 9)) ?? []
      if (sirenCandidates.length > 1) {
        const nn = normalizeName(clientName)
        const byName = sirenCandidates.filter((e) => normalizeName(e.name) === nn)
        if (byName.length === 1) return { entity: byName[0], via: 'siren' }
      }
    }

    // 3. ECOCERT_ID : on déduit le SIRET réel de l'entreprise.
    if (ecocertId) {
      const resolved = ecocertToSiret.get(ecocertId)
      if (resolved && resolved !== siret) {
        const byEco = findBySiret(resolved)
        if (byEco) return { entity: byEco.entity, via: 'ecocert' }
      }
    }

    // 4. Rapprochement par nom (dernier recours).
    const nameCandidates = entitiesByName.get(normalizeName(clientName)) ?? []
    if (nameCandidates.length === 1) return { entity: nameCandidates[0], via: 'nom' }

    return null
  }

  const report: ReportLine[] = []

  // Suivi des ECOCERT_ID distincts par entité, pour produire en fin
  // d'import un rapport des entités rattachées à plusieurs dossiers
  // Ecocert. C'est ici qu'on dispose à la fois de l'entité résolue et
  // de l'ECOCERT_ID brut de la ligne ; après l'insertion, l'info ne
  // serait plus reconstituable depuis la base (audits ne stocke pas
  // d'ECOCERT_ID).
  type EcocertStats = {
    count: number
    clientNames: Set<string>
    seasons: Set<string>
    matchVias: Set<MatchVia>
  }
  const ecocertIdsByEntity = new Map<number, { entity: EntityRef; byEcocert: Map<string, EcocertStats> }>()

  let created = 0
  let skippedNoSiret = 0
  let skippedNotFound = 0
  let matchedByOverride = 0
  let matchedBySiren = 0
  let matchedByEcocert = 0
  let matchedByName = 0
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

    const siret = normalizeSiret(row['SIRET'] ?? '')
    const clientName = (row['CLIENT_NAME'] ?? '').trim()
    const ecocertId = (row['ECOCERT_ID'] ?? '').trim()

    // Rattachement en cascade : SIRET exact → SIREN → ECOCERT_ID → nom.
    // On ne rattache jamais vers une entité supprimée (sortante).
    const match = matchEntity(siret, ecocertId, clientName)

    if (!match) {
      if (!isUsableSiret(siret)) {
        console.warn(`  [L${rowNum}] ⏭️  SIRET manquant, nom non rapproché : "${clientName}"`)
        report.push({ ...baseReport, probleme: 'SIRET manquant', details: `SIRET brut : "${row['SIRET'] ?? ''}" — nom non rapproché à une entité de la base` })
        skippedNoSiret++
      }
      else {
        console.warn(`  [L${rowNum}] ⚠️  Entité introuvable : SIRET=${siret} (${clientName})`)
        report.push({ ...baseReport, probleme: 'SIRET inconnu dans la base FEEF', details: `SIRET Ecocert : ${siret} — SIREN ${siret.slice(0, 9)} absent de la base, nom non rapproché` })
        skippedNotFound++
      }
      continue
    }

    const entity = match.entity

    // Accumulation pour le rapport des entités multi-ECOCERT_ID.
    if (ecocertId) {
      if (!ecocertIdsByEntity.has(entity.id)) {
        ecocertIdsByEntity.set(entity.id, { entity, byEcocert: new Map() })
      }
      const bucket = ecocertIdsByEntity.get(entity.id)!
      if (!bucket.byEcocert.has(ecocertId)) {
        bucket.byEcocert.set(ecocertId, {
          count: 0,
          clientNames: new Set(),
          seasons: new Set(),
          matchVias: new Set(),
        })
      }
      const stats = bucket.byEcocert.get(ecocertId)!
      stats.count++
      if (clientName) stats.clientNames.add(clientName)
      const season = (row['SEASON'] ?? '').trim()
      if (season) stats.seasons.add(season)
      stats.matchVias.add(match.via)
    }

    // Les rattachements non exacts (SIREN, ECOCERT_ID ou nom) sont
    // tracés dans le rapport pour vérification par la FEEF. Les
    // overrides sont déjà validés par la FEEF : on les compte sans
    // les reporter comme anomalie.
    if (match.via === 'override') {
      matchedByOverride++
    }
    else if (match.via === 'siren') {
      matchedBySiren++
      report.push({ ...baseReport, probleme: 'Audit rattaché par SIREN', details: `SIRET audit ${siret} → entité « ${entity.name} » (SIRET base ${entity.siret})` })
    }
    else if (match.via === 'ecocert') {
      matchedByEcocert++
      report.push({ ...baseReport, probleme: 'Audit rattaché par ECOCERT_ID', details: `ECOCERT_ID ${ecocertId} → entité « ${entity.name} » (SIRET base ${entity.siret})` })
    }
    else if (match.via === 'nom') {
      matchedByName++
      report.push({ ...baseReport, probleme: 'Audit rattaché par nom', details: `SIRET audit "${row['SIRET'] ?? ''}" → entité « ${entity.name} » (SIRET base ${entity.siret})` })
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
  console.log(`✅ Créés                     : ${created}`)
  console.log(`   ↪ rattachés par override FEEF : ${matchedByOverride}`)
  console.log(`   ↪ rattachés par SIREN     : ${matchedBySiren}`)
  console.log(`   ↪ rattachés par ECOCERT_ID : ${matchedByEcocert}`)
  console.log(`   ↪ rattachés par nom       : ${matchedByName}`)
  console.log(`⏭️  SIRET manquant non résolu : ${skippedNoSiret}`)
  console.log(`⚠️  Entité introuvable        : ${skippedNotFound}`)
  console.log(`❌ Erreurs                   : ${errorCount}`)
  console.log('────────────────────────────────────────')

  writeReport(report, import.meta.dirname)

  // ──────────────────────────────────────────────────────────
  // Mise à jour de ecocertId et ecocertIds sur les entités
  //
  // Pour chaque entité rencontrée dans le CSV :
  //   - ecocertId : renseigné uniquement si un seul ID distinct (non ambigu)
  //   - ecocertIds : tous les IDs distincts, séparés par ", " (toujours écrit)
  // ──────────────────────────────────────────────────────────
  console.log('\n📋 Mise à jour des ecocertId(s) sur les entités...')

  let ecocertUpdated = 0
  let ecocertIdsUpdated = 0

  for (const { entity, byEcocert } of ecocertIdsByEntity.values()) {
    const allIds = [...byEcocert.keys()].sort().join(', ')
    const updateData: Record<string, unknown> = {
      ecocertIds: allIds,
      updatedBy: createdBy,
      updatedAt: new Date(),
    }

    if (byEcocert.size === 1) {
      const [ecocertId] = [...byEcocert.keys()]
      updateData.ecocertId = ecocertId
      ecocertUpdated++
    }

    await db
      .update(entities)
      .set(updateData as any)
      .where(eq(entities.id, entity.id))
    ecocertIdsUpdated++
  }

  console.log(`✅ ecocertId mis à jour (non ambigu) : ${ecocertUpdated}`)
  console.log(`✅ ecocertIds mis à jour             : ${ecocertIdsUpdated}`)

  // ──────────────────────────────────────────────────────────
  // Rapport des entités rattachées à plusieurs ECOCERT_ID.
  //
  // Permet de visualiser les écarts avec Ecocert : entités FEEF dont
  // plusieurs « dossiers » Ecocert (ECOCERT_ID) pointent vers elles.
  // Une ligne par couple (entité, ECOCERT_ID), pour faciliter le tri
  // et le filtrage côté Excel.
  // ──────────────────────────────────────────────────────────
  const duplicates = [...ecocertIdsByEntity.values()].filter(b => b.byEcocert.size > 1)
  console.log(`\n🚨 ${duplicates.length} entité(s) avec plusieurs ECOCERT_ID distincts`)

  if (duplicates.length > 0) {
    duplicates.sort((a, b) => a.entity.name.localeCompare(b.entity.name, 'fr'))

    /**
     * Catégorisation heuristique d'une entité ayant plusieurs ECOCERT_ID.
     * Priorité décroissante : un même cas peut cocher plusieurs cases,
     * on retient la plus actionnable.
     *
     *  1. « Doublon interne Ecocert » : deux ECOCERT_ID couvrent la même
     *     saison, donc deux dossiers ouverts simultanément côté Ecocert.
     *     C'est anormal et à remonter en priorité à Ecocert.
     *  2. « Multi-sites probables » : au moins un nom client mentionne
     *     « site ». Plusieurs établissements de la même personne morale
     *     audités séparément. Décision interne FEEF.
     *  3. « À investiguer » : tout le reste (bascule d'ID, rattachements
     *     fragiles par nom...). Revue manuelle au cas par cas.
     */
    function categorize(byEcocert: Map<string, EcocertStats>): string {
      const seasonCounts = new Map<string, number>()
      for (const stats of byEcocert.values()) {
        for (const season of stats.seasons) {
          seasonCounts.set(season, (seasonCounts.get(season) ?? 0) + 1)
        }
      }
      if ([...seasonCounts.values()].some(c => c > 1)) {
        return 'Doublon interne Ecocert'
      }
      for (const stats of byEcocert.values()) {
        for (const name of stats.clientNames) {
          if (/\bsite\b/i.test(name)) return 'Multi-sites probables'
        }
      }
      return 'À investiguer'
    }

    type DuplicateLine = {
      categorie: string
      nom_feef: string
      siret_feef: string
      ecocert_id_feef_db: string
      nb_ecocert_ids_distincts: number
      ecocert_id_ecocert: string
      nb_audits: number
      noms_client_ecocert: string
      saisons: string
      rattachement_via: string
      match_ecocert_id_feef: string
    }
    const lines: DuplicateLine[] = []

    for (const bucket of duplicates) {
      const { entity } = bucket
      const category = categorize(bucket.byEcocert)
      const ecocertIds = [...bucket.byEcocert.keys()].sort()
      for (const ecocertId of ecocertIds) {
        const stats = bucket.byEcocert.get(ecocertId)!
        lines.push({
          categorie: category,
          nom_feef: entity.name,
          siret_feef: entity.siret,
          ecocert_id_feef_db: entity.ecocertIdDb ?? '',
          nb_ecocert_ids_distincts: bucket.byEcocert.size,
          ecocert_id_ecocert: ecocertId,
          nb_audits: stats.count,
          noms_client_ecocert: [...stats.clientNames].join(' | '),
          saisons: [...stats.seasons].sort().join(', '),
          rattachement_via: [...stats.matchVias].join(', '),
          match_ecocert_id_feef: entity.ecocertIdDb === ecocertId ? 'Oui' : 'Non',
        })
      }
    }

    const date = new Date().toISOString().slice(0, 10)

    // CSV (machine-readable, à conserver dans le repo)
    const duplicatesCsvPath = resolve(import.meta.dirname, `rapport-ecocert-duplicates-${date}.csv`)
    const csv = Papa.unparse(lines, { delimiter: ';' })
    writeFileSync(duplicatesCsvPath, '﻿' + csv, 'utf-8') // BOM pour Excel
    console.log(`📄 Rapport doublons ECOCERT_ID (CSV)  : ${duplicatesCsvPath}`)

    // XLSX (format à transmettre à la FEEF, plus présentable)
    //
    // Contrairement au CSV, le xlsx pivote sur une ligne par entité FEEF :
    // les ECOCERT_IDs sont concaténés dans une seule cellule, et les
    // colonnes connexes (nom client, rattachement) sont alignées dans le
    // même ordre. Une colonne « Saisons en doublon » met en évidence les
    // années où plusieurs ECOCERT_IDs sont actifs simultanément, ce qui
    // signale les vrais cas problématiques côté Ecocert.
    type EntityRow = {
      categorie: string
      nom_feef: string
      siret_feef: string
      nb_ecocert_ids_distincts: number
      ecocert_ids: string
      noms_client_ecocert: string
      rattachement_via: string
      saisons_en_doublon: string
    }

    const entityRows: EntityRow[] = duplicates.map((bucket) => {
      const sortedIds = [...bucket.byEcocert.keys()].sort()
      const statsList = sortedIds.map(id => bucket.byEcocert.get(id)!)

      // Saisons couvertes par plusieurs ECOCERT_IDs au sein de la même
      // entité : c'est le marqueur d'un vrai doublon (deux dossiers
      // Ecocert ouverts en même temps), par opposition à une simple
      // bascule d'ID dans le temps.
      const seasonCounts = new Map<string, number>()
      for (const stats of statsList) {
        for (const s of stats.seasons) {
          seasonCounts.set(s, (seasonCounts.get(s) ?? 0) + 1)
        }
      }
      const overlappingSeasons = [...seasonCounts.entries()]
        .filter(([, c]) => c > 1)
        .map(([s]) => s)
        .sort()

      return {
        categorie: categorize(bucket.byEcocert),
        nom_feef: bucket.entity.name,
        siret_feef: bucket.entity.siret,
        nb_ecocert_ids_distincts: bucket.byEcocert.size,
        ecocert_ids: sortedIds.join(', '),
        // Noms client : un par ECOCERT_ID, dans le même ordre. Si un même
        // ECOCERT_ID a plusieurs variantes de nom, on les sépare par ' / '.
        noms_client_ecocert: statsList
          .map(s => [...s.clientNames].join(' / ') || '(sans nom)')
          .join(', '),
        // Rattachement via : aussi un par ECOCERT_ID, ordre identique.
        rattachement_via: statsList
          .map(s => [...s.matchVias].join('+'))
          .join(', '),
        saisons_en_doublon: overlappingSeasons.join(', '),
      }
    })

    const headers: { key: keyof EntityRow; label: string; width: number }[] = [
      { key: 'categorie', label: 'Catégorie', width: 26 },
      { key: 'nom_feef', label: 'Entité FEEF', width: 50 },
      { key: 'siret_feef', label: 'SIRET FEEF', width: 16 },
      { key: 'nb_ecocert_ids_distincts', label: 'Nb ECOCERT_ID distincts', width: 20 },
      { key: 'ecocert_ids', label: 'ECOCERT_IDs (Ecocert)', width: 32 },
      { key: 'noms_client_ecocert', label: 'Nom(s) client Ecocert', width: 70 },
      { key: 'rattachement_via', label: 'Rattaché via', width: 28 },
      { key: 'saisons_en_doublon', label: 'Saisons en doublon', width: 30 },
    ]

    const aoa: (string | number)[][] = [headers.map(h => h.label)]
    for (const r of entityRows) {
      aoa.push(headers.map(h => r[h.key]))
    }

    // Le package « xlsx » n'est qu'une devDependency : il est absent de
    // l'image de production (deps élaguées). On l'importe donc dynamiquement
    // et on dégrade proprement vers le seul CSV si l'export xlsx échoue.
    try {
      const xlsxModule = await import('xlsx')
      // Interop CJS/ESM : selon le loader, le module est sous .default ou à plat.
      const XLSX = ((xlsxModule as { default?: unknown }).default ?? xlsxModule) as typeof import('xlsx')

      const ws = XLSX.utils.aoa_to_sheet(aoa)
      ws['!cols'] = headers.map(h => ({ wch: h.width }))
      ws['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(headers.length - 1)}${aoa.length}` }
      ws['!views'] = [{ state: 'frozen', ySplit: 1 }]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Doublons ECOCERT_ID')

      const duplicatesXlsxPath = resolve(import.meta.dirname, `rapport-ecocert-duplicates-${date}.xlsx`)
      XLSX.writeFile(wb, duplicatesXlsxPath)
      console.log(`📄 Rapport doublons ECOCERT_ID (XLSX) : ${duplicatesXlsxPath}`)
      console.log(`   ${duplicates.length} entité(s), ${lines.length} ligne(s CSV) / ${entityRows.length} ligne(s XLSX)`)
    }
    catch {
      console.warn('⚠️  Rapport XLSX ignoré (package « xlsx » indisponible), le CSV équivalent a été produit.')
    }
  }

  await pool.end()
  console.log('🏁 Import terminé')
}

seedAudits().catch((error) => {
  console.error(error)
  process.exit(1)
})
