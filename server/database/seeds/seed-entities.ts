import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import Papa from 'papaparse'
import { writeFileSync } from 'fs'
import { resolve } from 'path'
import { eq, sql } from 'drizzle-orm'
import { entities, accounts, oes, entityFieldVersions } from '../schema'
import { readCompletedXlsx, isUsableSiret, type CompletedXlsxRow } from './read-completed-xlsx'

// ============================================================
// Source unique : le fichier Excel « entités complétées » renvoyé par
// la FEEF (EM-entities-completed-<date>.xlsx). Voir read-completed-xlsx.ts
// pour le détail du format et du code couleur.
// ============================================================

// ============================================================
// Mapping région : libellé du fichier → valeur enum FrenchRegion
//
// Les clés sont normalisées (minuscules, sans accent, séparateurs
// uniformisés) pour absorber les variations d'écriture du fichier.
// ============================================================

function normalizeRegionKey(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // supprime les accents
    .replace(/[\s-]+/g, ' ')
    .trim()
}

const REGION_KEY_TO_ENUM: Record<string, string> = {
  'auvergne rhone alpes': 'AUVERGNE_RHONE_ALPES',
  'bourgogne franche comte': 'BOURGOGNE_FRANCHE_COMTE',
  'bretagne': 'BRETAGNE',
  'centre val de loire': 'CENTRE_VAL_DE_LOIRE',
  'corse': 'CORSE',
  'grand est': 'GRAND_EST',
  'hauts de france': 'HAUTS_DE_FRANCE',
  'ile de france': 'ILE_DE_FRANCE',
  'normandie': 'NORMANDIE',
  'nouvelle aquitaine': 'NOUVELLE_AQUITAINE',
  'occitanie': 'OCCITANIE',
  'pays de la loire': 'PAYS_DE_LA_LOIRE',
  "provence alpes cote d'azur": 'PROVENCE_ALPES_COTE_D_AZUR',
  'guadeloupe': 'GUADELOUPE',
  'guyane': 'GUYANE',
  'la reunion': 'LA_REUNION',
  'martinique': 'MARTINIQUE',
  'mayotte': 'MAYOTTE',
}

function parseRegion(raw: string): string | null {
  const trimmed = (raw ?? '').trim()
  if (!trimmed || trimmed.includes('#REF') || trimmed.includes('#ERROR')) return null
  return REGION_KEY_TO_ENUM[normalizeRegionKey(trimmed)] ?? null
}

// ============================================================
// Fonctions utilitaires
// ============================================================

/** Renvoie la valeur nettoyée, ou null si vide / inexploitable. */
function cleanText(raw: string): string | null {
  const t = (raw ?? '').trim()
  if (!t || t.includes('#REF') || t.includes('#ERROR')) return null
  return t
}

/**
 * Renvoie le CRM ID s'il s'agit d'un vrai UUID, sinon null.
 *
 * La colonne « ID » du fichier FEEF contient soit un UUID CRM, soit un
 * commentaire libre saisi à la main (« pas intégré dans CRM FEEF »,
 * « sortant », « doublon »...). Ces commentaires ne doivent surtout pas
 * être pris pour un crmId : la colonne crmId est UNIQUE en base, donc
 * plusieurs lignes partageant le même faux crmId s'écraseraient l'une
 * l'autre au lieu de créer des entités distinctes.
 */
function parseCrmId(raw: string): string | null {
  const t = (raw ?? '').trim()
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return UUID.test(t) ? t : null
}

/**
 * Génère un SIRET factice déterministe (14 caractères) à partir d'un
 * libellé : « FAKE » + hash du nom sur 10 chiffres. Utilisé pour les
 * entités mères créées de toutes pièces, qui n'ont pas de vrai SIRET.
 */
function fakeSiretFromName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (Math.imul(hash, 31) + name.charCodeAt(i)) | 0
  }
  return 'FAKE' + Math.abs(hash).toString().padStart(10, '0').slice(0, 10)
}

/**
 * Parse une date de labellisation. Le fichier mélange trois formats :
 *   - JJ/MM/AAAA          → date classique
 *   - nombre (ex 46080)   → numéro de série Excel
 *   - texte (ex « en cours labellisation ») → pas de date
 */
function parseLabelingDate(raw: string): { date: Date | null; ignoredText: boolean } {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return { date: null, ignoredText: false }

  // Numéro de série Excel (jours depuis le 30/12/1899)
  if (/^\d+$/.test(trimmed)) {
    const serial = parseInt(trimmed)
    const ms = Date.UTC(1899, 11, 30) + serial * 86400000
    const d = new Date(ms)
    return { date: isNaN(d.getTime()) ? null : d, ignoredText: false }
  }

  // Format JJ/MM/AAAA
  const parts = trimmed.split('/')
  if (parts.length === 3) {
    const d = parseInt(parts[0])
    const m = parseInt(parts[1]) - 1
    const y = parseInt(parts[2])
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
      const date = new Date(y, m, d)
      if (!isNaN(date.getTime())) return { date, ignoredText: false }
    }
  }

  // Texte non interprétable (ex : « en cours labellisation »)
  return { date: null, ignoredText: true }
}

// ============================================================
// Rapport
// ============================================================

type ReportLine = {
  passe: string
  ligne: number | string
  siret: string
  nom: string
  probleme: string
  details: string
}

function writeReport(lines: ReportLine[], dirPath: string) {
  if (lines.length === 0) {
    console.log('✅ Aucune anomalie à reporter.')
    return
  }
  const date = new Date().toISOString().slice(0, 10)
  const reportPath = resolve(dirPath, `rapport-entities-${date}.csv`)
  const csv = Papa.unparse(lines, { delimiter: ';' })
  writeFileSync(reportPath, '﻿' + csv, 'utf-8') // BOM pour Excel
  console.log(`\n📄 Rapport écrit : ${reportPath}`)
  console.log(`   ${lines.length} anomalie(s) détectée(s)`)
}

// ============================================================
// Script principal
// ============================================================

async function seedEntities() {
  const pool = new Pool({ connectionString: process.env.NUXT_DATABASE_URL })
  const db = drizzle(pool)

  console.log('🌱 Import des entreprises (source : xlsx FEEF)...\n')

  // Compte FEEF admin (pour createdBy / updatedBy)
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

  const report: ReportLine[] = []

  // ── Lecture du fichier source ──
  const { filePath, rows } = readCompletedXlsx(import.meta.dirname)
  console.log(`📄 Fichier source : ${filePath}`)
  console.log(`📋 ${rows.length} lignes lues\n`)

  // ──────────────────────────────────────────────────────────
  // PURGE — On vide les entités et toutes les données qui en
  // dépendent (audits, revues documentaires, contrats, événements...).
  //
  // On ne peut pas faire « TRUNCATE entities CASCADE » : la cascade
  // détruirait aussi la table accounts (accounts.current_entity_id
  // référence entities). On purge donc par DELETE ordonné, en cassant
  // d'abord les références (mise à NULL), ce qui préserve accounts,
  // oes et les données de référence (documents_type...).
  //
  // Garantit un seed déterministe et idempotent : tout est reconstruit
  // depuis le fichier xlsx à chaque exécution.
  // ──────────────────────────────────────────────────────────
  console.log('🧹 Purge des entités et données liées...')
  const purgeStatements = [
    // Cassure des références (y compris auto-références) avant suppression.
    'UPDATE accounts SET current_entity_id = NULL',
    'UPDATE entities SET parent_group_id = NULL',
    'UPDATE audits SET previous_audit_id = NULL',
    // Suppression des tables dépendantes, des plus dépendantes aux moins.
    'DELETE FROM notifications',
    'DELETE FROM document_versions',
    'DELETE FROM events',
    'DELETE FROM audit_notation',
    'DELETE FROM actions',
    'DELETE FROM audits',
    'DELETE FROM documentary_reviews',
    'DELETE FROM contracts',
    'DELETE FROM entity_field_versions',
    'DELETE FROM accounts_to_entities',
    'DELETE FROM entities',
  ]
  for (const statement of purgeStatements) {
    await db.execute(sql.raw(statement))
  }
  console.log('✅ Purge terminée\n')

  // ──────────────────────────────────────────────────────────
  // OE Ecocert — on récupère son id en base, ou on le crée s'il
  // manque. Le seed ne dépend plus d'un id codé en dur.
  // ──────────────────────────────────────────────────────────
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

  // Lignes à importer (création ou MAJ) : tout sauf les rouges et doublons.
  // On traite les entités déjà connues (bloc bas) AVANT les lignes
  // revues à la main par la FEEF (bloc haut) : ainsi, si une même entité
  // apparaît dans les deux blocs (cas « déjà présent, enrichi »), c'est
  // l'enrichissement FEEF qui est appliqué en dernier et l'emporte.
  const importableRows = rows
    .filter((r) => r.status !== 'SKIP_RED' && r.status !== 'SKIP_DUPLICATE')
    .sort((a, b) => (a.status === 'EXISTING' ? 0 : 1) - (b.status === 'EXISTING' ? 0 : 1))
  const skippedRows = rows.filter(
    (r) => r.status === 'SKIP_RED' || r.status === 'SKIP_DUPLICATE',
  )

  // ──────────────────────────────────────────────────────────
  // PASSE 1 — Créer / mettre à jour les entreprises (COMPANY)
  // ──────────────────────────────────────────────────────────
  console.log('📋 Passe 1 : import des entreprises...\n')

  let created = 0
  let updated = 0
  let skipped = 0

  for (const row of importableRows) {
    if (!isUsableSiret(row.siret)) {
      console.warn(`  [L${row.rowNum}] ⚠️  SIRET inexploitable : "${row.siretRaw}" → ${row.name} ignoré`)
      report.push({
        passe: 'Passe 1 - Entreprises',
        ligne: row.rowNum,
        siret: row.siretRaw,
        nom: row.name,
        probleme: 'SIRET invalide ou manquant',
        details: `Statut : ${row.status} | SIRET brut : "${row.siretRaw}" | ID CRM : ${row.crmId}`,
      })
      skipped++
      continue
    }
    if (!row.name) {
      console.warn(`  [L${row.rowNum}] ⚠️  Raison sociale vide → ignoré`)
      report.push({
        passe: 'Passe 1 - Entreprises',
        ligne: row.rowNum,
        siret: row.siret,
        nom: '',
        probleme: 'Raison sociale vide',
        details: `SIRET : ${row.siret} | ID CRM : ${row.crmId}`,
      })
      skipped++
      continue
    }

    const crmId = parseCrmId(row.crmId)
    const region = parseRegion(row.region)
    const address = cleanText(row.address)
    const postalCode = cleanText(row.postalCode)
    const city = cleanText(row.city)
    const phoneNumber = cleanText(row.phoneNumber)

    // Avertissement région non reconnue (on continue malgré tout)
    const rawRegion = row.region.trim()
    if (rawRegion && !rawRegion.includes('#REF') && !rawRegion.includes('#ERROR') && region === null) {
      report.push({
        passe: 'Passe 1 - Entreprises',
        ligne: row.rowNum,
        siret: row.siret,
        nom: row.name,
        probleme: 'Région non reconnue',
        details: `Région fichier : "${rawRegion}"`,
      })
    }

    try {
      // Recherche de l'entité existante : par SIRET, puis par CRM ID.
      let [existing] = await db
        .select()
        .from(entities)
        .where(eq(entities.siret, row.siret))
        .limit(1)

      if (!existing && crmId) {
        ;[existing] = await db
          .select()
          .from(entities)
          .where(eq(entities.crmId, crmId))
          .limit(1)
      }

      if (existing) {
        const siretChanged = existing.siret !== row.siret
        await db
          .update(entities)
          .set({
            name: row.name,
            siret: row.siret,
            oeId: ECOCERT_OE_ID,
            deletedAt: null, // une entité ré-importée n'est plus supprimée
            ...(crmId !== null ? { crmId } : {}),
            ...(region !== null ? { region } : {}),
            ...(address !== null ? { address } : {}),
            ...(postalCode !== null ? { postalCode } : {}),
            ...(city !== null ? { city } : {}),
            ...(phoneNumber !== null ? { phoneNumber } : {}),
            updatedBy: createdBy,
            updatedAt: new Date(),
          })
          .where(eq(entities.id, existing.id))

        updated++
        const siretInfo = siretChanged ? ` (siret ${existing.siret} → ${row.siret})` : ''
        console.log(`  [L${row.rowNum}] ✏️  MAJ : ${row.name}${siretInfo}`)
      }
      else {
        await db.insert(entities).values({
          name: row.name,
          siret: row.siret,
          type: 'COMPANY',
          mode: 'MASTER',
          oeId: ECOCERT_OE_ID,
          ...(crmId !== null ? { crmId } : {}),
          ...(region !== null ? { region } : {}),
          ...(address !== null ? { address } : {}),
          ...(postalCode !== null ? { postalCode } : {}),
          ...(city !== null ? { city } : {}),
          ...(phoneNumber !== null ? { phoneNumber } : {}),
          createdBy,
          updatedBy: createdBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        created++
        console.log(`  [L${row.rowNum}] ✅ Créé : ${row.name}`)
      }
    }
    catch (error) {
      const cause = (error as { cause?: unknown }).cause ?? error
      const pgError = cause as { message?: string; code?: string; detail?: string; constraint?: string }
      const details = [
        pgError.message,
        pgError.code ? `code=${pgError.code}` : null,
        pgError.detail,
        pgError.constraint ? `constraint=${pgError.constraint}` : null,
      ].filter(Boolean).join(' | ')
      console.error(`  [L${row.rowNum}] ❌ Erreur : ${details || error}`)
      report.push({
        passe: 'Passe 1 - Entreprises',
        ligne: row.rowNum,
        siret: row.siret,
        nom: row.name,
        probleme: 'Erreur technique lors de l\'insertion',
        details: details || String(error),
      })
      skipped++
    }
  }

  console.log('\n─── Passe 1 ───────────────────────────')
  console.log(`✅ Créées       : ${created}`)
  console.log(`✏️  Mises à jour : ${updated}`)
  console.log(`⏭️  Ignorées     : ${skipped}`)
  console.log('────────────────────────────────────────\n')

  // ──────────────────────────────────────────────────────────
  // PASSE 1bis — Désactiver les entités sortantes (lignes rouges)
  //
  // Les lignes rouges sont des entités sorties de la FEEF. On ne les
  // crée pas ; si elles existent déjà en base, on les soft-delete.
  // ──────────────────────────────────────────────────────────
  console.log('📋 Passe 1bis : entités sortantes (lignes rouges/doublons)...\n')

  let softDeleted = 0
  let skippedNotInDb = 0

  for (const row of skippedRows) {
    try {
      let existing = null
      if (isUsableSiret(row.siret)) {
        const [found] = await db
          .select()
          .from(entities)
          .where(eq(entities.siret, row.siret))
          .limit(1)
        existing = found ?? null
      }
      // CRM ID uniquement s'il s'agit d'un vrai UUID (les rouges ont
      // souvent un libellé « sortant » / « doublon » dans la colonne ID).
      const redCrmId = parseCrmId(row.crmId)
      if (!existing && redCrmId) {
        const [found] = await db
          .select()
          .from(entities)
          .where(eq(entities.crmId, redCrmId))
          .limit(1)
        existing = found ?? null
      }

      if (existing && !existing.deletedAt) {
        await db
          .update(entities)
          .set({ deletedAt: new Date(), updatedBy: createdBy, updatedAt: new Date() })
          .where(eq(entities.id, existing.id))
        softDeleted++
        console.log(`  [L${row.rowNum}] 🗑️  Désactivée : ${existing.name}`)
        report.push({
          passe: 'Passe 1bis - Sortantes',
          ligne: row.rowNum,
          siret: row.siret,
          nom: existing.name,
          probleme: row.status === 'SKIP_RED' ? 'Entité sortante (soft-delete)' : 'Doublon (soft-delete)',
          details: `Commentaire FEEF : ${row.comment}`,
        })
      }
      else {
        skippedNotInDb++
      }
    }
    catch (error) {
      console.error(`  [L${row.rowNum}] ❌ Erreur : ${error}`)
      report.push({
        passe: 'Passe 1bis - Sortantes',
        ligne: row.rowNum,
        siret: row.siret,
        nom: row.name,
        probleme: 'Erreur technique lors de la désactivation',
        details: String(error),
      })
    }
  }

  console.log('\n─── Passe 1bis ────────────────────────')
  console.log(`🗑️  Désactivées          : ${softDeleted}`)
  console.log(`⏭️  Absentes de la base   : ${skippedNotInDb}`)
  console.log('────────────────────────────────────────\n')

  // ──────────────────────────────────────────────────────────
  // PASSE 2 — Créer les entités mères (GROUP) manquantes
  //
  // Les parents sont référencés via les colonnes « Parent SIRET » /
  // « Parent raison sociale ». Un parent qui n'est pas déjà une entité
  // (ligne propre ou mère créée précédemment) est créé en GROUP.
  // ──────────────────────────────────────────────────────────
  console.log('📋 Passe 2 : création des entités mères (GROUP)...\n')

  /** Clé unique d'un parent : par SIRET si exploitable, sinon par nom. */
  function parentKey(siret: string, name: string): string | null {
    if (isUsableSiret(siret)) return 'S:' + siret
    if (name) return 'N:' + name.toUpperCase().replace(/\s+/g, ' ').trim()
    return null
  }

  // Parents distincts référencés par les lignes importables.
  const parentsByKey = new Map<string, { siret: string; name: string }>()
  for (const row of importableRows) {
    const key = parentKey(row.parentSiret, row.parentName)
    if (key && !parentsByKey.has(key)) {
      parentsByKey.set(key, { siret: row.parentSiret, name: row.parentName })
    }
  }

  // Clé parent → id de l'entité mère (pour la passe 3).
  const parentIdByKey = new Map<string, number>()
  let meresCreated = 0
  let meresExisting = 0

  for (const [key, parent] of parentsByKey) {
    try {
      if (!parent.name && !isUsableSiret(parent.siret)) {
        report.push({
          passe: 'Passe 2 - Entités mères',
          ligne: '',
          siret: parent.siret,
          nom: '',
          probleme: 'Parent sans raison sociale ni SIRET, impossible à créer',
          details: `Clé parent : ${key}`,
        })
        continue
      }

      // SIRET de la mère : son vrai SIRET, ou un SIRET factice
      // déterministe dérivé du nom.
      const siretToUse = isUsableSiret(parent.siret)
        ? parent.siret
        : fakeSiretFromName(parent.name)

      // Existence : on vérifie toujours par le SIRET qui sera utilisé
      // (vrai ou factice), pour que la passe reste idempotente.
      const [existing] = await db
        .select()
        .from(entities)
        .where(eq(entities.siret, siretToUse))
        .limit(1)

      if (existing) {
        parentIdByKey.set(key, existing.id)
        meresExisting++
        continue
      }

      if (!parent.name) {
        report.push({
          passe: 'Passe 2 - Entités mères',
          ligne: '',
          siret: parent.siret,
          nom: '',
          probleme: 'Parent sans raison sociale, impossible à créer',
          details: `Clé parent : ${key}`,
        })
        continue
      }

      const [inserted] = await db
        .insert(entities)
        .values({
          name: parent.name,
          siret: siretToUse,
          type: 'GROUP',
          mode: 'MASTER',
          oeId: ECOCERT_OE_ID,
          createdBy,
          updatedBy: createdBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: entities.id })

      parentIdByKey.set(key, inserted.id)
      meresCreated++
      console.log(`  ✅ Mère créée (GROUP) : ${parent.name} — SIRET: ${siretToUse}`)
    }
    catch (error) {
      console.error(`  ❌ Erreur mère "${parent.name}" : ${error}`)
      report.push({
        passe: 'Passe 2 - Entités mères',
        ligne: '',
        siret: parent.siret,
        nom: parent.name,
        probleme: 'Erreur technique lors de la création de l\'entité mère',
        details: String(error),
      })
    }
  }

  console.log('\n─── Passe 2 ───────────────────────────')
  console.log(`✅ Mères créées   : ${meresCreated}`)
  console.log(`✓  Déjà présentes : ${meresExisting}`)
  console.log('────────────────────────────────────────\n')

  // ── Index des entités en base (pour les passes 3 à 6) ──
  const allEntities = await db
    .select({ id: entities.id, siret: entities.siret, crmId: entities.crmId })
    .from(entities)
  const entityIdBySiret = new Map<string, number>()
  const entityIdByCrmId = new Map<string, number>()
  for (const e of allEntities) {
    if (e.siret) entityIdBySiret.set(e.siret, e.id)
    if (e.crmId) entityIdByCrmId.set(e.crmId, e.id)
  }

  /** Résout l'id d'entité d'une ligne : par SIRET puis par CRM ID. */
  function resolveEntityId(row: CompletedXlsxRow): number | null {
    if (isUsableSiret(row.siret) && entityIdBySiret.has(row.siret)) {
      return entityIdBySiret.get(row.siret)!
    }
    const crmId = parseCrmId(row.crmId)
    if (crmId && entityIdByCrmId.has(crmId)) {
      return entityIdByCrmId.get(crmId)!
    }
    return null
  }

  // ──────────────────────────────────────────────────────────
  // PASSE 3 — Établir les liens mère-fille
  // ──────────────────────────────────────────────────────────
  console.log('📋 Passe 3 : liens mère-fille...\n')

  let linked = 0
  let linkErrors = 0

  for (const row of importableRows) {
    const key = parentKey(row.parentSiret, row.parentName)
    if (!key) continue

    const filleId = resolveEntityId(row)
    if (!filleId) {
      report.push({
        passe: 'Passe 3 - Liens mère-fille',
        ligne: row.rowNum,
        siret: row.siret,
        nom: row.name,
        probleme: 'Entité fille introuvable en base',
        details: `SIRET : ${row.siret} | CRM ID : ${row.crmId}`,
      })
      linkErrors++
      continue
    }

    const mereId = parentIdByKey.get(key)
    if (!mereId) {
      report.push({
        passe: 'Passe 3 - Liens mère-fille',
        ligne: row.rowNum,
        siret: row.parentSiret,
        nom: row.parentName,
        probleme: 'Entité mère introuvable en base',
        details: `Fille : ${row.name} | Parent : ${row.parentName} (${row.parentSiret})`,
      })
      linkErrors++
      continue
    }

    if (mereId === filleId) {
      // Une entité ne peut pas être sa propre mère (ex : Parent SIRET = SIRET).
      report.push({
        passe: 'Passe 3 - Liens mère-fille',
        ligne: row.rowNum,
        siret: row.siret,
        nom: row.name,
        probleme: 'Auto-référencement parent ignoré',
        details: `Le SIRET parent est identique au SIRET de l'entité.`,
      })
      continue
    }

    try {
      // « Parent administratif » = Oui → la fille est suivie au niveau
      // du groupe (FOLLOWER), Non / vide → la fille reste autonome (MASTER).
      const isMotherMaster = row.parentAdmin.trim().toLowerCase() === 'oui'
      await db
        .update(entities)
        .set({
          parentGroupId: mereId,
          mode: isMotherMaster ? 'FOLLOWER' : 'MASTER',
          updatedBy: createdBy,
          updatedAt: new Date(),
        })
        .where(eq(entities.id, filleId))
      linked++
    }
    catch (error) {
      console.error(`  ❌ Erreur lien ${row.name} : ${error}`)
      report.push({
        passe: 'Passe 3 - Liens mère-fille',
        ligne: row.rowNum,
        siret: row.siret,
        nom: row.name,
        probleme: 'Erreur technique lors de la création du lien',
        details: String(error),
      })
      linkErrors++
    }
  }

  console.log('─── Passe 3 ───────────────────────────')
  console.log(`🔗 Liens créés : ${linked}`)
  console.log(`❌ Erreurs     : ${linkErrors}`)
  console.log('────────────────────────────────────────\n')

  // ──────────────────────────────────────────────────────────
  // PASSE 4 — Importer les pilotes de la démarche
  // ──────────────────────────────────────────────────────────
  console.log('📋 Passe 4 : import des pilotes de la démarche...\n')

  let pilotesLinked = 0
  let pilotesNotFound = 0

  for (const row of importableRows) {
    const fields: { fieldKey: string; value: string }[] = []
    if (row.pilotLastName) fields.push({ fieldKey: 'pilotLastName', value: row.pilotLastName })
    if (row.pilotFirstName) fields.push({ fieldKey: 'pilotFirstName', value: row.pilotFirstName })
    if (row.pilotEmail) fields.push({ fieldKey: 'pilotEmail', value: row.pilotEmail })
    if (row.pilotPhone) fields.push({ fieldKey: 'pilotPhone', value: row.pilotPhone })
    if (row.pilotRole) fields.push({ fieldKey: 'pilotRole', value: row.pilotRole })
    if (fields.length === 0) continue

    const entityId = resolveEntityId(row)
    if (!entityId) {
      report.push({
        passe: 'Passe 4 - Pilotes',
        ligne: row.rowNum,
        siret: row.siret,
        nom: `${row.pilotFirstName} ${row.pilotLastName}`.trim(),
        probleme: 'Entité introuvable pour ce pilote',
        details: `Entité : ${row.name} | SIRET : ${row.siret} | CRM ID : ${row.crmId}`,
      })
      pilotesNotFound++
      continue
    }

    try {
      for (const field of fields) {
        await db.insert(entityFieldVersions).values({
          entityId,
          fieldKey: field.fieldKey,
          valueString: field.value,
          valueNumber: null,
          valueBoolean: null,
          valueDate: null,
          createdBy,
          createdAt: new Date(),
        })
      }
      pilotesLinked++
    }
    catch (error) {
      console.error(`  ❌ Erreur pilote ${row.name} : ${error}`)
      report.push({
        passe: 'Passe 4 - Pilotes',
        ligne: row.rowNum,
        siret: row.siret,
        nom: `${row.pilotFirstName} ${row.pilotLastName}`.trim(),
        probleme: 'Erreur technique lors de l\'insertion du pilote',
        details: String(error),
      })
      pilotesNotFound++
    }
  }

  console.log('─── Passe 4 ───────────────────────────')
  console.log(`✅ Pilotes rattachés : ${pilotesLinked}`)
  console.log(`⚠️  Non trouvés      : ${pilotesNotFound}`)
  console.log('────────────────────────────────────────\n')

  // ──────────────────────────────────────────────────────────
  // PASSE 5 — Importer les dates de première labellisation
  // ──────────────────────────────────────────────────────────
  console.log('📋 Passe 5 : dates de première labellisation...\n')

  let datesLinked = 0
  let datesSkipped = 0

  for (const row of importableRows) {
    if (!row.labelingDate.trim()) continue

    const { date, ignoredText } = parseLabelingDate(row.labelingDate)
    if (!date) {
      if (ignoredText) {
        // Texte du type « en cours labellisation » : non bloquant.
        report.push({
          passe: 'Passe 5 - Dates de labellisation',
          ligne: row.rowNum,
          siret: row.siret,
          nom: row.name,
          probleme: 'Date de labellisation non interprétable',
          details: `Valeur fichier : "${row.labelingDate}"`,
        })
        datesSkipped++
      }
      continue
    }

    const entityId = resolveEntityId(row)
    if (!entityId) {
      report.push({
        passe: 'Passe 5 - Dates de labellisation',
        ligne: row.rowNum,
        siret: row.siret,
        nom: row.name,
        probleme: 'Entité introuvable pour cette date',
        details: `SIRET : ${row.siret} | Date : ${date.toLocaleDateString('fr-FR')}`,
      })
      datesSkipped++
      continue
    }

    try {
      await db.insert(entityFieldVersions).values({
        entityId,
        fieldKey: 'firstLabelingDate',
        valueString: null,
        valueNumber: null,
        valueBoolean: null,
        valueDate: date,
        createdBy,
        createdAt: new Date(),
      })
      datesLinked++
    }
    catch (error) {
      console.error(`  ❌ Erreur date ${row.name} : ${error}`)
      report.push({
        passe: 'Passe 5 - Dates de labellisation',
        ligne: row.rowNum,
        siret: row.siret,
        nom: row.name,
        probleme: 'Erreur technique lors de l\'insertion de la date',
        details: String(error),
      })
      datesSkipped++
    }
  }

  console.log('─── Passe 5 ───────────────────────────')
  console.log(`✅ Dates insérées : ${datesLinked}`)
  console.log(`⚠️  Ignorées      : ${datesSkipped}`)
  console.log('────────────────────────────────────────\n')

  // ──────────────────────────────────────────────────────────
  // PASSE 6 — Importer l'ID Ecocert des entités
  // ──────────────────────────────────────────────────────────
  console.log('📋 Passe 6 : ID Ecocert des entités...\n')

  let ecocertLinked = 0
  let ecocertNotFound = 0

  for (const row of importableRows) {
    if (!row.ecocertId.trim()) continue

    const entityId = resolveEntityId(row)
    if (!entityId) {
      ecocertNotFound++
      continue
    }

    try {
      await db
        .update(entities)
        .set({ ecocertId: row.ecocertId.trim(), updatedBy: createdBy, updatedAt: new Date() })
        .where(eq(entities.id, entityId))
      ecocertLinked++
    }
    catch (error) {
      console.error(`  ❌ Erreur ID Ecocert ${row.name} : ${error}`)
      report.push({
        passe: 'Passe 6 - ID Ecocert',
        ligne: row.rowNum,
        siret: row.siret,
        nom: row.name,
        probleme: 'Erreur technique lors de la mise à jour de l\'ID Ecocert',
        details: String(error),
      })
    }
  }

  console.log('─── Passe 6 ───────────────────────────')
  console.log(`✅ ID Ecocert insérés : ${ecocertLinked}`)
  console.log(`⚠️  Non trouvés       : ${ecocertNotFound}`)
  console.log('────────────────────────────────────────\n')

  writeReport(report, import.meta.dirname)

  await pool.end()
  console.log('🏁 Import terminé')
}

seedEntities().catch((error) => {
  console.error(error)
  process.exit(1)
})
