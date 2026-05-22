/**
 * Lecture du fichier Excel « entités complétées » renvoyé par la FEEF.
 *
 * Ce fichier (EM-entities-completed-<date>.xlsx) est désormais la source
 * unique du seed des entités. Il contient deux blocs :
 *   - bloc HAUT  : les entités « à compléter », colorisées par la FEEF
 *   - bloc BAS   : les entités déjà connues, non colorisées
 * séparés par une ligne entièrement vide.
 *
 * Code couleur appliqué par la FEEF sur le bloc haut :
 *   - police verte  (FF00B050) = complétion / ajout FEEF
 *   - police rouge  (FFFF0000) = entité sortante, à ne pas importer
 *   - police orange (FFFFC000) = doublon, à ne pas importer
 *   - fond vert     (thème 6)  = entité finalement déjà présente, enrichie
 *   - fond orange   (FFFFC000) = entité absente du CRM FEEF, à intégrer
 *
 * On décompresse le xlsx avec fflate (dépendance pure-JS, présente en prod)
 * et on parse le XML brut : c'est le seul moyen fiable de lire les styles
 * de cellule, les librairies xlsx ne sont pas embarquées en production.
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { resolve } from 'path'
import { unzipSync, strFromU8 } from 'fflate'

// ============================================================
// Types
// ============================================================

/**
 * Statut d'une ligne, déduit du code couleur (bloc haut) ou de la
 * position (bloc bas).
 */
export type RowStatus =
  | 'NORMAL' // bloc haut, à créer normalement
  | 'ABSENT_CRM' // bloc haut, fond orange : absente du CRM, à créer
  | 'ALREADY_PRESENT' // bloc haut, fond vert : déjà présente, à enrichir
  | 'SKIP_RED' // bloc haut, police rouge : sortante, à ne pas importer
  | 'SKIP_DUPLICATE' // bloc haut, police orange : doublon, à ne pas importer
  | 'EXISTING' // bloc bas : entité déjà connue

export type CompletedXlsxRow = {
  /** Numéro de ligne dans la feuille (pour les rapports d'anomalie). */
  rowNum: number
  status: RowStatus
  crmId: string
  name: string
  /** SIRET normalisé : chiffres uniquement, complété à 14 si 13 chiffres. */
  siret: string
  /** SIRET tel quel dans le fichier (pour les rapports). */
  siretRaw: string
  address: string
  postalCode: string
  city: string
  phoneNumber: string
  region: string
  /** Date de labellisation brute (format hétérogène, voir seed-entities). */
  labelingDate: string
  ecocertId: string
  /** SIRET du parent normalisé. */
  parentSiret: string
  parentName: string
  /** « Oui » si la fille est suivie au niveau groupe (FOLLOWER), sinon « Non ». */
  parentAdmin: string
  pilotFirstName: string
  pilotLastName: string
  pilotEmail: string
  pilotPhone: string
  pilotRole: string
  comment: string
}

// ============================================================
// Normalisation SIRET
// ============================================================

/**
 * Normalise un SIRET : ne garde que les chiffres et complète à 14
 * caractères les SIRET à 13 chiffres (zéro de tête perdu par Excel).
 */
export function normalizeSiret(raw: string): string {
  const digits = (raw ?? '').replace(/\D/g, '')
  if (digits.length === 13) return digits.padStart(14, '0')
  return digits
}

/** Un SIRET est exploitable s'il comporte 9 à 14 chiffres. */
export function isUsableSiret(siret: string): boolean {
  return /^\d{9,14}$/.test(siret)
}

// ============================================================
// Sélection du fichier le plus récent
// ============================================================

/**
 * Renvoie le chemin du fichier EM-entities-completed-*.xlsx le plus
 * récemment modifié dans le dossier des seeds.
 */
export function findLatestCompletedXlsx(seedsDir: string): string {
  const candidates = readdirSync(seedsDir)
    .filter((f) => /^EM-entities-completed-.*\.xlsx$/i.test(f))
    .map((f) => {
      const full = resolve(seedsDir, f)
      return { full, mtime: statSync(full).mtimeMs }
    })
    .sort((a, b) => b.mtime - a.mtime)

  if (candidates.length === 0) {
    throw new Error(
      `Aucun fichier EM-entities-completed-*.xlsx trouvé dans ${seedsDir}`,
    )
  }
  return candidates[0].full
}

// ============================================================
// Parsing du xlsx
// ============================================================

// Ordre des 19 colonnes de la feuille (cf. generate-entities-to-complete-xlsx).
const COLUMN_COUNT = 19

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function colIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/)![0]
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

type CellColor = { font: 'green' | 'red' | 'orange' | 'none'; fill: 'green' | 'orange' | 'none' }

/**
 * Construit la table d'index de style → couleur de police / fond, à
 * partir de styles.xml.
 */
function parseStyles(stylesXml: string): CellColor[] {
  // fonts : index → couleur de police
  const fontsBlock = stylesXml.match(/<fonts[^>]*>([\s\S]*?)<\/fonts>/)?.[1] ?? ''
  const fontColor: CellColor['font'][] = []
  for (const m of fontsBlock.matchAll(/<font>([\s\S]*?)<\/font>/g)) {
    const rgb = m[1].match(/<color rgb="([0-9A-Fa-f]+)"/)?.[1]?.toUpperCase() ?? ''
    if (rgb === 'FF00B050') fontColor.push('green')
    else if (rgb === 'FFFF0000') fontColor.push('red')
    else if (rgb === 'FFFFC000') fontColor.push('orange')
    else fontColor.push('none')
  }

  // fills : index → couleur de fond / surlignage
  const fillsBlock = stylesXml.match(/<fills[^>]*>([\s\S]*?)<\/fills>/)?.[1] ?? ''
  const fillColor: CellColor['fill'][] = []
  for (const m of fillsBlock.matchAll(/<fill>([\s\S]*?)<\/fill>/g)) {
    const fgRgb = m[1].match(/<fgColor rgb="([0-9A-Fa-f]+)"/)?.[1]?.toUpperCase() ?? ''
    const fgTheme = m[1].match(/<fgColor theme="(\d+)"/)?.[1]
    if (fgRgb === 'FFFFC000') fillColor.push('orange')
    else if (fgTheme === '6') fillColor.push('green') // accent3 = surlignage vert clair
    else fillColor.push('none')
  }

  // cellXfs : index de style → { fontId, fillId } → couleurs résolues
  const xfsBlock = stylesXml.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] ?? ''
  const styles: CellColor[] = []
  for (const m of xfsBlock.matchAll(/<xf\b[^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g)) {
    const fontId = parseInt(m[0].match(/fontId="(\d+)"/)?.[1] ?? '0')
    const fillId = parseInt(m[0].match(/fillId="(\d+)"/)?.[1] ?? '0')
    styles.push({
      font: fontColor[fontId] ?? 'none',
      fill: fillColor[fillId] ?? 'none',
    })
  }
  return styles
}

/** Extrait les chaînes partagées (sharedStrings.xml). */
function parseSharedStrings(sharedXml: string): string[] {
  const out: string[] = []
  for (const m of sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    const parts = [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1])
    out.push(decodeXmlEntities(parts.join('')))
  }
  return out
}

/**
 * Lit le fichier xlsx complété et renvoie les lignes typées, statut
 * couleur inclus.
 */
export function readCompletedXlsx(seedsDir: string): {
  filePath: string
  rows: CompletedXlsxRow[]
} {
  const filePath = findLatestCompletedXlsx(seedsDir)
  const zip = unzipSync(readFileSync(filePath))

  const stylesXml = strFromU8(zip['xl/styles.xml'])
  const sheetXml = strFromU8(zip['xl/worksheets/sheet1.xml'])
  const sharedXml = strFromU8(zip['xl/sharedStrings.xml'])

  const styles = parseStyles(stylesXml)
  const sharedStrings = parseSharedStrings(sharedXml)

  // ── Extraction brute des cellules : valeur + couleur ──
  type RawCell = { value: string; color: CellColor }
  type RawRow = { rowNum: number; cells: RawCell[] }
  const rawRows: RawRow[] = []

  for (const rm of sheetXml.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowNum = parseInt(rm[1])
    const cells: RawCell[] = Array.from({ length: COLUMN_COUNT }, () => ({
      value: '',
      color: { font: 'none', fill: 'none' } as CellColor,
    }))
    const cellRe = /<c r="([A-Z]+\d+)"(?:\s+s="(\d+)")?(?:\s+t="(\w+)")?\s*(?:\/>|>([\s\S]*?)<\/c>)/g
    for (const cm of rm[2].matchAll(cellRe)) {
      const col = colIndex(cm[1])
      if (col < 0 || col >= COLUMN_COUNT) continue
      const styleIdx = cm[2] ? parseInt(cm[2]) : 0
      const isString = cm[3] === 's'
      const rawValue = cm[4]?.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? ''
      const value = isString
        ? (sharedStrings[parseInt(rawValue)] ?? '')
        : decodeXmlEntities(rawValue)
      cells[col] = {
        value,
        color: styles[styleIdx] ?? { font: 'none', fill: 'none' },
      }
    }
    rawRows.push({ rowNum, cells })
  }

  // Première ligne = en-têtes, on la retire.
  const dataRows = rawRows.slice(1)

  // ── Détection du séparateur (première ligne entièrement vide) ──
  let separatorIdx = dataRows.findIndex((r) => r.cells.every((c) => c.value.trim() === ''))
  if (separatorIdx < 0) separatorIdx = dataRows.length

  // ── Classification couleur d'une ligne du bloc haut ──
  function classifyTopRow(r: RawRow): RowStatus {
    const hasRedFont = r.cells.some((c) => c.color.font === 'red')
    if (hasRedFont) return 'SKIP_RED'
    const hasOrangeFont = r.cells.some((c) => c.color.font === 'orange')
    if (hasOrangeFont) return 'SKIP_DUPLICATE'
    const hasGreenFill = r.cells.some((c) => c.color.fill === 'green')
    if (hasGreenFill) return 'ALREADY_PRESENT'
    const hasOrangeFill = r.cells.some((c) => c.color.fill === 'orange')
    if (hasOrangeFill) return 'ABSENT_CRM'
    return 'NORMAL'
  }

  // ── Construction des lignes typées ──
  const rows: CompletedXlsxRow[] = []
  for (let i = 0; i < dataRows.length; i++) {
    if (i === separatorIdx) continue // ligne vide séparatrice
    const raw = dataRows[i]
    const v = (col: number) => raw.cells[col]?.value.trim() ?? ''
    const status: RowStatus = i < separatorIdx ? classifyTopRow(raw) : 'EXISTING'

    rows.push({
      rowNum: raw.rowNum,
      status,
      crmId: v(0),
      name: v(1),
      siret: normalizeSiret(v(2)),
      siretRaw: v(2),
      address: v(3),
      postalCode: v(4),
      city: v(5),
      phoneNumber: v(6),
      region: v(7),
      labelingDate: v(8),
      ecocertId: v(9),
      parentSiret: normalizeSiret(v(10)),
      parentName: v(11),
      parentAdmin: v(12),
      pilotFirstName: v(13),
      pilotLastName: v(14),
      pilotEmail: v(15),
      pilotPhone: v(16),
      pilotRole: v(17),
      comment: v(18),
    })
  }

  return { filePath, rows }
}
