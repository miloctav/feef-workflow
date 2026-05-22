/**
 * Applique les corrections issues des rapports d'erreurs d'import
 * sur les CSV sources des seeds.
 *
 * Source : server/database/seeds/rapport-entities-2026-03-26.csv
 *          server/database/seeds/rapport-audits-2026-03-26.csv
 *
 * Cibles  : server/database/seeds/entities.csv
 *           server/database/seeds/dates-labellisation.csv
 *           server/database/seeds/audits-ecocert.csv
 *
 * Stratégie :
 *  - Passe 1 (entities.csv) : la colonne "bon siret" du rapport renseigne le
 *    SIRET manquant des lignes 137 et 138 du CSV source.
 *  - Passe 4 (pilotes) : génère pilotes-siret-overrides.csv (mapping
 *    crmId → siret) consommé par seed-entities.ts en fallback lorsque le
 *    CRM ID du pilote ne correspond à aucune entité.
 *  - Passe 5 (dates-labellisation.csv) : remplacer le SIRET source par le
 *    "bon siret" du rapport, quand celui-ci est renseigné.
 *  - Audits (audits-ecocert.csv) : remplacer le SIRET de la ligne indiquée
 *    par le "bon siret" quand celui-ci est renseigné.
 *  - Les lignes du rapport sans "bon siret" ne sont pas corrigées (cas qu'il
 *    appartient au scribe métier de résoudre ; le seed loguera l'erreur).
 */

import Papa from 'papaparse'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')
const SEEDS_DIR = resolve(PROJECT_ROOT, 'server', 'database', 'seeds')

// Les rapports corrigés sont à la racine du projet (issus de l'Excel
// retravaillé manuellement, avec les colonnes "bon siret" et apparentées).
const RAPPORT_ENTITIES = resolve(PROJECT_ROOT, 'rapport erreurs imports feef.xlsx - rapport-entities-2026-03-26.csv')
const RAPPORT_AUDITS = resolve(PROJECT_ROOT, 'rapport erreurs imports feef.xlsx - rapport-audits-2026-03-26.csv')

function readCsvAt<T>(filePath: string, header: boolean): T[] {
  const content = readFileSync(filePath, 'utf-8')
  const { data, errors } = Papa.parse<T>(content, {
    header,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h) => h.replace(/^﻿/, '').trim(),
  })
  if (errors.length > 0) {
    console.warn(`⚠️  ${errors.length} erreur(s) CSV dans ${filePath}`)
    errors.slice(0, 3).forEach((e) => console.warn(`   Ligne ${e.row}: ${e.message}`))
  }
  return data
}

function readSeedCsv<T>(filename: string): T[] {
  return readCsvAt<T>(resolve(SEEDS_DIR, filename), true)
}

function writeSeedCsv(filename: string, rows: unknown[], columns: string[]) {
  const csv = Papa.unparse(rows, { columns, newline: '\r\n' })
  writeFileSync(resolve(SEEDS_DIR, filename), csv, 'utf-8')
}

function normalizeSiret(raw: string): string {
  return (raw ?? '').replace(/[\s\n"]/g, '').trim()
}

// ============================================================
// 1. Lire les rapports d'erreurs
// ============================================================

type RapportEntitiesRow = {
  passe: string
  ligne: string
  siret: string
  'nom entreprise': string
  'Groupe de rattachement': string
  'siret rattachement': string
  'bon siret': string
  idecocert: string
  nom: string
  probleme: string
  details: string
}

type RapportAuditsRow = {
  ligne: string
  siret: string
  'bon siret': string
  'id ecocert': string
  nom: string
  saison: string
  type_audit: string
  statut_ecocert: string
  probleme: string
  details: string
}

const rapportEntities = readCsvAt<RapportEntitiesRow>(RAPPORT_ENTITIES, true)
const rapportAudits = readCsvAt<RapportAuditsRow>(RAPPORT_AUDITS, true)

console.log(`📋 Rapports lus : ${rapportEntities.length} ligne(s) entities, ${rapportAudits.length} ligne(s) audits\n`)

// ============================================================
// 2. Construire les mappings de correction
// ============================================================

// Passe 1 : numéro de ligne CSV → bon SIRET
const passe1Corrections = new Map<number, string>()
// Passe 5 : ancien SIRET normalisé → bon SIRET
const passe5Corrections = new Map<string, string>()

for (const row of rapportEntities) {
  const passe = (row.passe ?? '').trim()
  const bonSiret = normalizeSiret(row['bon siret'])
  if (!bonSiret) continue

  if (passe === 'Passe 1 - Entreprises') {
    const ligne = parseInt(row.ligne)
    if (!isNaN(ligne)) passe1Corrections.set(ligne, bonSiret)
  }
  else if (passe.startsWith('Passe 5')) {
    const ancienSiret = normalizeSiret(row.siret)
    if (ancienSiret) passe5Corrections.set(ancienSiret, bonSiret)
  }
}

// Audits : numéro de ligne → bon SIRET
const auditsCorrections = new Map<number, string>()
for (const row of rapportAudits) {
  const bonSiret = normalizeSiret(row['bon siret'])
  if (!bonSiret) continue
  const ligne = parseInt(row.ligne)
  if (!isNaN(ligne)) auditsCorrections.set(ligne, bonSiret)
}

console.log(`🔧 Corrections collectées :`)
console.log(`   - Passe 1 (entities) : ${passe1Corrections.size}`)
console.log(`   - Passe 5 (dates)    : ${passe5Corrections.size}`)
console.log(`   - Audits             : ${auditsCorrections.size}\n`)

// ============================================================
// 3. Corriger entities.csv (Passe 1)
// ============================================================

type EntityRow = Record<string, string>
const entitiesRows = readSeedCsv<EntityRow>('entities.csv')
const entitiesHeaders = Object.keys(entitiesRows[0] ?? {})

let entitiesCorrected = 0
for (const [ligne, bonSiret] of passe1Corrections) {
  // ligne 137 dans le rapport = ligne 137 du CSV (header en ligne 1)
  // → index 135 dans le tableau parsé (i = ligne - 2)
  const idx = ligne - 2
  const row = entitiesRows[idx]
  if (!row) {
    console.warn(`⚠️  entities.csv ligne ${ligne} introuvable`)
    continue
  }
  console.log(`  ✏️  entities.csv L${ligne} (${row['Raison sociale']}) : "${row['Siret']}" → "${bonSiret}"`)
  row['Siret'] = bonSiret
  entitiesCorrected++
}

writeSeedCsv('entities.csv', entitiesRows, entitiesHeaders)
console.log(`✅ entities.csv : ${entitiesCorrected} ligne(s) corrigée(s)\n`)

// ============================================================
// 4. Corriger dates-labellisation.csv (Passe 5)
// ============================================================

type DateRow = { SIRET: string; 'Date de labellisation': string }
const datesRows = readSeedCsv<DateRow>('dates-labellisation.csv')
const datesHeaders = Object.keys(datesRows[0] ?? {})

let datesCorrected = 0
const datesNotMatched: string[] = []
for (const [ancienSiret, bonSiret] of passe5Corrections) {
  // Le seed normalise via /[\s\n"]/g sur la lecture, donc on cherche
  // une cellule SIRET dont la valeur normalisée == ancienSiret.
  const matchIdx = datesRows.findIndex((r) => normalizeSiret(r.SIRET) === ancienSiret)
  if (matchIdx === -1) {
    datesNotMatched.push(ancienSiret)
    continue
  }
  const row = datesRows[matchIdx]
  console.log(`  ✏️  dates-labellisation.csv L${matchIdx + 2} : "${row.SIRET}" → "${bonSiret}"`)
  row.SIRET = bonSiret
  datesCorrected++
}

writeSeedCsv('dates-labellisation.csv', datesRows, datesHeaders)
console.log(`✅ dates-labellisation.csv : ${datesCorrected} ligne(s) corrigée(s)`)
if (datesNotMatched.length) {
  console.warn(`⚠️  ${datesNotMatched.length} SIRET du rapport non trouvé(s) dans dates-labellisation.csv :`)
  datesNotMatched.forEach((s) => console.warn(`     - ${s}`))
}
console.log()

// ============================================================
// 5. Corriger audits-ecocert.csv
// ============================================================

type AuditRow = Record<string, string>
const auditsRows = readSeedCsv<AuditRow>('audits-ecocert.csv')
const auditsHeaders = Object.keys(auditsRows[0] ?? {})

let auditsCorrectedCount = 0
for (const [ligne, bonSiret] of auditsCorrections) {
  const idx = ligne - 2
  const row = auditsRows[idx]
  if (!row) {
    console.warn(`⚠️  audits-ecocert.csv ligne ${ligne} introuvable`)
    continue
  }
  console.log(`  ✏️  audits-ecocert.csv L${ligne} (${row['CLIENT_NAME']}) : "${row['SIRET']}" → "${bonSiret}"`)
  row['SIRET'] = bonSiret
  auditsCorrectedCount++
}

writeSeedCsv('audits-ecocert.csv', auditsRows, auditsHeaders)
console.log(`✅ audits-ecocert.csv : ${auditsCorrectedCount} ligne(s) corrigée(s)\n`)

// ============================================================
// 6. Générer pilotes-siret-overrides.csv (Passe 4)
//
// Pour les pilotes dont le CRM ID d'entité est inconnu, on récupère le
// "bon siret" fourni dans le rapport et on l'expose au seed via un fichier
// de mapping (crmId → siret). Le seed s'en sert en fallback quand le
// lookup par CRM ID échoue en Passe 4.
// ============================================================

type PiloteOverride = { crmId: string; siret: string; nomPilote: string }
const piloteOverrides: PiloteOverride[] = []

for (const row of rapportEntities) {
  const passe = (row.passe ?? '').trim()
  if (passe !== 'Passe 4 - Pilotes') continue

  const bonSiret = normalizeSiret(row['bon siret'])
  // Ignorer les "bon siret" qui ne sont pas un SIRET valide (ex : texte
  // libre comme "erreur de cochage dans notre CRM").
  if (!bonSiret || !/^\d{9,14}$/.test(bonSiret)) continue

  // Extraire le CRM ID de l'entité depuis le champ details :
  //   "ID CRM entité : <uuid> — Pilote : ... — Email : ..."
  const match = (row.details ?? '').match(/ID CRM entit[ée]\s*:\s*([a-f0-9-]+)/i)
  if (!match) continue
  const crmId = match[1].trim()

  piloteOverrides.push({
    crmId,
    siret: bonSiret,
    nomPilote: (row.nom ?? '').trim(),
  })
}

const piloteOverridesCsv = Papa.unparse(piloteOverrides, {
  columns: ['crmId', 'siret', 'nomPilote'],
  newline: '\r\n',
})
writeFileSync(resolve(SEEDS_DIR, 'pilotes-siret-overrides.csv'), piloteOverridesCsv, 'utf-8')
console.log(`✅ pilotes-siret-overrides.csv : ${piloteOverrides.length} ligne(s) écrite(s)\n`)

console.log('🏁 Corrections appliquées')
