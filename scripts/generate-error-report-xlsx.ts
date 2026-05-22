/**
 * Génère un fichier Excel (.xlsx) avec 4 onglets résumant les anomalies
 * d'import, à partir des derniers rapports CSV du dossier seeds.
 *
 * Sortie : server/database/seeds/erreurs-import-<date>.xlsx
 *
 * Onglets :
 *  1. Pilotes orphelins      (depuis rapport-entities)
 *  2. Dates labellisation    (depuis rapport-entities)
 *  3. Audits SIRET inconnu   (depuis rapport-audits)
 *  4. Audits sans SIRET      (depuis rapport-audits)
 */

import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { readFileSync, readdirSync } from 'fs'
import { resolve, dirname, basename } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SEEDS_DIR = resolve(__dirname, '..', 'server', 'database', 'seeds')

function findLatestReport(prefix: string): string {
  const files = readdirSync(SEEDS_DIR)
    .filter((f) => f.startsWith(prefix) && f.endsWith('.csv'))
    .sort()
    .reverse()
  if (files.length === 0) {
    throw new Error(`Aucun fichier ${prefix}*.csv trouvé dans ${SEEDS_DIR}`)
  }
  return resolve(SEEDS_DIR, files[0])
}

function parseCsv<T>(path: string): T[] {
  const content = readFileSync(path, 'utf-8')
  const { data } = Papa.parse<T>(content, {
    header: true,
    delimiter: ';',
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })
  return data
}

function extractDetail(details: string, key: string): string {
  const re = new RegExp(`${key}\\s*:\\s*([^—]+?)(?:\\s*—|$)`)
  const m = details.match(re)
  return m ? m[1].trim() : ''
}

// ============================================================
// 1. Lecture des rapports
// ============================================================

const entitiesPath = findLatestReport('rapport-entities-')
const auditsPath = findLatestReport('rapport-audits-')

console.log(`📋 Rapport entities : ${basename(entitiesPath)}`)
console.log(`📋 Rapport audits   : ${basename(auditsPath)}\n`)

type EntityRow = {
  passe: string
  ligne: string
  siret: string
  nom: string
  probleme: string
  details: string
}
type AuditRow = {
  ligne: string
  siret: string
  nom: string
  saison: string
  type_audit: string
  statut_ecocert: string
  probleme: string
  details: string
}

const entitiesRows = parseCsv<EntityRow>(entitiesPath)
const auditsRows = parseCsv<AuditRow>(auditsPath)

// ============================================================
// 2. Onglet 1 — Pilotes orphelins
// ============================================================

const sheet1 = entitiesRows
  .filter((r) => r.passe === 'Passe 4 - Pilotes')
  .map((r) => ({
    'Nom du pilote': r.nom,
    'Email pilote': extractDetail(r.details, 'Email'),
    'CRM ID entité (inconnu)': extractDetail(r.details, 'ID CRM entité'),
    'Problème': r.probleme,
  }))

// ============================================================
// 3. Onglet 2 — Dates labellisation
// ============================================================

const sheet2 = entitiesRows
  .filter((r) => r.passe === 'Passe 5 - Dates de labellisation')
  .map((r) => ({
    'SIRET': r.siret,
    'Date de labellisation': extractDetail(r.details, 'Date de labellisation'),
    'Problème': r.probleme,
  }))

// ============================================================
// 4. Onglet 3 — Audits SIRET inconnu (groupés par entreprise)
// ============================================================

const auditsSiretInconnu = auditsRows.filter((r) => r.probleme === 'SIRET inconnu dans la base FEEF')

// Dédoublonner par SIRET + nom (un SIRET = une entreprise) et compter audits
const sheet3Map = new Map<string, {
  siret: string
  nom: string
  idEcocert: string
  audits: number
  saisons: Set<string>
  typesAudits: Set<string>
}>()
for (const r of auditsSiretInconnu) {
  const key = `${r.siret}|${r.nom}`
  if (!sheet3Map.has(key)) {
    sheet3Map.set(key, {
      siret: r.siret,
      nom: r.nom,
      idEcocert: extractDetail(r.details, 'ID Ecocert'),
      audits: 0,
      saisons: new Set(),
      typesAudits: new Set(),
    })
  }
  const e = sheet3Map.get(key)!
  e.audits++
  if (r.saison) e.saisons.add(r.saison)
  if (r.type_audit) e.typesAudits.add(r.type_audit)
}

const sheet3 = Array.from(sheet3Map.values())
  .sort((a, b) => b.audits - a.audits || a.nom.localeCompare(b.nom))
  .map((e) => ({
    'Nom entreprise': e.nom,
    'SIRET': e.siret,
    'ID Ecocert': e.idEcocert,
    'Nombre d\'audits': e.audits,
    'Saisons concernées': Array.from(e.saisons).sort().join(', '),
    'Types d\'audits': Array.from(e.typesAudits).sort().join(', '),
  }))

// ============================================================
// 5. Onglet 4 — Audits sans SIRET (groupés par entreprise)
// ============================================================

const auditsSansSiret = auditsRows.filter((r) => r.probleme === 'SIRET manquant')

const sheet4Map = new Map<string, {
  nom: string
  audits: number
  saisons: Set<string>
  typesAudits: Set<string>
}>()
for (const r of auditsSansSiret) {
  const key = r.nom
  if (!sheet4Map.has(key)) {
    sheet4Map.set(key, { nom: r.nom, audits: 0, saisons: new Set(), typesAudits: new Set() })
  }
  const e = sheet4Map.get(key)!
  e.audits++
  if (r.saison) e.saisons.add(r.saison)
  if (r.type_audit) e.typesAudits.add(r.type_audit)
}

const sheet4 = Array.from(sheet4Map.values())
  .sort((a, b) => b.audits - a.audits || a.nom.localeCompare(b.nom))
  .map((e) => ({
    'Nom entreprise': e.nom,
    'SIRET à compléter': '',
    'Nombre d\'audits': e.audits,
    'Saisons concernées': Array.from(e.saisons).sort().join(', '),
    'Types d\'audits': Array.from(e.typesAudits).sort().join(', '),
  }))

// ============================================================
// 6. Création du fichier Excel
// ============================================================

const workbook = XLSX.utils.book_new()

type SheetIntro = {
  title: string
  source: string
  problem: string
  action: string
}

function addSheet(name: string, intro: SheetIntro, data: unknown[]) {
  // Bloc d'introduction (4 lignes texte + 1 ligne vide)
  const introRows: string[][] = [
    [intro.title],
    [`Source : ${intro.source}`],
    [`Erreur : ${intro.problem}`],
    [`Action : ${intro.action}`],
    [],
  ]

  const ws = XLSX.utils.aoa_to_sheet(introRows)

  // Ajouter les données en dessous (headers + lignes) à partir de la ligne 6
  if (data.length > 0) {
    XLSX.utils.sheet_add_json(ws, data, { origin: 'A6' })

    const headers = Object.keys(data[0] as object)
    ws['!cols'] = headers.map((h) => {
      const maxLen = Math.max(
        h.length,
        ...data.map((row) => String((row as Record<string, unknown>)[h] ?? '').length),
      )
      return { wch: Math.min(maxLen + 2, 60) }
    })

    // Fusionner les cellules du bloc d'introduction sur la largeur du tableau
    // pour qu'on lise les phrases entières sans tronquer.
    const lastCol = XLSX.utils.encode_col(headers.length - 1)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: headers.length - 1 } },
    ]
    // Marque pour ne pas trigger d'avertissement lint sur lastCol inutilisé.
    void lastCol
  }

  XLSX.utils.book_append_sheet(workbook, ws, name)
}

addSheet(
  '1. Pilotes orphelins',
  {
    title: 'Pilotes orphelins (CRM ID entité inconnu)',
    source: 'Données FEEF — fichier pilotes.csv issu de l\'export CRM',
    problem: 'Le pilote est rattaché à un CRM ID d\'entité qui n\'existe pas dans entities.csv. Ces entreprises ont probablement quitté FEEF, ou il s\'agit d\'erreurs de cochage côté CRM.',
    action: 'Vérifier dans le CRM le rattachement de ces pilotes et corriger/supprimer le cochage. Régénérer ensuite pilotes.csv.',
  },
  sheet1,
)

addSheet(
  '2. Dates labellisation',
  {
    title: 'Dates de première labellisation sur SIRET inconnu',
    source: 'Données FEEF — fichier dates-labellisation.csv',
    problem: 'Le SIRET fourni avec la date de labellisation ne correspond à aucune entreprise dans entities.csv. Trois sous-cas : (1) un AUTRE établissement du même SIREN est en base, (2) l\'entreprise est totalement absente, (3) l\'entreprise est dans un groupe parent non importé.',
    action: 'Au cas par cas : soit modifier dates-labellisation.csv pour pointer vers le bon établissement déjà en base, soit ajouter l\'entreprise dans l\'export CRM (entities.csv).',
  },
  sheet2,
)

addSheet(
  '3. Audits SIRET inconnu',
  {
    title: 'Audits Ecocert portant sur une entreprise absente du périmètre FEEF',
    source: 'Données Ecocert — fichier audits-ecocert.csv (croisé avec entities.csv FEEF)',
    problem: 'Le SIRET de l\'audit est valide mais aucune entreprise correspondante n\'est dans entities.csv. Ecocert audite un périmètre plus large que celui couvert par l\'export CRM FEEF.',
    action: 'Ajouter ces entreprises dans l\'export CRM FEEF (entities.csv) avec leurs informations (SIRET, raison sociale, adresse, groupe parent éventuel). Une fois faites, leurs audits seront importés automatiquement.',
  },
  sheet3,
)

addSheet(
  '4. Audits sans SIRET',
  {
    title: 'Audits Ecocert dont le SIRET est manquant dans le CSV',
    source: 'Données Ecocert — fichier audits-ecocert.csv',
    problem: 'La colonne SIRET est vide pour ces audits dans le fichier fourni par Ecocert. Sans SIRET, impossible de rattacher l\'audit à une entreprise en base.',
    action: 'Compléter la colonne SIRET côté Ecocert pour ces entreprises (à partir de l\'INSEE/Sirene). Si l\'entreprise est ensuite absente d\'entities.csv, elle basculera dans l\'onglet 3.',
  },
  sheet4,
)

const date = new Date().toISOString().slice(0, 10)
const outPath = resolve(SEEDS_DIR, `erreurs-import-${date}.xlsx`)
XLSX.writeFile(workbook, outPath)

console.log('✅ Fichier Excel généré :')
console.log(`   ${outPath}\n`)
console.log('Récapitulatif :')
console.log(`  Onglet 1 - Pilotes orphelins      : ${sheet1.length} lignes`)
console.log(`  Onglet 2 - Dates labellisation    : ${sheet2.length} lignes`)
console.log(`  Onglet 3 - Audits SIRET inconnu   : ${sheet3.length} entreprises (${auditsSiretInconnu.length} audits)`)
console.log(`  Onglet 4 - Audits sans SIRET      : ${sheet4.length} entreprises (${auditsSansSiret.length} audits)`)
