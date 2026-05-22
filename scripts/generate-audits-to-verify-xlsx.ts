/**
 * Génère un classeur Excel destiné à la FEEF, à partir du dernier
 * rapport-audits-<date>.csv, avec deux onglets :
 *
 *  1. « Rattachements à vérifier » , audits Ecocert rattachés à une
 *     entreprise par un critère autre que le SIRET exact (SIREN, ID
 *     Ecocert ou nom). Une ligne = une entreprise.
 *
 *  2. « Entreprises hors périmètre » , audits Ecocert dont l'entreprise
 *     n'existe nulle part dans le fichier des entités FEEF (ni listée,
 *     ni marquée sortante). Une ligne = une entreprise.
 *
 * Sortie : server/database/seeds/audits-rattachements-a-verifier.xlsx
 */

import Papa from 'papaparse'
import XLSX from 'xlsx-js-style'
import { readFileSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readCompletedXlsx, isUsableSiret } from '../server/database/seeds/read-completed-xlsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SEEDS_DIR = resolve(__dirname, '..', 'server', 'database', 'seeds')

// ============================================================
// 1. Lecture des sources
// ============================================================

function findLatestReport(prefix: string): string {
  const files = readdirSync(SEEDS_DIR)
    .filter((f) => f.startsWith(prefix) && f.endsWith('.csv'))
    .sort()
    .reverse()
  if (files.length === 0) throw new Error(`Aucun fichier ${prefix}*.csv dans ${SEEDS_DIR}`)
  return resolve(SEEDS_DIR, files[0])
}

type ReportRow = {
  ligne: string
  siret: string
  nom: string
  saison: string
  type_audit: string
  statut_ecocert: string
  probleme: string
  details: string
}

const reportPath = findLatestReport('rapport-audits-')
const reportRows = Papa.parse<ReportRow>(readFileSync(reportPath, 'utf-8').replace(/^﻿/, ''), {
  header: true,
  delimiter: ';',
  skipEmptyLines: true,
  transformHeader: (h) => h.trim(),
}).data

const auditsRows = Papa.parse<Record<string, string>>(
  readFileSync(resolve(SEEDS_DIR, 'audits-ecocert.csv'), 'utf-8'),
  { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() },
).data

function ecocertIdForLine(ligne: string): string {
  const idx = parseInt(ligne) - 2 // `ligne` = index CSV + 2 (en-tête + base 1)
  return (auditsRows[idx]?.['ECOCERT_ID'] ?? '').trim()
}

function normName(s: string): string {
  return (s ?? '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ').trim()
}

// Entités marquées sortantes / doublons dans le fichier FEEF : ce sont
// les entreprises que la FEEF a explicitement choisi d'exclure.
const { rows: xlsxRows } = readCompletedXlsx(SEEDS_DIR)
const redSiret = new Set<string>()
const redSiren = new Set<string>()
const redName = new Set<string>()
for (const r of xlsxRows) {
  if (r.status !== 'SKIP_RED' && r.status !== 'SKIP_DUPLICATE') continue
  if (isUsableSiret(r.siret)) {
    redSiret.add(r.siret)
    redSiren.add(r.siret.slice(0, 9))
  }
  if (r.name) redName.add(normName(r.name))
}

// ============================================================
// 2. Onglet 1 , rattachements non exacts, groupés par entreprise
// ============================================================

const METHOD_LABEL: Record<string, string> = {
  'Audit rattaché par SIREN': 'Même SIREN',
  'Audit rattaché par ECOCERT_ID': 'ID Ecocert',
  'Audit rattaché par nom': "Nom d'entreprise",
}
const METHOD_ORDER: Record<string, number> = {
  "Nom d'entreprise": 0,
  'Même SIREN': 1,
  'ID Ecocert': 2,
}

type MatchGroup = {
  methode: string
  entrepriseEcocert: string
  siretEcocert: string
  idsEcocert: Set<string>
  entrepriseFeef: string
  siretFeef: string
  sirenIdentique: string
  sirenDiffere: boolean
  saisons: Set<string>
  nbAudits: number
}

const matchGroups = new Map<string, MatchGroup>()

for (const r of reportRows) {
  const methode = METHOD_LABEL[r.probleme]
  if (!methode) continue

  const entiteMatch = r.details.match(/entité .(.+?). \(SIRET base (\d+)\)/)
  const entrepriseFeef = entiteMatch ? entiteMatch[1].trim() : ''
  const siretFeef = entiteMatch ? entiteMatch[2] : ''
  const siretEcocert = r.siret ?? ''
  const siretEcocertDigits = siretEcocert.replace(/\D/g, '')

  const key = `${siretEcocertDigits}|${(r.nom ?? '').trim().toUpperCase()}|${siretFeef}`
  let g = matchGroups.get(key)
  if (!g) {
    let sirenIdentique: string
    let sirenDiffere = false
    if (!siretEcocertDigits) {
      sirenIdentique = 'SIRET absent côté Ecocert'
    }
    else if (siretFeef && siretEcocertDigits.slice(0, 9) === siretFeef.slice(0, 9)) {
      sirenIdentique = 'Oui'
    }
    else {
      sirenIdentique = 'Non'
      sirenDiffere = true
    }
    g = {
      methode,
      entrepriseEcocert: (r.nom ?? '').trim(),
      siretEcocert,
      idsEcocert: new Set(),
      entrepriseFeef,
      siretFeef,
      sirenIdentique,
      sirenDiffere,
      saisons: new Set(),
      nbAudits: 0,
    }
    matchGroups.set(key, g)
  }
  g.nbAudits++
  if (r.saison?.trim()) g.saisons.add(r.saison.trim())
  const eco = ecocertIdForLine(r.ligne)
  if (eco) g.idsEcocert.add(eco)
}

const matchRows = [...matchGroups.values()].sort((a, b) => {
  const m = METHOD_ORDER[a.methode] - METHOD_ORDER[b.methode]
  if (m !== 0) return m
  if (a.sirenDiffere !== b.sirenDiffere) return a.sirenDiffere ? -1 : 1
  return a.entrepriseEcocert.localeCompare(b.entrepriseEcocert)
})

// ============================================================
// 3. Onglet 2 , audits non rattachés (hors entreprises sortantes)
// ============================================================

type OutGroup = {
  entrepriseEcocert: string
  siretEcocert: string
  idsEcocert: Set<string>
  saisons: Set<string>
  nbAudits: number
}

const outGroups = new Map<string, OutGroup>()

for (const r of reportRows) {
  if (r.probleme !== 'SIRET inconnu dans la base FEEF') continue
  const s = (r.siret ?? '').replace(/\D/g, '')
  // Entreprise marquée sortante par la FEEF (ligne rouge) ? → on l'écarte,
  // c'est une exclusion volontaire, pas un cas à examiner.
  if (s && redSiret.has(s)) continue
  if (s.length >= 9 && redSiren.has(s.slice(0, 9))) continue
  if (redName.has(normName(r.nom))) continue

  const key = `${s}|${(r.nom ?? '').trim().toUpperCase()}`
  let g = outGroups.get(key)
  if (!g) {
    g = {
      entrepriseEcocert: (r.nom ?? '').trim(),
      siretEcocert: r.siret ?? '',
      idsEcocert: new Set(),
      saisons: new Set(),
      nbAudits: 0,
    }
    outGroups.set(key, g)
  }
  g.nbAudits++
  if (r.saison?.trim()) g.saisons.add(r.saison.trim())
  const eco = ecocertIdForLine(r.ligne)
  if (eco) g.idsEcocert.add(eco)
}

const outRows = [...outGroups.values()].sort((a, b) =>
  a.entrepriseEcocert.localeCompare(b.entrepriseEcocert),
)

// ============================================================
// 4. Génération du classeur
// ============================================================

const STYLE_NOTE = {
  font: { italic: true, color: { rgb: '444444' } },
  alignment: { wrapText: true, vertical: 'center' },
}
const STYLE_HEADER = {
  fill: { fgColor: { rgb: '4F81BD' } },
  font: { bold: true, color: { rgb: 'FFFFFF' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
}
const STYLE_WARN = {
  fill: { fgColor: { rgb: 'FFE0B2' } },
  alignment: { vertical: 'top', wrapText: true },
}
const STYLE_ROW = {
  alignment: { vertical: 'top', wrapText: true },
}

/** Construit une feuille stylée : note + en-tête + lignes. */
function buildSheet(
  note: string,
  headers: string[],
  colWidths: number[],
  dataRows: { cells: (string | number)[]; warn: boolean }[],
) {
  const aoa: (string | number)[][] = [[note], [], headers]
  for (const r of dataRows) aoa.push(r.cells)

  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = colWidths.map((wch) => ({ wch }))
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }]
  ws['!rows'] = [{ hpt: 42 }]

  const noteAddr = XLSX.utils.encode_cell({ r: 0, c: 0 })
  if (ws[noteAddr]) ws[noteAddr].s = STYLE_NOTE

  for (let c = 0; c < headers.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 2, c })
    if (!ws[addr]) ws[addr] = { t: 's', v: '' }
    ws[addr].s = STYLE_HEADER
  }
  for (let i = 0; i < dataRows.length; i++) {
    const style = dataRows[i].warn ? STYLE_WARN : STYLE_ROW
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: 3 + i, c })
      if (!ws[addr]) ws[addr] = { t: 's', v: '' }
      ws[addr].s = style
    }
  }
  return ws
}

const wb = XLSX.utils.book_new()

// ── Onglet 1 ──
XLSX.utils.book_append_sheet(wb, buildSheet(
  'Rattachements d\'audits Ecocert faits par un critère autre que le SIRET exact. '
  + 'Une ligne = une entreprise (la décision est la même pour tous ses audits). '
  + 'Merci de compléter les deux dernières colonnes. Les lignes où le SIREN diffère '
  + '(surlignées) sont les plus à risque.',
  [
    'Méthode de rattachement', 'Entreprise (fichier Ecocert)', 'SIRET (fichier Ecocert)',
    'ID Ecocert', 'Entreprise rattachée (base FEEF)', 'SIRET (base FEEF)',
    'SIREN identique ?', "Nombre d'audits", 'Saisons concernées',
    'Validation FEEF (OK / KO)', 'Commentaire FEEF',
  ],
  [22, 34, 20, 16, 34, 20, 24, 14, 20, 22, 34],
  matchRows.map((r) => ({
    warn: r.sirenDiffere,
    cells: [
      r.methode, r.entrepriseEcocert, r.siretEcocert, [...r.idsEcocert].sort().join(', '),
      r.entrepriseFeef, r.siretFeef, r.sirenIdentique, r.nbAudits,
      [...r.saisons].sort().join(', '), '', '',
    ],
  })),
), 'Rattachements à vérifier')

// ── Onglet 2 ──
XLSX.utils.book_append_sheet(wb, buildSheet(
  'Audits Ecocert non rattachés à une entreprise, et qui ne correspondent pas '
  + 'à une entreprise sortante. Soit ces entreprises sont hors du périmètre FEEF, '
  + 'soit ce sont des établissements ou des variantes de nom d\'entreprises déjà '
  + 'connues. Merci d\'indiquer pour chacune si elle relève du périmètre FEEF, et '
  + 'le cas échéant à quelle entreprise / SIRET la rattacher.',
  [
    'Entreprise (fichier Ecocert)', 'SIRET (fichier Ecocert)', 'ID Ecocert',
    "Nombre d'audits", 'Saisons concernées', 'Dans le périmètre FEEF ? (Oui / Non)',
    'Si oui, rattacher à (entreprise / SIRET)', 'Commentaire FEEF',
  ],
  [34, 20, 16, 14, 20, 28, 36, 34],
  outRows.map((r) => ({
    warn: false,
    cells: [
      r.entrepriseEcocert, r.siretEcocert, [...r.idsEcocert].sort().join(', '),
      r.nbAudits, [...r.saisons].sort().join(', '), '', '', '',
    ],
  })),
), 'Audits non rattachés')

// ── Écriture (repli horodaté si le fichier est verrouillé) ──
let outPath = resolve(SEEDS_DIR, 'audits-rattachements-a-verifier.xlsx')
try {
  XLSX.writeFile(wb, outPath)
}
catch (e) {
  const err = e as NodeJS.ErrnoException
  if (err.code === 'EBUSY' || err.code === 'EPERM') {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    outPath = resolve(SEEDS_DIR, `audits-rattachements-a-verifier-${ts}.xlsx`)
    console.warn(`⚠️  Fichier original verrouillé (ouvert dans Excel ?). Écriture dans : ${outPath}`)
    XLSX.writeFile(wb, outPath)
  }
  else {
    throw e
  }
}

const nbAuditsHors = outRows.reduce((s, r) => s + r.nbAudits, 0)
console.log(`✅ Fichier généré : ${outPath}`)
console.log(`   Source : ${reportPath.split(/[\\/]/).pop()}`)
console.log(`   Onglet 1 , rattachements à vérifier : ${matchRows.length} entreprises`)
console.log(`   Onglet 2 , audits non rattachés     : ${outRows.length} entreprises (${nbAuditsHors} audits)`)
