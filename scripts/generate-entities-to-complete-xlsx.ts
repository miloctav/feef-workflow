/**
 * Génère un fichier Excel "entités à compléter" destiné à la FEEF.
 *
 * Objectif : un document unique qui contient :
 *  - Toutes les entreprises actuellement présentes dans entities.csv
 *  - Les entreprises VRAIMENT manquantes (aucun établissement du même
 *    SIREN n'est en base), avec SIRET + raison sociale + CRM ID pré-remplis
 *    quand on les connaît, et une colonne "Commentaire" qui résume la
 *    source de l'erreur et les infos contextuelles (groupe parent, ID
 *    Ecocert, nom du pilote, etc.).
 *
 * Matching par SIREN (les 9 premiers chiffres du SIRET) : deux SIRET avec
 * le même SIREN = même personne morale = même entreprise pour la FEEF, on
 * ne crée donc pas de ligne "à compléter" dans ce cas.
 *
 * La FEEF complète les colonnes manquantes (adresse, ville, CP, téléphone,
 * région, ID CRM) sur les lignes du bas. La colonne "Commentaire" n'est
 * pas à reporter dans entities.csv (à filtrer lors de la conversion CSV
 * pour ré-import).
 *
 * Sortie : server/database/seeds/entites-a-completer-<date>.xlsx
 */

import 'dotenv/config'
import Papa from 'papaparse'
import XLSX from 'xlsx-js-style'
import { Pool } from 'pg'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')
const SEEDS_DIR = resolve(PROJECT_ROOT, 'server', 'database', 'seeds')

// Rapports manuellement corrigés à la racine (avec colonne "bon siret")
const RAPPORT_ENTITIES_CORRIGE = resolve(PROJECT_ROOT, 'rapport erreurs imports feef.xlsx - rapport-entities-2026-03-26.csv')
const RAPPORT_AUDITS_CORRIGE = resolve(PROJECT_ROOT, 'rapport erreurs imports feef.xlsx - rapport-audits-2026-03-26.csv')

// ============================================================
// Utilitaires
// ============================================================

function readCsv<T>(filePath: string): T[] {
  const content = readFileSync(filePath, 'utf-8')
  const { data } = Papa.parse<T>(content, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h) => h.replace(/^﻿/, '').trim(),
  })
  return data
}

function normalizeSiret(raw: string): string {
  return (raw ?? '').replace(/[\s\n"]/g, '').trim()
}

function siretToSiren(siret: string): string {
  const clean = normalizeSiret(siret)
  // Le SIREN, ce sont les 9 premiers chiffres significatifs. Les SIRET
  // français sont normalement 14 chiffres, mais on a aussi des cas
  // tronqués (9 chiffres) ou avec zéro de tête manquant. On prend les
  // 9 premiers caractères après normalisation.
  return clean.slice(0, 9)
}

// ============================================================
// 1. Lire entities.csv (référence)
// ============================================================

type EntityRow = {
  ID: string
  'Raison sociale': string
  Siret: string
  billing_address_street: string
  billing_address_postalcode: string
  billing_address_city: string
  phone_office: string
  Région: string
}

const ENTITIES_HEADERS: (keyof EntityRow)[] = [
  'ID',
  'Raison sociale',
  'Siret',
  'billing_address_street',
  'billing_address_postalcode',
  'billing_address_city',
  'phone_office',
  'Région',
]

const entitiesRows = readCsv<EntityRow>(resolve(SEEDS_DIR, 'entities.csv'))
console.log(`📋 entities.csv : ${entitiesRows.length} entreprise(s) existante(s)`)

// Index SIRET et SIREN
const siretToEntity = new Map<string, EntityRow>()
const sirenToSirets = new Map<string, string[]>()
for (const row of entitiesRows) {
  const siret = normalizeSiret(row.Siret)
  if (!siret || siret.length < 9) continue
  siretToEntity.set(siret, row)
  const siren = siretToSiren(siret)
  if (!sirenToSirets.has(siren)) sirenToSirets.set(siren, [])
  sirenToSirets.get(siren)!.push(siret)
}

// ============================================================
// 1bis. Charger les ID Ecocert depuis la DB (résultat du seed Passe 6)
// ============================================================

const pool = new Pool({ connectionString: process.env.NUXT_DATABASE_URL })
const ecocertBySiret = new Map<string, string>()
try {
  const result = await pool.query<{ siret: string; ecocert_id: string }>(
    "SELECT siret, ecocert_id FROM entities WHERE deleted_at IS NULL AND ecocert_id IS NOT NULL AND ecocert_id <> ''",
  )
  for (const row of result.rows) {
    const siret = normalizeSiret(row.siret)
    if (siret && row.ecocert_id) ecocertBySiret.set(siret, row.ecocert_id)
  }
  console.log(`📋 ID Ecocert chargés depuis la DB : ${ecocertBySiret.size}`)
}
finally {
  await pool.end()
}

// ============================================================
// 1ter. Charger les liens mère-fille depuis mere_fille.csv
// ============================================================

type MereFilleRow = {
  id_fille: string
  siret_fille: string
  id_mere: string
  name_mere: string
  siret_mere: string
}

const mereFilleContent = readFileSync(resolve(SEEDS_DIR, 'mere_fille.csv'), 'utf-8')
// Le fichier commence par "# id_fille,..." — on supprime le "# " du header
const mereFilleCleaned = mereFilleContent.replace(/^# /, '')
const { data: mereFilleRows } = Papa.parse<MereFilleRow>(mereFilleCleaned, {
  header: true,
  skipEmptyLines: true,
  dynamicTyping: false,
  transformHeader: (h) => h.trim(),
})

// Map SIRET fille → { siret_mere, name_mere, isMotherMaster }
// `isMotherMaster` (csv `is_mother_master`) = 1 si la fille est suivie au
// niveau du groupe (FOLLOWER), 0 si la fille reste autonome (MASTER).
type ParentInfo = { siret: string; nom: string; isMotherMaster: boolean }
const parentBySiret = new Map<string, ParentInfo>()
for (const row of mereFilleRows) {
  const siretFille = normalizeSiret(row.siret_fille)
  if (!siretFille) continue
  const siretMere = normalizeSiret(row.siret_mere)
  const nameMere = (row.name_mere ?? '').trim()
  if (!siretMere && !nameMere) continue
  const isMotherMaster = ((row as Record<string, string>).is_mother_master ?? '').trim() === '1'
  parentBySiret.set(siretFille, { siret: siretMere, nom: nameMere, isMotherMaster })
}
console.log(`📋 Liens mère-fille chargés : ${parentBySiret.size}`)

// ============================================================
// 1quater. Charger les pilotes depuis pilotes.csv
//
// On indexe par CRM ID d'entité (colonne ID_E) en gardant uniquement le
// premier pilote rencontré — cohérent avec ce que fait le seed.
// ============================================================

type PiloteCsvRow = {
  ID_E: string
  'Civilité': string
  'Prénom': string
  'Nom de Famille': string
  'Adresse Email': string
  'Tél Mobile': string
  'Téléphone': string
  'Fonction': string
}

type PiloteInfo = {
  prenom: string
  nom: string
  email: string
  telephone: string
  fonction: string
}
const piloteByCrmId = new Map<string, PiloteInfo>()
const pilotesCsvContent = readFileSync(resolve(SEEDS_DIR, 'pilotes.csv'), 'utf-8')
const { data: pilotesCsvRows } = Papa.parse<PiloteCsvRow>(pilotesCsvContent, {
  header: true,
  skipEmptyLines: true,
  dynamicTyping: false,
  transformHeader: (h) => h.trim(),
})
for (const row of pilotesCsvRows) {
  const crmId = (row.ID_E ?? '').trim()
  if (!crmId || piloteByCrmId.has(crmId)) continue // 1er pilote uniquement
  const prenom = (row['Prénom'] ?? '').trim()
  const nom = (row['Nom de Famille'] ?? '').trim()
  const email = (row['Adresse Email'] ?? '').trim()
  const mobile = (row['Tél Mobile'] ?? '').trim()
  const fixe = (row['Téléphone'] ?? '').trim()
  const telephone = mobile || fixe
  const fonction = (row['Fonction'] ?? '').trim()
  if (!prenom && !nom && !email && !telephone && !fonction) continue
  piloteByCrmId.set(crmId, { prenom, nom, email, telephone, fonction })
}
console.log(`📋 Pilotes chargés (1 par entité)        : ${piloteByCrmId.size}`)

// ============================================================
// 1quinquies. Charger les dates de première labellisation
//
// Source : dates-labellisation.csv. Indexé par SIRET, on garde la date
// la plus ancienne si plusieurs lignes pour un même SIRET (cohérent
// avec ce que fait le seed Passe 5).
// ============================================================

type DateLabelRow = { SIRET: string; 'Date de labellisation': string }
const datesCsvContent = readFileSync(resolve(SEEDS_DIR, 'dates-labellisation.csv'), 'utf-8')
const { data: datesCsvRows } = Papa.parse<DateLabelRow>(datesCsvContent, {
  header: true,
  skipEmptyLines: true,
  dynamicTyping: false,
  transformHeader: (h) => h.trim(),
})

function parseFrDate(raw: string): Date | null {
  const trimmed = (raw ?? '').trim()
  const parts = trimmed.split('/')
  if (parts.length !== 3) return null
  const d = parseInt(parts[0])
  const m = parseInt(parts[1]) - 1
  const y = parseInt(parts[2])
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null
  return new Date(y, m, d)
}

function formatFrDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

const dateLabelBySiret = new Map<string, string>() // SIRET → DD/MM/YYYY
for (const row of datesCsvRows) {
  const siret = normalizeSiret(row.SIRET)
  if (!siret || siret.length < 9) continue
  const parsed = parseFrDate(row['Date de labellisation'])
  if (!parsed) continue
  const existing = dateLabelBySiret.get(siret)
  if (!existing) {
    dateLabelBySiret.set(siret, formatFrDate(parsed))
  }
  else {
    const existingParsed = parseFrDate(existing)
    if (existingParsed && parsed < existingParsed) {
      dateLabelBySiret.set(siret, formatFrDate(parsed))
    }
  }
}
console.log(`📋 Dates de labellisation chargées       : ${dateLabelBySiret.size}\n`)

// ============================================================
// 2. Collecter les entités manquantes
//
// Règle : on ajoute une entité dans "à compléter" UNIQUEMENT si aucun
// établissement du même SIREN (9 premiers chiffres) n'est déjà dans
// entities.csv. Deux SIRET avec le même SIREN = même personne morale,
// considérée comme la même entreprise — pas besoin de nouvelle ligne.
// ============================================================

// Types d'erreur ordonnés (utilisés pour le tri et l'attribution de
// couleur). Les 3 premiers sont des manques côté FEEF (entities.csv), le
// 4e est un manque côté Ecocert (CSV des audits).
type ErrorType = 'pilote' | 'date' | 'audit-siret-inconnu' | 'audit-sans-siret'

const ERROR_TYPE_ORDER: Record<ErrorType, number> = {
  'pilote': 0,
  'date': 1,
  'audit-siret-inconnu': 2,
  'audit-sans-siret': 3,
}

const ERROR_TYPE_LABEL: Record<ErrorType, string> = {
  'pilote': 'Pilote orphelin',
  'date': 'Date de labellisation orpheline',
  'audit-siret-inconnu': 'Audit SIRET inconnu',
  'audit-sans-siret': 'Audit sans SIRET (côté Ecocert)',
}

type MissingEntity = {
  siret: string // peut être vide pour les "audits sans SIRET"
  raisonSociale: string
  crmId: string
  dateLabellisation: string // DD/MM/YYYY si connue
  idEcocert: string
  parentSiret: string
  parentNom: string
  notes: string[]
  errorType: ErrorType // type prioritaire (1ère source rencontrée)
}

// Entités à compléter qui ont un SIRET connu (indexées par SIRET)
const missingBySiret = new Map<string, MissingEntity>()
// Entités à compléter sans SIRET (audits sans SIRET côté Ecocert),
// indexées par nom normalisé
const missingByNom = new Map<string, MissingEntity>()

function normalizeNom(raw: string): string {
  return (raw ?? '').replace(/\s+/g, ' ').trim().toUpperCase()
}

function addMissing(args: {
  siret: string
  errorType: ErrorType
  raisonSociale?: string
  crmId?: string
  dateLabellisation?: string
  idEcocert?: string
  parentSiret?: string
  parentNom?: string
  note?: string
}) {
  const normalized = normalizeSiret(args.siret)
  if (!normalized || normalized.length < 9) return

  // Skip si un établissement du même SIREN est déjà en base
  // (même personne morale → on considère l'entreprise déjà couverte).
  const siren = siretToSiren(normalized)
  if (sirenToSirets.has(siren)) return

  let entry = missingBySiret.get(normalized)
  if (!entry) {
    entry = {
      siret: normalized,
      raisonSociale: '',
      crmId: '',
      dateLabellisation: '',
      idEcocert: '',
      parentSiret: '',
      parentNom: '',
      notes: [],
      errorType: args.errorType, // premier type rencontré gagne
    }
    missingBySiret.set(normalized, entry)
  }
  if (!entry.raisonSociale && args.raisonSociale?.trim()) {
    entry.raisonSociale = args.raisonSociale.trim()
  }
  if (!entry.crmId && args.crmId?.trim()) {
    entry.crmId = args.crmId.trim()
  }
  if (!entry.dateLabellisation && args.dateLabellisation?.trim()) {
    entry.dateLabellisation = args.dateLabellisation.trim()
  }
  if (!entry.idEcocert && args.idEcocert?.trim()) {
    entry.idEcocert = args.idEcocert.trim()
  }
  if (!entry.parentSiret && args.parentSiret?.trim()) {
    entry.parentSiret = normalizeSiret(args.parentSiret)
  }
  if (!entry.parentNom && args.parentNom?.trim()) {
    entry.parentNom = args.parentNom.trim()
  }
  if (args.note?.trim()) entry.notes.push(args.note.trim())
}

function addMissingSansSiret(args: {
  raisonSociale: string
  idEcocert?: string
  note?: string
}) {
  const nom = args.raisonSociale?.trim()
  if (!nom) return
  const key = normalizeNom(nom)

  let entry = missingByNom.get(key)
  if (!entry) {
    entry = {
      siret: '',
      raisonSociale: nom,
      crmId: '',
      dateLabellisation: '',
      idEcocert: '',
      parentSiret: '',
      parentNom: '',
      notes: [],
      errorType: 'audit-sans-siret',
    }
    missingByNom.set(key, entry)
  }
  if (!entry.idEcocert && args.idEcocert?.trim()) {
    entry.idEcocert = args.idEcocert.trim()
  }
  if (args.note?.trim()) entry.notes.push(args.note.trim())
}

// ─── Source 1 : pilotes orphelins via pilotes-siret-overrides.csv ───
const piloteOverridesPath = resolve(SEEDS_DIR, 'pilotes-siret-overrides.csv')
if (existsSync(piloteOverridesPath)) {
  type Override = { crmId: string; siret: string; nomPilote: string }
  const overrides = readCsv<Override>(piloteOverridesPath)
  for (const o of overrides) {
    addMissing({
      siret: o.siret,
      errorType: 'pilote',
      crmId: o.crmId,
      note: `Pilote orphelin : ${o.nomPilote}`,
    })
  }
  console.log(`📋 pilotes-siret-overrides.csv : ${overrides.length} override(s)`)
}

// ─── Source 2 : rapport entities corrigé (Passe 5 — dates) ───
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

const rapportEntitiesCorrige = readCsv<RapportEntitiesRow>(RAPPORT_ENTITIES_CORRIGE)
for (const row of rapportEntitiesCorrige) {
  const passe = (row.passe ?? '').trim()
  if (!passe.startsWith('Passe 5')) continue
  const bonSiret = normalizeSiret(row['bon siret'])
  if (!bonSiret) continue
  const nom = (row['nom entreprise'] ?? '').trim()
  const parentNom = (row['Groupe de rattachement'] ?? '').trim()
  const parentSiret = normalizeSiret(row['siret rattachement'])
  const idEcocert = (row.idecocert ?? '').trim()
  // Extraire la date de labellisation depuis le champ details
  const dateMatch = (row.details ?? '').match(/Date de labellisation\s*:\s*(\S+)/)
  const dateLabel = dateMatch ? dateMatch[1] : ''
  const note = 'Date de labellisation orpheline (SIRET inconnu en base FEEF)'
  addMissing({
    siret: bonSiret,
    errorType: 'date',
    raisonSociale: nom,
    dateLabellisation: dateLabel,
    idEcocert,
    parentSiret,
    parentNom,
    note,
  })
}

// ─── Source 3 : rapport audits corrigé (SIRET inconnu côté FEEF) ───
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

const rapportAuditsCorrige = readCsv<RapportAuditsRow>(RAPPORT_AUDITS_CORRIGE)
const auditsBySiret = new Map<string, { saisons: Set<string>; idEcocert: string; nom: string }>()
for (const row of rapportAuditsCorrige) {
  if ((row.probleme ?? '').trim() !== 'SIRET inconnu dans la base FEEF') continue
  const siret = normalizeSiret(row['bon siret']) || normalizeSiret(row.siret)
  if (!siret) continue
  const nom = (row.nom ?? '').trim()
  const saison = (row.saison ?? '').trim()
  // Extraire ID Ecocert depuis details si pas dans la colonne
  let idEcocert = (row['id ecocert'] ?? '').trim()
  if (!idEcocert) {
    const m = (row.details ?? '').match(/ID Ecocert\s*:\s*(\S+)/)
    if (m) idEcocert = m[1]
  }
  let entry = auditsBySiret.get(siret)
  if (!entry) {
    entry = { saisons: new Set(), idEcocert: '', nom: '' }
    auditsBySiret.set(siret, entry)
  }
  if (saison) entry.saisons.add(saison)
  if (idEcocert && !entry.idEcocert) entry.idEcocert = idEcocert
  if (nom && !entry.nom) entry.nom = nom
}

for (const [siret, info] of auditsBySiret) {
  const n = info.saisons.size
  const saisonsList = [...info.saisons].sort().join(', ')
  const note = `Audit Ecocert (${n} audit${n > 1 ? 's' : ''} sur ${n} saison${n > 1 ? 's' : ''}: ${saisonsList})`
  addMissing({
    siret,
    errorType: 'audit-siret-inconnu',
    raisonSociale: info.nom,
    idEcocert: info.idEcocert,
    note,
  })
}

// ─── Source 4 : audits sans SIRET (côté Ecocert) ───
// Regroupés par nom d'entreprise (cas où le SIRET est manquant dans le CSV
// Ecocert). On comptabilise nombre d'audits et saisons pour le commentaire.
const sansSiretByNom = new Map<string, { saisons: Set<string>; idEcocert: string; nom: string }>()
for (const row of rapportAuditsCorrige) {
  if ((row.probleme ?? '').trim() !== 'SIRET manquant') continue
  const nom = (row.nom ?? '').trim()
  if (!nom) continue
  const key = normalizeNom(nom)
  const saison = (row.saison ?? '').trim()
  let idEcocert = (row['id ecocert'] ?? '').trim()
  if (!idEcocert) {
    const m = (row.details ?? '').match(/ID Ecocert\s*:\s*(\S+)/)
    if (m) idEcocert = m[1]
  }
  let entry = sansSiretByNom.get(key)
  if (!entry) {
    entry = { saisons: new Set(), idEcocert: '', nom: '' }
    sansSiretByNom.set(key, entry)
  }
  if (saison) entry.saisons.add(saison)
  if (idEcocert && !entry.idEcocert) entry.idEcocert = idEcocert
  if (nom && !entry.nom) entry.nom = nom
}

for (const info of sansSiretByNom.values()) {
  const n = info.saisons.size
  const saisonsList = [...info.saisons].sort().join(', ')
  const note = n > 0
    ? `SIRET non fourni par Ecocert (${n} audit${n > 1 ? 's' : ''} sur ${n} saison${n > 1 ? 's' : ''}: ${saisonsList})`
    : 'SIRET non fourni par Ecocert'
  addMissingSansSiret({
    raisonSociale: info.nom,
    idEcocert: info.idEcocert,
    note,
  })
}

console.log(`📋 Entités manquantes avec SIRET (filtrées par SIREN absent) : ${missingBySiret.size}`)
console.log(`📋 Entités manquantes sans SIRET (côté Ecocert)               : ${missingByNom.size}\n`)

// ============================================================
// 3. Construire le tableau Excel
// ============================================================

// Bloc À COMPLÉTER : union des deux maps (avec et sans SIRET), trié par
// type d'erreur (pilote → date → audit-siret-inconnu → audit-sans-siret)
// puis alphabétiquement par raison sociale.
const aCompleter = [...missingBySiret.values(), ...missingByNom.values()].sort((a, b) => {
  const typeDiff = ERROR_TYPE_ORDER[a.errorType] - ERROR_TYPE_ORDER[b.errorType]
  if (typeDiff !== 0) return typeDiff
  const an = a.raisonSociale || 'zzz'
  const bn = b.raisonSociale || 'zzz'
  return an.localeCompare(bn)
})

// Bloc EXISTANTES : entités déjà en base, triées alpha par raison sociale
const existantes = [...entitiesRows].sort((a, b) =>
  (a['Raison sociale'] ?? '').localeCompare(b['Raison sociale'] ?? ''),
)

// Colonnes : 8 colonnes d'entities.csv + 3 colonnes enrichies modifiables
// (ID Ecocert, Parent SIRET, Parent raison sociale) + 3 colonnes pilote
// modifiables (nom complet, email, téléphone) + 1 colonne "Commentaire"
// en lecture seule.
const EXTRA_HEADERS = [
  'Date de labellisation',
  'ID Ecocert',
  'Parent SIRET',
  'Parent raison sociale',
  'Parent administratif',
  'Pilote prénom',
  'Pilote nom',
  'Pilote email',
  'Pilote téléphone',
  'Pilote fonction',
  'Commentaire',
]
const ALL_HEADERS = [...ENTITIES_HEADERS, ...EXTRA_HEADERS]

// Lignes du tableau (aoa = array of arrays)
const aoa: string[][] = []
aoa.push(ALL_HEADERS as string[])

// ─── Bloc 1 : Lignes à compléter (en haut, triées par type d'erreur) ───
const FIRST_COMPLETE_ROW_INDEX = aoa.length
for (const m of aCompleter) {
  // Pour les pilotes orphelins, on a le crmId → on peut récupérer les
  // infos pilote depuis pilotes.csv. Sinon les 3 colonnes restent vides.
  const pilote = m.crmId ? piloteByCrmId.get(m.crmId) : undefined
  aoa.push([
    m.crmId, // ID
    m.raisonSociale, // Raison sociale
    m.siret, // Siret (peut être vide pour audit-sans-siret)
    '', // billing_address_street
    '', // billing_address_postalcode
    '', // billing_address_city
    '', // phone_office
    '', // Région
    m.dateLabellisation, // Date de labellisation
    m.idEcocert, // ID Ecocert
    m.parentSiret, // Parent SIRET
    m.parentNom, // Parent raison sociale
    '', // Parent administratif (à remplir par la FEEF)
    pilote?.prenom ?? '', // Pilote prénom
    pilote?.nom ?? '', // Pilote nom
    pilote?.email ?? '', // Pilote email
    pilote?.telephone ?? '', // Pilote téléphone
    pilote?.fonction ?? '', // Pilote fonction
    m.notes.join(' | '), // Commentaire
  ])
}

// Ligne séparatrice vide (sera ignorée à l'import car SIRET vide + nom vide)
const SEPARATOR_ROW_INDEX = aoa.length
aoa.push(ALL_HEADERS.map(() => ''))

// ─── Bloc 2 : Entités déjà en base (lecture seule) ───
const FIRST_EXISTING_ROW_INDEX = aoa.length
for (const row of existantes) {
  const siret = normalizeSiret(row.Siret)
  const ecocertId = ecocertBySiret.get(siret) ?? ''
  const parent = parentBySiret.get(siret)
  const crmId = (row.ID ?? '').trim()
  const pilote = crmId ? piloteByCrmId.get(crmId) : undefined
  const dateLabel = dateLabelBySiret.get(siret) ?? ''
  const parentAdmin = parent ? (parent.isMotherMaster ? 'Oui' : 'Non') : ''
  aoa.push([
    ...ENTITIES_HEADERS.map((h) => (row[h] ?? '').toString()),
    dateLabel,
    ecocertId,
    parent?.siret ?? '',
    parent?.nom ?? '',
    parentAdmin,
    pilote?.prenom ?? '',
    pilote?.nom ?? '',
    pilote?.email ?? '',
    pilote?.telephone ?? '',
    pilote?.fonction ?? '',
    '', // Commentaire vide pour les entités existantes
  ])
}

// ============================================================
// 4. Générer la feuille Excel + commentaires SIREN doublon
// ============================================================

const ws = XLSX.utils.aoa_to_sheet(aoa)

// Largeurs de colonnes raisonnables
ws['!cols'] = [
  { wch: 40 }, // ID
  { wch: 38 }, // Raison sociale
  { wch: 18 }, // Siret
  { wch: 35 }, // Adresse
  { wch: 8 }, // CP
  { wch: 18 }, // Ville
  { wch: 16 }, // Téléphone
  { wch: 28 }, // Région
  { wch: 14 }, // Date de labellisation
  { wch: 12 }, // ID Ecocert
  { wch: 18 }, // Parent SIRET
  { wch: 35 }, // Parent raison sociale
  { wch: 12 }, // Parent administratif
  { wch: 16 }, // Pilote prénom
  { wch: 20 }, // Pilote nom
  { wch: 32 }, // Pilote email
  { wch: 18 }, // Pilote téléphone
  { wch: 24 }, // Pilote fonction
  { wch: 70 }, // Commentaire
]

// ============================================================
// 4bis. Application des styles
//
// Pour préserver les gridlines d'Excel, on n'utilise PAS de fond coloré
// sur les lignes à compléter. À la place, une bordure gauche épaisse
// colorée sur la 1ère cellule de la ligne signale la catégorie :
//   - Jaune-orange épais → FEEF (pilote / date / audit-siret-inconnu)
//   - Bleu épais         → Ecocert (audit-sans-siret)
// Le header garde un fond + texte blanc gras (ligne unique, peu gênant).
// ============================================================

const STYLE_HEADER = {
  fill: { fgColor: { rgb: '4F81BD' } },
  font: { bold: true, color: { rgb: 'FFFFFF' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
}

const STYLE_FEEF_LEFT = {
  border: {
    left: { style: 'thick', color: { rgb: 'E8A33D' } }, // jaune-orange
  },
  alignment: { vertical: 'top', wrapText: true },
}

const STYLE_ECOCERT_LEFT = {
  border: {
    left: { style: 'thick', color: { rgb: '2E75B6' } }, // bleu
  },
  alignment: { vertical: 'top', wrapText: true },
}

const STYLE_DEFAULT_ROW = {
  alignment: { vertical: 'top', wrapText: true },
}

function applyHeaderStyle(rowIndex: number) {
  for (let c = 0; c < ALL_HEADERS.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: rowIndex, c })
    if (!ws[addr]) ws[addr] = { t: 's', v: '' }
    ws[addr].s = STYLE_HEADER
  }
}

function applyRowStyle(rowIndex: number, leftBorderStyle: object) {
  // Cellule A : bordure gauche épaisse colorée
  const addrA = XLSX.utils.encode_cell({ r: rowIndex, c: 0 })
  if (!ws[addrA]) ws[addrA] = { t: 's', v: '' }
  ws[addrA].s = leftBorderStyle
  // Autres cellules : juste alignement haut + wrap, pas de fond
  for (let c = 1; c < ALL_HEADERS.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: rowIndex, c })
    if (!ws[addr]) ws[addr] = { t: 's', v: '' }
    ws[addr].s = STYLE_DEFAULT_ROW
  }
}

// Header
applyHeaderStyle(0)

// Lignes à compléter — barre verticale colorée selon FEEF / Ecocert
for (let i = 0; i < aCompleter.length; i++) {
  const m = aCompleter[i]
  const leftBorder = m.errorType === 'audit-sans-siret' ? STYLE_ECOCERT_LEFT : STYLE_FEEF_LEFT
  applyRowStyle(FIRST_COMPLETE_ROW_INDEX + i, leftBorder)
}

// Hauteur de la ligne header
ws['!rows'] = [{ hpt: 24 }]

// ============================================================
// 5. Écriture du fichier
// ============================================================

const workbook = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(workbook, ws, 'Entreprises')

const date = new Date().toISOString().slice(0, 10)
let outPath = resolve(SEEDS_DIR, `entites-a-completer-${date}.xlsx`)
// Si le fichier est verrouillé (ouvert dans Excel), on bascule sur un
// nom avec timestamp pour ne pas casser la génération.
try {
  XLSX.writeFile(workbook, outPath)
}
catch (e) {
  const err = e as NodeJS.ErrnoException
  if (err.code === 'EBUSY' || err.code === 'EPERM') {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    outPath = resolve(SEEDS_DIR, `entites-a-completer-${date}-${ts}.xlsx`)
    console.warn(`⚠️  Fichier original verrouillé (probablement ouvert). Écriture dans : ${outPath}`)
    XLSX.writeFile(workbook, outPath)
  }
  else {
    throw e
  }
}

console.log('✅ Fichier Excel généré :')
console.log(`   ${outPath}\n`)
console.log('Récapitulatif :')
console.log(`  • Entreprises à compléter (FEEF + Ecocert) : ${aCompleter.length}`)
const countByType = new Map<ErrorType, number>()
for (const m of aCompleter) countByType.set(m.errorType, (countByType.get(m.errorType) ?? 0) + 1)
for (const type of ['pilote', 'date', 'audit-siret-inconnu', 'audit-sans-siret'] as ErrorType[]) {
  const n = countByType.get(type) ?? 0
  if (n > 0) console.log(`      ↪ ${ERROR_TYPE_LABEL[type]} : ${n}`)
}
console.log(`  • Entreprises existantes (en dessous)      : ${existantes.length}`)
console.log(`  • Lignes à compléter           : 2 → ${SEPARATOR_ROW_INDEX}`)
console.log(`  • Ligne séparatrice vide       : ligne ${SEPARATOR_ROW_INDEX + 1}`)
console.log(`  • Lignes existantes            : ${FIRST_EXISTING_ROW_INDEX + 1} → ${aoa.length}`)
// Cas "no-op" pour éviter un warning de variable non utilisée
void readdirSync
